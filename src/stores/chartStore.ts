import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import type { Indicator } from "./indicatorStore";

export interface ChartData {
    categories: string[];
    values: number[];
    total: number;
    count: number;
    max: number;
    min: number;
    avg: number;
}

// 评价区域数据条目
export interface EvalDataItem {
    id: number;
    name: string;
    description: string;
    type: string;
    baseline: number;
    target: number;
    unit: string;
    weight: number;
    values: (number | null)[];
}

// 评价区域数据类型
export interface EvalData {
    regions: string[];
    items: EvalDataItem[];
}

export const useChartStore = defineStore("chart", {
    state: () => ({
        data: null as ChartData | null,
        loading: false,
        error: null as string | null,
        currentFile: null as string | null,
        calcIndicators: [] as Indicator[],
        // intermediate state for weight allocation flow
        pendingSystemName: "",
        pendingSystemDescription: "",
        pendingIndicators: [] as Indicator[],
        pendingWeights: {} as Record<number, number>,
        // evaluation data from data entry page
        evaluationData: null as EvalData | null,
        // 是否从指标体系列表直接进入数据录入（隐藏返回权重分配按钮）
        fromSystemList: false,
    }),
    actions: {
        async loadCsv(filePath: string) {
            this.loading = true;
            this.error = null;
            try {
                this.data = await invoke<ChartData>("analyze_csv", {
                    path: filePath,
                });
                this.currentFile = filePath;
            } catch (e) {
                this.error = String(e);
                this.data = null;
            } finally {
                this.loading = false;
            }
        },
        clearPending() {
            this.pendingSystemName = "";
            this.pendingSystemDescription = "";
            this.pendingIndicators = [];
            this.pendingWeights = {};
            this.fromSystemList = false;
        },
        clearEvalData() {
            this.evaluationData = null;
        },
        clearAll() {
            this.clearPending();
            this.clearEvalData();
            this.data = null;
            this.calcIndicators = [];
            this.currentFile = null;
            this.error = null;
        },
    },
});
