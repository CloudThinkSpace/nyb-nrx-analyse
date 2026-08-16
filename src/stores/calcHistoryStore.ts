import { defineStore } from "pinia";
import Database from "@tauri-apps/plugin-sql";
import type { EvalDataItem } from "./chartStore";

export interface CalcHistoryRecord {
    id: number;
    system_name: string;
    system_description: string;
    indicator_count: number;
    created_at: string;
}

export interface CalcHistoryDetail {
    id: number;
    system_name: string;
    system_description: string;
    indicator_count: number;
    created_at: string;
    regions: string[];
    items: EvalDataItem[];
}

export const useCalcHistoryStore = defineStore("calcHistory", {
    state: () => ({
        records: [] as CalcHistoryRecord[],
        loading: false,
        initialized: false,
        db: null as Database | null,
    }),
    actions: {
        async init() {
            if (this.initialized) return;
            this.db = await Database.load("sqlite:indicators.db");
            await this.db.execute(`
                CREATE TABLE IF NOT EXISTS calculation_history (
                    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                    system_name        TEXT NOT NULL,
                    system_description TEXT DEFAULT '',
                    indicator_count    INTEGER DEFAULT 0,
                    regions            TEXT NOT NULL,
                    items              TEXT NOT NULL,
                    created_at         TEXT DEFAULT (datetime('now', 'localtime'))
                )
            `);
            this.initialized = true;
            await this.fetchAll();
        },
        async fetchAll() {
            if (!this.db) return;
            this.loading = true;
            try {
                this.records = await this.db.select<CalcHistoryRecord[]>(
                    `SELECT id, system_name, system_description, indicator_count, created_at
                     FROM calculation_history
                     ORDER BY id DESC`,
                );
            } finally {
                this.loading = false;
            }
        },
        async create(data: {
            system_name: string;
            system_description: string;
            regions: string[];
            items: EvalDataItem[];
        }) {
            if (!this.db) throw new Error("数据库未初始化");
            await this.db.execute(
                `INSERT INTO calculation_history (system_name, system_description, indicator_count, regions, items)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    data.system_name,
                    data.system_description,
                    data.items.length,
                    JSON.stringify(data.regions),
                    JSON.stringify(data.items),
                ],
            );
            await this.fetchAll();
        },
        async remove(id: number) {
            if (!this.db) throw new Error("数据库未初始化");
            await this.db.execute(
                "DELETE FROM calculation_history WHERE id = $1",
                [id],
            );
            await this.fetchAll();
        },
        async getDetail(id: number): Promise<CalcHistoryDetail | null> {
            if (!this.db) throw new Error("数据库未初始化");
            const rows = await this.db.select<any[]>(
                `SELECT * FROM calculation_history WHERE id = $1`,
                [id],
            );
            if (rows.length === 0) return null;
            const row = rows[0];
            return {
                id: row.id,
                system_name: row.system_name,
                system_description: row.system_description,
                indicator_count: row.indicator_count,
                created_at: row.created_at,
                regions: JSON.parse(row.regions),
                items: JSON.parse(row.items),
            };
        },
    },
});
