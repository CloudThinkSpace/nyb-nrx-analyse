<script setup lang="ts">
import { computed, h, onMounted, ref } from "vue";
import { NTag } from "naive-ui";
import { useChartStore } from "../stores/chartStore";
import { useCalcHistoryStore } from "../stores/calcHistoryStore";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import * as XLSX from "xlsx";
import { useMessage } from "naive-ui";
import type { EvalDataItem } from "../stores/chartStore";

const props = defineProps<{
    recordId?: number;
}>();

const emit = defineEmits<{ (e: "navigate", view: string): void }>();
const chartStore = useChartStore();
const calcHistoryStore = useCalcHistoryStore();
const message = useMessage();

function fmt(n: number): string {
    return n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

// 数据来源：历史记录或当前计算结果
interface CalcSource {
    systemName: string;
    regions: string[];
    items: EvalDataItem[];
}

const calcSource = ref<CalcSource | null>(null);
const loading = ref(true);
const autoSaved = ref(false);

const regions = computed(() => calcSource.value?.regions ?? []);
const evalItems = computed(() => calcSource.value?.items ?? []);
const regionCount = computed(() => regions.value.length);

// 表格横向滚动宽度：基础列 + 得分列 × 数量
const tableScrollX = computed(() => {
    if (regionCount.value === 0) return undefined;
    // 序号70 + 指标名称180 + 指标解释240 + 指标类型90 + 基准值80 + 目标值80 + 权重70 + 单位60 = 870
    return 870 + regionCount.value * 110;
});
const currentSystemName = computed(
    () => calcSource.value?.systemName ?? chartStore.pendingSystemName,
);

onMounted(async () => {
    loading.value = true;
    try {
        await calcHistoryStore.init();

        if (props.recordId) {
            // 从历史记录加载
            const detail = await calcHistoryStore.getDetail(props.recordId);
            if (detail) {
                calcSource.value = {
                    systemName: detail.system_name,
                    regions: detail.regions,
                    items: detail.items,
                };
            }
        } else if (chartStore.evaluationData) {
            // 当前计算结果
            calcSource.value = {
                systemName: chartStore.pendingSystemName,
                regions: chartStore.evaluationData.regions,
                items: chartStore.evaluationData.items,
            };
            // 自动保存到历史记录
            await autoSave();
        }
    } finally {
        loading.value = false;
    }
});

async function autoSave() {
    if (autoSaved.value) return;
    autoSaved.value = true;
    try {
        await calcHistoryStore.create({
            system_name: chartStore.pendingSystemName,
            system_description: chartStore.pendingSystemDescription,
            regions: chartStore.evaluationData!.regions,
            items: chartStore.evaluationData!.items,
        });
    } catch (e) {
        console.error("自动保存失败:", e);
    }
}

/**
 * 计算单个指标在单个区域上的得分
 * 正向指标: score = clamp((data - baseline) / (target - baseline), 0, 1) * weight
 * 负向指标: score = clamp((baseline - data) / (baseline - target), 0, 1) * weight
 */
function calcScore(
    value: number,
    baseline: number,
    target: number,
    type: string,
    weight: number,
): number {
    if (target === baseline) return 0;
    let raw: number;
    if (type === "正向指标") {
        raw = (value - baseline) / (target - baseline);
    } else {
        raw = (baseline - value) / (baseline - target);
    }
    const clamped = Math.max(0, Math.min(1, raw));
    return clamped * weight;
}

// 表格展示数据（含指标行 + 综合得分汇总行）
interface FlatRow {
    id: number | string;
    name: string;
    description: string;
    type: string;
    baseline: number | string;
    target: number | string;
    weight: number | string;
    unit: string;
    _isSummary: boolean;
    [key: string]: any;
}

const displayData = computed<FlatRow[]>(() => {
    const items = evalItems.value;
    if (items.length === 0 || regionCount.value === 0) return [];

    const rc = regionCount.value;

    // 构建指标行
    const indicatorRows: FlatRow[] = items.map((item) => {
        const row: FlatRow = {
            id: item.id,
            name: item.name,
            description: item.description,
            type: item.type,
            baseline: item.baseline,
            target: item.target,
            weight: item.weight,
            unit: item.unit,
            _isSummary: false,
        };
        for (let ri = 0; ri < rc; ri++) {
            const v = item.values[ri];
            row[`val_${ri}`] = v;
            let score: number | null = null;
            if (v !== null && v !== undefined) {
                score = calcScore(
                    v,
                    item.baseline,
                    item.target,
                    item.type,
                    item.weight,
                );
            }
            row[`score_${ri}`] = score;
        }
        return row;
    });

    // 构建综合得分汇总行
    const summaryRow: FlatRow = {
        id: "summary",
        name: "综合得分",
        description: "-",
        type: "-",
        baseline: "-",
        target: "-",
        weight: 100,
        unit: "-",
        _isSummary: true,
    };
    for (let ri = 0; ri < rc; ri++) {
        summaryRow[`val_${ri}`] = "-";
        let total = 0;
        let hasAny = false;
        for (const row of indicatorRows) {
            const s = row[`score_${ri}`];
            if (s !== null) {
                total += s;
                hasAny = true;
            }
        }
        summaryRow[`score_${ri}`] = hasAny ? total : null;
    }

    return [...indicatorRows, summaryRow];
});

// 表格列定义
const columns = computed(() => {
    const cols: any[] = [
        {
            title: "序号",
            key: "id",
            width: 70,
            render: (row: FlatRow, index: number) =>
                row._isSummary
                    ? h("span", { style: "color: #86909c" }, "-")
                    : h("span", { style: "font-weight: 500;" }, `${index + 1}`),
        },
        {
            title: "指标名称",
            key: "name",
            width: 180,
            ellipsis: { tooltip: true },
            render: (row: FlatRow) =>
                row._isSummary
                    ? h(
                          "span",
                          {
                              style: "font-weight: 700; color: #2f6fd8; font-size: 14px;",
                          },
                          row.name,
                      )
                    : h("span", { style: "font-weight: 500;" }, row.name),
        },
        {
            title: "指标解释",
            key: "description",
            width: 240,
            ellipsis: { tooltip: true },
            render: (row: FlatRow) =>
                row._isSummary
                    ? h("span", { style: "color: #86909c" }, "-")
                    : row.description
                      ? h("span", {}, row.description)
                      : h("span", { style: "color: #d9dee7" }, "-"),
        },
        {
            title: "指标类型",
            key: "type",
            width: 90,
            render: (row: FlatRow) =>
                row._isSummary
                    ? h("span", { style: "color: #86909c" }, "-")
                    : row.type
                      ? h(
                            NTag,
                            { size: "small", bordered: false, round: true },
                            { default: () => row.type },
                        )
                      : h("span", { style: { color: "#86909c" } }, "-"),
        },
        {
            title: "基准值",
            key: "baseline",
            width: 80,
            render: (row: FlatRow) =>
                row._isSummary
                    ? h("span", { style: "color: #86909c" }, "-")
                    : h(
                          "span",
                          { style: "font-weight: 500;" },
                          fmt(row.baseline as number),
                      ),
        },
        {
            title: "目标值",
            key: "target",
            width: 80,
            render: (row: FlatRow) =>
                row._isSummary
                    ? h("span", { style: "color: #86909c" }, "-")
                    : h(
                          "span",
                          { style: "font-weight: 600; color: #2f6fd8;" },
                          fmt(row.target as number),
                      ),
        },
        {
            title: "权重",
            key: "weight",
            width: 70,
            render: (row: FlatRow) =>
                row._isSummary
                    ? h(
                          "span",
                          { style: "font-weight: 700; color: #2f6fd8;" },
                          `${row.weight}`,
                      )
                    : h(
                          "span",
                          { style: "font-weight: 600; color: #2f6fd8;" },
                          `${row.weight}`,
                      ),
        },
        { title: "单位", key: "unit", width: 60 },
    ];

    // 区域得分列（全部放在最后）
    for (let ri = 0; ri < regionCount.value; ri++) {
        const region = regions.value[ri];
        cols.push({
            title: `${region} 得分`,
            key: `score_${ri}`,
            width: 110,
            render: (row: FlatRow) => {
                const s = row[`score_${ri}`];
                if (s === null || s === undefined)
                    return h("span", { style: "color: #d9dee7;" }, "-");
                const val = s as number;
                const color = row._isSummary ? "#2f6fd8" : "#18a058";
                const fontWeight = row._isSummary ? "700" : "600";
                return h(
                    "span",
                    { style: `font-weight: ${fontWeight}; color: ${color};` },
                    fmt(val),
                );
            },
        });
    }

    return cols;
});

// ECharts 柱状图
const chartOption = computed(() => {
    if (indicatorRows.value.length === 0 || regionCount.value === 0) return {};
    const summary = summaryRow.value;
    if (!summary) return {};

    const regionNames = regions.value;
    const totalScores = regionNames.map((_, ri) => {
        const s = summary[`score_${ri}`];
        return s !== null ? (s as number) : 0;
    });

    return {
        tooltip: {
            trigger: "axis" as const,
            formatter: (params: any[]) => {
                const p = params[0];
                return `${p.name}<br/>综合得分：${fmt(p.value)}`;
            },
        },
        xAxis: {
            type: "category" as const,
            data: regionNames,
            axisLabel: { color: "#666", fontSize: 12 },
        },
        yAxis: {
            type: "value" as const,
            name: "综合得分",
            axisLabel: { color: "#666" },
            splitLine: { lineStyle: { color: "#f0f2f5" } },
        },
        grid: {
            left: "4%",
            right: "4%",
            bottom: "10%",
            top: "6%",
            containLabel: true,
        },
        series: [
            {
                type: "bar" as const,
                data: totalScores,
                barMaxWidth: 40,
                itemStyle: { color: "#2f6fd8", borderRadius: [4, 4, 0, 0] },
                label: {
                    show: true,
                    position: "top" as const,
                    formatter: (p: any) => fmt(p.value),
                    color: "#1f2d3d",
                    fontWeight: "bold",
                    fontSize: 12,
                },
            },
        ],
    };
});

const indicatorRows = computed(() =>
    displayData.value.filter((r) => !r._isSummary),
);
const summaryRow = computed(() => displayData.value.find((r) => r._isSummary));

// 导出 XLSX
async function exportResult() {
    try {
        const filePath = await save({
            defaultPath: `${currentSystemName.value || "评价结果"}_计算结果.xlsx`,
            filters: [{ name: "Excel 文件", extensions: ["xlsx"] }],
        });
        if (!filePath) return;

        const rc = regionCount.value;
        const headerRow = [
            "序号",
            "指标名称",
            "指标解释",
            "指标类型",
            "基准值",
            "目标值",
            "权重",
            "单位",
        ];
        for (let ri = 0; ri < rc; ri++) headerRow.push(regions.value[ri]);
        for (let ri = 0; ri < rc; ri++)
            headerRow.push(`${regions.value[ri]} 得分`);

        const dataRows: any[][] = [];
        for (const row of displayData.value) {
            const dataRow: any[] = [
                row._isSummary ? "-" : row.id,
                row.name,
                row._isSummary ? "-" : row.description,
                row._isSummary ? "-" : row.type,
                row._isSummary ? "-" : (row.baseline as number),
                row._isSummary ? "-" : (row.target as number),
                row.weight,
                row._isSummary ? "-" : row.unit,
            ];
            for (let ri = 0; ri < rc; ri++) {
                const v = row[`val_${ri}`];
                dataRow.push(
                    row._isSummary
                        ? "-"
                        : v !== null && v !== undefined
                          ? v
                          : "-",
                );
            }
            for (let ri = 0; ri < rc; ri++) {
                const s = row[`score_${ri}`];
                dataRow.push(
                    s !== null && s !== undefined ? (s as number) : "-",
                );
            }
            dataRows.push(dataRow);
        }

        const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "计算结果");

        ws["!cols"] = [
            { wch: 8 },
            { wch: 22 },
            { wch: 20 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 8 },
            { wch: 8 },
            ...Array.from({ length: rc }, () => ({ wch: 14 })),
            ...Array.from({ length: rc }, () => ({ wch: 14 })),
        ];

        const arrayBuf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        await writeFile(filePath, new Uint8Array(arrayBuf));
        message.success("结果已导出");
    } catch (e) {
        message.error("导出失败：" + String(e));
    }
}
</script>

