<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from "vue";
import { NTag, useDialog, useMessage } from "naive-ui";
import { useCalcHistoryStore } from "../stores/calcHistoryStore";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import * as XLSX from "xlsx";

const emit = defineEmits<{ (e: "navigate", view: string): void }>();

const historyStore = useCalcHistoryStore();
const dialog = useDialog();
const message = useMessage();
const loading = ref(false);

// ── 分页 ──
const page = ref(1);
const pageSize = ref(10);

const paginatedData = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return historyStore.records.slice(start, start + pageSize.value);
});

// 当记录数变化时自动修正页码
watch(
    () => historyStore.records.length,
    () => {
        const maxPage =
            Math.ceil(historyStore.records.length / pageSize.value) || 1;
        if (page.value > maxPage) {
            page.value = maxPage;
        }
    },
);

onMounted(async () => {
    loading.value = true;
    try {
        await historyStore.init();
    } finally {
        loading.value = false;
    }
});

function viewRecord(id: number) {
    emit("navigate", `calc-history-view-${id}`);
}

async function downloadRecord(id: number) {
    try {
        const detail = await historyStore.getDetail(id);
        if (!detail) {
            message.error("记录不存在");
            return;
        }

        const filePath = await save({
            defaultPath: `${detail.system_name || "评价结果"}_计算结果.xlsx`,
            filters: [{ name: "Excel 文件", extensions: ["xlsx"] }],
        });
        if (!filePath) return;

        const rc = detail.regions.length;
        // 表头：指标体系字段 → 区域数据值列 → 区域得分列
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
        for (let ri = 0; ri < rc; ri++) {
            headerRow.push(detail.regions[ri]);
        }
        for (let ri = 0; ri < rc; ri++) {
            headerRow.push(`${detail.regions[ri]} 得分`);
        }

        // 计算得分，构建数据行（含汇总行）
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

        const dataRows: any[][] = [];
        const totalScores: number[] = new Array(rc).fill(0);

        for (const item of detail.items) {
            const row: any[] = [
                item.id,
                item.name,
                item.description,
                item.type,
                item.baseline,
                item.target,
                item.weight,
                item.unit,
            ];
            const scores: number[] = [];
            for (let ri = 0; ri < rc; ri++) {
                const v = item.values[ri];
                row.push(v !== null && v !== undefined ? v : "-");
                const score =
                    v !== null && v !== undefined
                        ? calcScore(
                              v,
                              item.baseline,
                              item.target,
                              item.type,
                              item.weight,
                          )
                        : 0;
                scores.push(score);
                totalScores[ri] += score;
            }
            for (let ri = 0; ri < rc; ri++) {
                row.push(scores[ri] > 0 || scores[ri] === 0 ? scores[ri] : "-");
            }
            dataRows.push(row);
        }

        // 汇总行
        const summaryRow: any[] = [
            "-",
            "综合得分",
            "-",
            "-",
            "-",
            "-",
            100,
            "-",
        ];
        for (let ri = 0; ri < rc; ri++) {
            summaryRow.push("-");
        }
        for (let ri = 0; ri < rc; ri++) {
            summaryRow.push(totalScores[ri]);
        }
        dataRows.push(summaryRow);

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
        message.success("结果已下载");
    } catch (e) {
        message.error("下载失败：" + String(e));
    }
}

function deleteRecord(id: number) {
    dialog.warning({
        title: "确认删除",
        content: "确定要删除这条计算结果记录吗？此操作不可恢复。",
        positiveText: "删除",
        negativeText: "取消",
        onPositiveClick: async () => {
            try {
                await historyStore.remove(id);
                message.success("已删除");
            } catch (e) {
                message.error("删除失败：" + String(e));
            }
        },
    });
}

