<script setup lang="ts">
import { h, onMounted, ref } from "vue";
import { NTag, useMessage } from "naive-ui";
import { useSystemStore, type SystemDetail } from "../stores/systemStore";
import { useChartStore } from "../stores/chartStore";
import type { Indicator } from "../stores/indicatorStore";

const props = defineProps<{
    systemId?: number;
}>();

const emit = defineEmits<{ (e: "navigate", view: string): void }>();

const systemStore = useSystemStore();
const chartStore = useChartStore();
const message = useMessage();
const detail = ref<SystemDetail | null>(null);
const loading = ref(false);

onMounted(async () => {
    if (!props.systemId) return;
    loading.value = true;
    try {
        await systemStore.init();
        detail.value = await systemStore.getDetail(props.systemId);
    } finally {
        loading.value = false;
    }
});

async function startCalc() {
    if (!detail.value) {
        message.warning("指标体系数据尚未加载");
        return;
    }
    try {
        const indicators: Indicator[] = detail.value.indicators.map((item) => ({
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

        const weights: Record<number, number> = {};
        for (const item of detail.value.indicators) {
            weights[item.id] = item.weight;
        }

        chartStore.clearEvalData();
        chartStore.pendingSystemName = detail.value.name;
        chartStore.pendingSystemDescription = detail.value.description;
        chartStore.pendingIndicators = indicators;
        chartStore.pendingWeights = weights;
        chartStore.calcIndicators = indicators;
        chartStore.fromSystemList = true;

        emit("navigate", "data-entry");
    } catch (e) {
        message.error("加载指标体系失败：" + String(e));
    }
}

interface IndicatorRow {
    id: number;
    name: string;
    description: string;
    baseline: number;
    target: number;
    type: string;
    unit: string;
    weight: number;
}

const indicatorColumns = [
    {
        title: "序号",
        key: "index",
        width: 70,
        render: (_row: any, index: number) => index + 1,
    },
    {
        title: "指标名称",
        key: "name",
        minWidth: 140,
        ellipsis: { tooltip: true },
    },
    {
        title: "指标解释",
        key: "description",
        minWidth: 180,
        ellipsis: { tooltip: true },
    },
    {
        title: "指标类型",
        key: "type",
        width: 100,
        render: (row: IndicatorRow) =>
            row.type
                ? h(
                      NTag,
                      { size: "small", bordered: false, round: true },
                      { default: () => row.type },
                  )
                : h("span", { style: { color: "#86909c" } }, "-"),
    },
    { title: "基准值", key: "baseline", width: 90 },
    { title: "目标值", key: "target", width: 90 },
    { title: "单位", key: "unit", width: 70 },
    {
        title: "权重",
        key: "weight",
        width: 80,
        render: (row: IndicatorRow) =>
            h(
                "span",
                { style: "font-weight: 600; color: #2f6fd8;" },
                `${row.weight ?? "-"}`,
            ),
    },
];
</script>

<template>
    <div class="detail-page">
        <div class="detail-header">
            <n-button quaternary @click="emit('navigate', 'systems')">
                ← 返回指标体系
            </n-button>
            <n-button type="primary" strong size="small" @click="startCalc">
                计算
            </n-button>
        </div>

        <n-spin :show="loading">
            <template v-if="detail">
                <!-- 体系信息 -->
                <n-card :bordered="false" class="info-card">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">体系名称</span>
                            <span class="info-value">{{ detail.name }}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">指标数量</span>
                            <n-tag type="primary" :bordered="false" round>{{
                                detail.indicator_count
                            }}</n-tag>
                        </div>
                        <div class="info-item">
                            <span class="info-label">创建时间</span>
                            <span class="info-value">{{
                                detail.created_at
                            }}</span>
                        </div>
                        <div
                            v-if="detail.description"
                            class="info-item"
                            style="grid-column: 1 / -1"
                        >
                            <span class="info-label">体系描述</span>
                            <span class="info-value">{{
                                detail.description
                            }}</span>
                        </div>
                    </div>
                </n-card>

                <!-- 指标列表 -->
                <n-card :bordered="false" class="table-card">
                    <template #header>
                        <span class="section-title">包含指标</span>
                    </template>
                    <n-data-table
                        :columns="indicatorColumns"
                        :data="detail.indicators"
                        :bordered="false"
                        :single-line="false"
                        :max-height="460"
                        size="small"
                        striped
                    />
                </n-card>
            </template>

            <n-empty v-else-if="!loading" description="未找到该指标体系" />
        </n-spin>
    </div>
</template>

<style scoped>
.detail-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.info-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(30, 50, 90, 0.06);
}

.info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.info-label {
    font-size: 12px;
    color: #86909c;
}

.info-value {
    font-size: 14px;
    font-weight: 600;
    color: #1f2d3d;
}

.table-card {
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