<template>
    <div class="result-page">
        <div class="result-header">
            <div>
                <div class="result-title">计算结果</div>
                <n-text depth="3" class="result-subtitle">
                    指标体系「{{ currentSystemName }}」评价结果 — 共
                    {{ evalItems.length }} 个指标，{{ regions.length }}
                    个评价区域
                </n-text>
            </div>
            <div class="result-actions">
                <n-button
                    size="small"
                    :disabled="displayData.length === 0"
                    @click="exportResult"
                >
                    📤 导出结果
                </n-button>
                <n-button
                    v-if="props.recordId"
                    quaternary
                    @click="emit('navigate', 'calc-history')"
                >
                    ← 返回历史记录
                </n-button>
                <n-button v-else quaternary @click="emit('navigate', 'home')">
                    ← 返回首页
                </n-button>
            </div>
        </div>

        <n-spin :show="loading">
            <template
                v-if="!loading && evalItems.length > 0 && regions.length > 0"
            >
                <n-card :bordered="false" class="table-card">
                    <template #header>
                        <span class="section-title">指标评价得分明细</span>
                    </template>
                    <n-data-table
                        :columns="columns"
                        :data="displayData"
                        :bordered="false"
                        :single-line="false"
                        size="small"
                        striped
                        :max-height="500"
                        :scroll-x="tableScrollX"
                        :row-class-name="
                            (row: FlatRow) =>
                                row._isSummary ? 'summary-row' : ''
                        "
                    />
                </n-card>

                <n-card :bordered="false" class="chart-card">
                    <template #header>
                        <span class="section-title">各区域综合得分对比</span>
                    </template>
                    <v-chart
                        :option="chartOption"
                        autoresize
                        style="height: 360px"
                    />
                </n-card>
            </template>

            <template v-else-if="!loading">
                <n-empty description="暂无评价数据，请先完成指标录入与数据导入">
                    <template #extra>
                        <n-button
                            type="primary"
                            strong
                            @click="emit('navigate', 'indicator-entry')"
                        >
                            去录入指标
                        </n-button>
                    </template>
                </n-empty>
            </template>
        </n-spin>
    </div>
</template>

<style scoped>
.result-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.result-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
}

.result-title {
    font-size: 18px;
    font-weight: 700;
    color: #1f2d3d;
}

.result-subtitle {
    font-size: 12px;
    margin-top: 2px;
    display: block;
}

.result-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
}

.table-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(30, 50, 90, 0.06);
}

.chart-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(30, 50, 90, 0.06);
    margin-top: 16px;
}

.section-title {
    font-size: 15px;
    font-weight: 600;
    color: #1f2d3d;
}
</style>

<style>
.summary-row td {
    background-color: #f0f7ff !important;
    border-top: 2px solid #2f6fd8 !important;
}
</style>