const columns = [
    {
        title: "序号",
        key: "index",
        width: 70,
        render: (_row: any, index: number) => index + 1,
    },
    {
        title: "指标体系名称",
        key: "system_name",
        minWidth: 160,
        ellipsis: { tooltip: true },
    },
    {
        title: "指标体系描述",
        key: "system_description",
        minWidth: 180,
        ellipsis: { tooltip: true },
        render: (row: any) =>
            row.system_description
                ? row.system_description
                : h("span", { style: "color: #d9dee7" }, "-"),
    },
    {
        title: "指标数量",
        key: "indicator_count",
        width: 90,
        render: (row: any) =>
            h(
                NTag,
                {
                    size: "small",
                    bordered: false,
                    round: true,
                    type: "primary",
                },
                { default: () => `${row.indicator_count}` },
            ),
    },
    {
        title: "计算时间",
        key: "created_at",
        width: 170,
    },
    {
        title: "操作",
        key: "actions",
        width: 220,
        fixed: "right",
        render: (row: any) =>
            h(
                "div",
                { style: "display: flex; gap: 6px; align-items: center;" },
                [
                    h(
                        "button",
                        {
                            class: "action-btn action-view",
                            onClick: () => viewRecord(row.id),
                        },
                        "查看",
                    ),
                    h("span", { style: "color: #d9dee7;" }, "|"),
                    h(
                        "button",
                        {
                            class: "action-btn action-download",
                            onClick: () => downloadRecord(row.id),
                        },
                        "下载",
                    ),
                    h("span", { style: "color: #d9dee7;" }, "|"),
                    h(
                        "button",
                        {
                            class: "action-btn action-delete",
                            onClick: () => deleteRecord(row.id),
                        },
                        "删除",
                    ),
                ],
            ),
    },
];
</script>

<template>
    <div class="history-page">
        <div class="history-header">
            <div>
                <div class="history-title">历史计算</div>
                <n-text depth="3" class="history-subtitle">
                    共 {{ historyStore.records.length }} 条计算结果记录
                </n-text>
            </div>
            <n-button quaternary @click="emit('navigate', 'home')">
                ← 返回首页
            </n-button>
        </div>

        <n-spin :show="loading || historyStore.loading">
            <template v-if="historyStore.records.length > 0">
                <n-card :bordered="false" class="table-card">
                    <n-data-table
                        :columns="columns"
                        :data="paginatedData"
                        :bordered="false"
                        :single-line="false"
                        size="small"
                        striped
                        :max-height="500"
                    />
                    <template #footer>
                        <div class="pagination-wrap">
                            <n-pagination
                                v-model:page="page"
                                :page-count="
                                    Math.ceil(
                                        historyStore.records.length / pageSize,
                                    )
                                "
                                :page-size="pageSize"
                                :page-sizes="[5, 10, 15, 20]"
                                show-size-picker
                                @update:page-size="
                                    (val) => {
                                        pageSize = val;
                                        page = 1;
                                    }
                                "
                            />
                            <n-text depth="3" style="font-size: 13px">
                                共 {{ historyStore.records.length }} 条
                            </n-text>
                        </div>
                    </template>
                </n-card>
            </template>

            <template v-else>
                <n-empty description="暂无历史计算结果">
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
.history-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.history-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
}

.history-title {
    font-size: 18px;
    font-weight: 700;
    color: #1f2d3d;
}

.history-subtitle {
    font-size: 12px;
    margin-top: 2px;
    display: block;
}

.table-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(30, 50, 90, 0.06);
}

.pagination-wrap {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0 4px;
}
</style>

<style>
/* 操作按钮样式 */
.action-btn {
    border: none;
    background: none;
    cursor: pointer;
    font-size: 13px;
    padding: 2px 4px;
    border-radius: 4px;
    transition: all 0.15s ease;
    font-family: inherit;
}

.action-view {
    color: #2f6fd8;
}
.action-view:hover {
    color: #6b9ef0;
    background: #f0f7ff;
}

.action-download {
    color: #2f6fd8;
}
.action-download:hover {
    color: #6b9ef0;
    background: #f0f7ff;
}

.action-delete {
    color: #d03050;
}
.action-delete:hover {
    color: #e8747a;
    background: #fff0f0;
}
</style>
