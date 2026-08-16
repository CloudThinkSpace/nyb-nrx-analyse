import { defineStore } from "pinia";
import Database from "@tauri-apps/plugin-sql";

export interface IndicatorSystem {
    id: number;
    name: string;
    description: string;
    indicator_count: number;
    created_at: string;
    updated_at: string;
}

// 创建指标体系时的指标数据类型
interface SystemIndicatorInput {
    name: string;
    description: string;
    baseline: number;
    target: number;
    type: string;
    unit: string;
    weight: number;
}

// 创建指标体系时的入参类型
interface CreateSystemInput {
    name: string;
    description: string;
    indicators: SystemIndicatorInput[];
}

export interface SystemDetail extends IndicatorSystem {
    indicators: {
        id: number;
        name: string;
        description: string;
        baseline: number;
        target: number;
        type: string;
        unit: string;
        weight: number;
    }[];
}

export const useSystemStore = defineStore("system", {
    state: () => ({
        systems: [] as IndicatorSystem[],
        loading: false,
        initialized: false,
        db: null as Database | null,
    }),
    actions: {
        async init() {
            if (this.initialized) return;
            this.db = await Database.load("sqlite:indicators.db");

            // 创建主表
            await this.db.execute(`
                CREATE TABLE IF NOT EXISTS indicator_systems (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    name        TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    created_at  TEXT DEFAULT (datetime('now', 'localtime')),
                    updated_at  TEXT DEFAULT (datetime('now', 'localtime'))
                )
            `);

            // 创建关联表（含指标数据快照列）
            await this.db.execute(`
                CREATE TABLE IF NOT EXISTS indicator_system_items (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    system_id    INTEGER NOT NULL,
                    indicator_id INTEGER,
                    name         TEXT NOT NULL DEFAULT '',
                    description  TEXT DEFAULT '',
                    baseline     REAL DEFAULT 0,
                    target       REAL DEFAULT 0,
                    type         TEXT DEFAULT '',
                    unit         TEXT DEFAULT '',
                    weight       INTEGER DEFAULT 0,
                    FOREIGN KEY (system_id) REFERENCES indicator_systems(id)
                )
            `);

            // 迁移：检测并添加 weight 列
            try {
                const cols2 = await this.db.select<{ name: string }[]>(
                    "PRAGMA table_info(indicator_system_items)",
                );
                const hasWeight = cols2.some((c) => c.name === "weight");
                if (!hasWeight) {
                    await this.db.execute(
                        "ALTER TABLE indicator_system_items ADD COLUMN weight INTEGER DEFAULT 0",
                    );
                }
            } catch {
                // 忽略
            }

            // 迁移：旧表结构没有 name 列时重建
            try {
                const cols = await this.db.select<{ name: string }[]>(
                    "PRAGMA table_info(indicator_system_items)",
                );
                const hasNameCol = cols.some((c) => c.name === "name");
                if (!hasNameCol) {
                    // 旧表结构，重建为带快照列的新表
                    await this.db.execute(
                        "DROP TABLE IF EXISTS indicator_system_items",
                    );
                    await this.db.execute(`
                        CREATE TABLE IF NOT EXISTS indicator_system_items (
                            id           INTEGER PRIMARY KEY AUTOINCREMENT,
                            system_id    INTEGER NOT NULL,
                            indicator_id INTEGER,
                            name         TEXT NOT NULL DEFAULT '',
                            description  TEXT DEFAULT '',
                            baseline     REAL DEFAULT 0,
                            target       REAL DEFAULT 0,
                            type         TEXT DEFAULT '',
                            unit         TEXT DEFAULT '',
                            weight       INTEGER DEFAULT 0,
                            FOREIGN KEY (system_id) REFERENCES indicator_systems(id)
                        )
                    `);
                }
            } catch {
                // 迁移失败忽略
            }

            this.initialized = true;
            await this.fetchAll();
        },
        async fetchAll() {
            if (!this.db) return;
            this.loading = true;
            try {
                this.systems = await this.db.select<IndicatorSystem[]>(
                    `SELECT s.*, COUNT(si.id) as indicator_count
                     FROM indicator_systems s
                     LEFT JOIN indicator_system_items si ON si.system_id = s.id
                     GROUP BY s.id
                     ORDER BY s.id DESC`,
                );
            } finally {
                this.loading = false;
            }
        },
        async create(data: CreateSystemInput) {
            if (!this.db) throw new Error("数据库未初始化");
            if (data.indicators.length === 0)
                throw new Error("请至少选择一个指标");

            // 插入体系
            const result = await this.db.execute(
                "INSERT INTO indicator_systems (name, description) VALUES ($1, $2)",
                [data.name, data.description],
            );
            const systemId = result.lastInsertId;

            // 插入每条指标数据快照（含权重）
            for (const ind of data.indicators) {
                await this.db.execute(
                    `INSERT INTO indicator_system_items (system_id, name, description, baseline, target, type, unit, weight)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        systemId,
                        ind.name,
                        ind.description,
                        ind.baseline,
                        ind.target,
                        ind.type,
                        ind.unit,
                        ind.weight,
                    ],
                );
            }

            await this.fetchAll();
            return systemId;
        },
        async remove(id: number) {
            if (!this.db) throw new Error("数据库未初始化");
            await this.db.execute(
                "DELETE FROM indicator_system_items WHERE system_id = $1",
                [id],
            );
            await this.db.execute(
                "DELETE FROM indicator_systems WHERE id = $1",
                [id],
            );
            await this.fetchAll();
        },
        async getDetail(id: number): Promise<SystemDetail | null> {
            if (!this.db) throw new Error("数据库未初始化");
            const systems = await this.db.select<IndicatorSystem[]>(
                `SELECT s.*, COUNT(si.id) as indicator_count
                 FROM indicator_systems s
                 LEFT JOIN indicator_system_items si ON si.system_id = s.id
                 WHERE s.id = $1
                 GROUP BY s.id`,
                [id],
            );
            if (systems.length === 0) return null;

            // 直接从 indicator_system_items 读取已存储的快照数据
            const indicators = await this.db.select<
                {
                    id: number;
                    name: string;
                    description: string;
                    baseline: number;
                    target: number;
                    type: string;
                    unit: string;
                    weight: number;
                }[]
            >(
                `SELECT id, name, description, baseline, target, type, unit, weight
                 FROM indicator_system_items
                 WHERE system_id = $1
                 ORDER BY id`,
                [id],
            );

            return { ...systems[0], indicators };
        },
    },
});
