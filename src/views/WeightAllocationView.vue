<script setup lang="ts">
import { computed, h, onMounted, ref } from "vue";
import { useMessage } from "naive-ui";
import { NInputNumber } from "naive-ui";
import { useChartStore } from "../stores/chartStore";
import { useSystemStore } from "../stores/systemStore";

const emit = defineEmits<{ (e: "navigate", view: string): void }>();

const chartStore = useChartStore();
const systemStore = useSystemStore();
const message = useMessage();

interface WeightRow {
    id: number;
    name: string;
    weight: number;
}

const weightRows = ref<WeightRow[]>([]);
const saving = ref(false);

onMounted(() => {
    systemStore.init();
    const indicators = chartStore.pendingIndicators;
    if (indicators.length === 0) {
        message.warning("无指标数据，请返回重新选择");
        emit("navigate", "indicator-entry");
        return;
    }

    // 智能分配权重：尽量平均分配，总和为 100
    const count = indicators.length;
    const base = Math.floor(100 / count);
    const remainder = 100 % count;

    weightRows.value = indicators.map((ind, idx) => ({
        id: ind.id,
        name: ind.name,
        weight: idx < remainder ? base + 1 : base,
    }));
});

// 校验所有权重均为整数且总和为 100
const totalWeight = computed(() =>
    weightRows.value.reduce((sum, r) => sum + (r.weight || 0), 0),
);

const isValid = computed(() => {
    if (weightRows.value.length === 0) return false;
    const allValid = weightRows.value.every(
        (r) => Number.isInteger(r.weight) && r.weight >= 0 && r.weight <= 100,
    );
    return allValid && totalWeight.value === 100;
});

// 智能调整按钮：将权重重新平均分配
function redistribute() {
    const count = weightRows.value.length;
    const base = Math.floor(100 / count);
    const remainder = 100 % count;
    weightRows.value.forEach((row, idx) => {
        row.weight = idx < remainder ? base + 1 : base;
    });
}

// 确认权重并完成保存
async function confirmWeights() {
    if (!isValid.value) {
        message.warning(`权重总和必须等于 100，当前为 ${totalWeight.value}`);
        return;
    }

    saving.value = true;
    try {
        // 保存指标体系到数据库（含权重快照）
        await systemStore.create({
            name: chartStore.pendingSystemName,
            description: chartStore.pendingSystemDescription,
            indicators: weightRows.value.map((row) => {
                const ind = chartStore.pendingIndicators.find(
                    (i) => i.id === row.id,
                );
                return {
                    name: ind?.name ?? row.name,
                    description: ind?.description ?? "",
                    baseline: ind?.baseline ?? 0,
                    target: ind?.target ?? 0,
                    type: ind?.type ?? "",
                    unit: ind?.unit ?? "",
                    weight: row.weight,
                };
            }),
        });

        // 保存权重数据供数据录入页使用
        const weightMap: Record<number, number> = {};
        for (const row of weightRows.value) {
            weightMap[row.id] = row.weight;
        }
        chartStore.pendingWeights = weightMap;

        // 保存到 calcIndicators 供后续页面使用
        chartStore.calcIndicators = [...chartStore.pendingIndicators];
        chartStore.fromSystemList = false;

        message.success("指标体系已保存");
        emit("navigate", "data-entry");
    } catch (e) {
        message.error("保存指标体系失败：" + String(e));
    } finally {
        saving.value = false;
    }
}

// 表格列定义
const columns = computed(() => [
    {
        title: "序号",
        key: "index",
        width: 70,
        render: (_row: any, index: number) => index + 1,
    },
    {
        title: "指标名称",
        key: "name",
        minWidth: 200,
        ellipsis: { tooltip: true },
    },
    {
        title: "权重",
        key: "weight",
        width: 140,
        render: (row: WeightRow) =>
            h(
                "div",
                { style: "display: flex; align-items: center; gap: 6px;" },
                [
                    h(NInputNumber, {
                        value: row.weight,
                        style: "width: 90px;",
                        min: 0,
                        max: 100,
                        "onUpdate:value": (val: number | null) => {
                            row.weight = val ?? 0;
                        },
                        size: "small",
                    }),
                ],
            ),
    },
]);
</script>

<template>
    <div class="weight-page">
        <!-- 标题栏 -->
        <div class="weight-header">
            <div>
                <div class="weight-title">权重分配</div>
                <n-text depth="3" class="weight-subtitle">
                    为指标体系「{{
                        chartStore.pendingSystemName
                    }}」的指标分配权重，所有权重之和必须为 100
                </n-text>
            </div>
            <div class="weight-actions">
                <n-button
                    quaternary
                    @click="emit('navigate', 'indicator-entry')"
                >
                    ← 返回录入
                </n-button>
            </div>
        </div>

        <!-- 权重分配表格 -->
        <n-card :bordered="false" class="table-card">
            <template #header>
                <div class="weight-table-header">
                    <span class="section-title">指标权重分配</span>
                    <n-button size="small" @click="redistribute">
                        🔄 重新分配
                    </n-button>
                </div>
            </template>

            <n-data-table
                :columns="columns"
                :data="weightRows"
                :bordered="false"
                :single-line="false"
                size="small"
                striped
                :max-height="500"
            />

            <template #footer>
                <div class="weight-footer">
                    <n-text
                        :type="isValid ? 'success' : 'error'"
                        style="font-weight: 700; font-size: 15px"
                    >
                        权重总和：{{ totalWeight }} / 100
                        <n-text
                            v-if="isValid"
                            style="color: #18a058; margin-left: 8px"
                        >
                            ✓ 有效
                        </n-text>
                        <n-text v-else style="color: #d03050; margin-left: 8px">
                            ✗ 需调整至 100
                        </n-text>
                    </n-text>
                    <n-button
                        type="primary"
                        size="large"
                        strong
                        :disabled="!isValid || saving"
                        :loading="saving"
                        @click="confirmWeights"
                    >
                        ✅ 权重确认 → 数据录入
                    </n-button>
                </div>
            </template>
        </n-card>
    </div>
</template>

<style scoped>
.weight-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.weight-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
}

.weight-title {
    font-size: 18px;
    font-weight: 700;
    color: #1f2d3d;
}

.weight-subtitle {
    font-size: 12px;
    margin-top: 2px;
    display: block;
}

.weight-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
}

.table-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(30, 50, 90, 0.06);
}

.weight-table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.section-title {
    font-size: 15px;
    font-weight: 600;
    color: #1f2d3d;
}

.weight-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
}
</style>
