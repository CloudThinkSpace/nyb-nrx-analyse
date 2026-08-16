<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from "vue";
import { useMessage, useDialog } from "naive-ui";
import { useSystemStore, type IndicatorSystem } from "../stores/systemStore";
import { useChartStore } from "../stores/chartStore";
import type { Indicator } from "../stores/indicatorStore";

const emit = defineEmits<{ (e: "navigate", view: string): void }>();

const systemStore = useSystemStore();
const chartStore = useChartStore();
const message = useMessage();
const dialog = useDialog();

// ── 分页 ──
const page = ref(1);
const pageSize = ref(15);

const paginatedData = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return systemStore.systems.slice(start, start + pageSize.value);
});

watch(
    () => systemStore.systems.length,
    () => {
        const maxPage =
            Math.ceil(systemStore.systems.length / pageSize.value) || 1;
        if (page.value > maxPage) {
            page.value = maxPage;
        }
    },
);

onMounted(() => {
    systemStore.init();
});

function viewDetail(id: number) {
    emit("navigate", "system-detail-" + id);
}

async function startCalc(id: number) {
    try {
        const detail = await systemStore.getDetail(id);
        if (!detail) {
            message.error("指标体系不存在");
            return;
        }

        // 映射指标数据
        const indicators: Indicator[] = detail.indicators.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            baseline: item.baseline,
            target: item.target,
            type: item.type,
            unit: item.unit,
            created_at: "",
            updated_at: "",
        }));

        // 映射权重
        const weights: Record<number, number> = {};
        for (const item of detail.indicators) {
            weights[item.id] = item.weight;
        }

        // 填充 chartStore
        chartStore.clearEvalData();
        chartStore.pendingSystemName = detail.name;
        chartStore.pendingSystemDescription = detail.description;
        chartStore.pendingIndicators = indicators;
        chartStore.pendingWeights = weights;
        chartStore.calcIndicators = indicators;
        chartStore.fromSystemList = true;

        emit("navigate", "data-entry");
    } catch (e) {
        message.error("加载指标体系失败：" + String(e));
    }
}

function confirmRemove(id: number, name: string) {
    dialog.warning({
        title: "确认删除",
        content: `确定要删除指标体系「${name}」吗？此操作不可撤销。`,
        positiveText: "删除",
        negativeText: "取消",
        onPositiveClick: async () => {
            try {
                await systemStore.remove(id);
                message.success("指标体系已删除");
            } catch (e) {
                message.error(String(e));
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
        key: "name",
        minWidth: 180,
        ellipsis: { tooltip: true },
    },
    { title: "指标数量", key: "indicator_count", width: 100 },
    {
        title: "体系描述",
        key: "description",
        minWidth: 200,
        ellipsis: { tooltip: true },
    },
    {
        title: "创建时间",
        key: "created_at",
        width: 175,
        ellipsis: { tooltip: true },
    },
    {
        title: "操作",
        key: "actions",
        width: 240,
        fixed: "right",
        render: (row: IndicatorSystem) =>
            h("div", { style: "display: flex; align-items: center; gap: 0;" }, [
                h(
                    "span",
                    {
                        style: "color: #5ec8e5; cursor: pointer; font-size: 12px; padding: 2px 8px; border: 1px solid transparent; border-radius: 4px; user-select: none; transition: all 0.2s;",
                        onMouseenter: (e: MouseEvent) => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.borderColor = "#5ec8e5";
                            el.style.backgroundColor = "#ebf8fc";
                        },
                        onMouseleave: (e: MouseEvent) => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.borderColor = "transparent";
                            el.style.backgroundColor = "transparent";
                        },
                        onClick: () => viewDetail(row.id),
                    },
                    "查看",
                ),
                h(
                    "span",
                    {
                        style: "color: #c0c8d9; font-size: 12px; margin: 0 2px; user-select: none;",
                    },
                    "|",
                ),
                h(
                    "span",
                    {
                        style: "color: #2f6fd8; cursor: pointer; font-size: 12px; padding: 2px 8px; border: 1px solid transparent; border-radius: 4px; user-select: none; transition: all 0.2s;",
                        onMouseenter: (e: MouseEvent) => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.borderColor = "#2f6fd8";
                            el.style.backgroundColor = "#f0f7ff";
                        },
                        onMouseleave: (e: MouseEvent) => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.borderColor = "transparent";
                            el.style.backgroundColor = "transparent";
                        },
                        onClick: () => startCalc(row.id),
                    },
                    "计算",
                ),
                h(
                    "span",
                    {
                        style: "color: #c0c8d9; font-size: 12px; margin: 0 2px; user-select: none;",
                    },
                    "|",
                ),
                h(
                    "span",
                    {
                        style: "color: #e88080; cursor: pointer; font-size: 12px; padding: 2px 8px; border: 1px solid transparent; border-radius: 4px; user-select: none; transition: all 0.2s;",
                        onMouseenter: (e: MouseEvent) => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.borderColor = "#e88080";
                            el.style.backgroundColor = "#fef0f0";
                        },
                        onMouseleave: (e: MouseEvent) => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.borderColor = "transparent";
                            el.style.backgroundColor = "transparent";
                        },
                        onClick: () => confirmRemove(row.id, row.name),
                    },
                    "删除",
                ),
            ]),
    },
];
</script>

<template>
    <div class="system-list">
        <div class="page-header">
            <div>
                <div class="page-title">指标体系</div>
                <n-text depth="3" class="page-subtitle"
                    >查看已保存的指标体系及包含的指标列表</n-text
                >
            </div>
        </div>

        <n-card :bordered="false" class="table-card">
            <n-data-table
                :columns="columns"
                :data="paginatedData"
                :loading="systemStore.loading"
                :bordered="false"
                :single-line="false"
                :max-height="600"
                :row-key="(row: IndicatorSystem) => row.id"
                size="small"
                striped
            />
            <template #footer>
                <template v-if="systemStore.systems.length > 0">
                    <div class="pagination-wrap">
                        <n-pagination
                            v-model:page="page"
                            :page-count="
                                Math.ceil(
                                    systemStore.systems.length / pageSize,
                                ) || 1
                            "
                            :page-size="pageSize"
                            :page-sizes="[10, 15, 20, 50]"
                            show-size-picker
                            @update:page-size="
                                (val: number) => {
                                    pageSize = val;
                                    page = 1;
                                }
                            "
                        />
                        <n-text depth="3" style="font-size: 13px">
                            共 {{ systemStore.systems.length }} 条
                        </n-text>
                    </div>
                </template>
                <template v-else>
                    <n-empty
                        description="暂无保存的指标体系，点击右上角「🚀 开始计算」创建"
                    />
                </template>
            </template>
        </n-card>
    </div>
</template>

<style scoped>
.system-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
}

.page-title {
    font-size: 18px;
    font-weight: 700;
    color: #1f2d3d;
}

.page-subtitle {
    font-size: 12px;
    margin-top: 2px;
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
