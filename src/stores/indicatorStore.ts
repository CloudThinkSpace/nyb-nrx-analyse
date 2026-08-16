import { defineStore } from "pinia";
import Database from "@tauri-apps/plugin-sql";

export interface Indicator {
    id: number;
    name: string;
    description: string;
    baseline: number;
    target: number;
    type: string;
    unit: string;
    created_at: string;
    updated_at: string;
}

export type IndicatorFormData = Omit<
    Indicator,
    "id" | "created_at" | "updated_at"
>;

export const useIndicatorStore = defineStore("indicator", {
    state: () => ({
        indicators: [] as Indicator[],
        loading: false,
        initialized: false,
        db: null as Database | null,
    }),
    actions: {
        async init() {
            if (this.initialized) return;
            this.db = await Database.load("sqlite:indicators.db");
            await this.db.execute(`
                CREATE TABLE IF NOT EXISTS indicators (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    name        TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    baseline    REAL DEFAULT 0,
                    target      REAL DEFAULT 0,
                    type        TEXT DEFAULT '',
                    unit        TEXT DEFAULT '',
                    created_at  TEXT DEFAULT (datetime('now', 'localtime')),
                    updated_at  TEXT DEFAULT (datetime('now', 'localtime'))
                )
            `);
            this.initialized = true;
            await this.fetchAll();
        },
        async fetchAll() {
            if (!this.db) return;
            this.loading = true;
            try {
                this.indicators = await this.db.select<Indicator[]>(
                    "SELECT * FROM indicators ORDER BY id",
                );
            } finally {
                this.loading = false;
            }
        },
        async create(data: IndicatorFormData) {
            if (!this.db) throw new Error("数据库未初始化");
            await this.db.execute(
                "INSERT INTO indicators (name, description, baseline, target, type, unit) VALUES ($1, $2, $3, $4, $5, $6)",
                [
                    data.name,
                    data.description,
                    data.baseline,
                    data.target,
                    data.type,
                    data.unit,
                ],
            );
            await this.fetchAll();
        },
        async update(data: Indicator) {
            if (!this.db) throw new Error("数据库未初始化");
            await this.db.execute(
                "UPDATE indicators SET name=$1, description=$2, baseline=$3, target=$4, type=$5, unit=$6, updated_at=datetime('now','localtime') WHERE id=$7",
                [
                    data.name,
                    data.description,
                    data.baseline,
                    data.target,
                    data.type,
                    data.unit,
                    data.id,
                ],
            );
            await this.fetchAll();
        },
        async remove(id: number) {
            if (!this.db) throw new Error("数据库未初始化");
            // 只删除指标本身，不影响已有指标体系的引用（体系中有独立的快照数据）
            await this.db.execute("DELETE FROM indicators WHERE id=$1", [id]);
            await this.fetchAll();
        },
    },
});
