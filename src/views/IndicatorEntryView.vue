<script setup lang="ts">
import { computed, h, onMounted, ref } from "vue";
import { useMessage, NTag } from "naive-ui";
import { useChartStore } from "../stores/chartStore";
import {
    useIndicatorStore,
    type Indicator,
    type IndicatorFormData,
} from "../stores/indicatorStore";
import { useSystemStore } from "../stores/systemStore";

const emit = defineEmits<{ (e: "navigate", view: string): void }>();

const chartStore = useChartStore();
const indicatorStore = useIndicatorStore();
const systemStore = useSystemStore();
const message = useMessage();

onMounted(() => {
    indicatorStore.init();
    systemStore.init();
    // 如果从权重分配页返回，恢复之前的状态
    if (chartStore.pendingIndicators.length > 0) {
        systemName.value = chartStore.pendingSystemName;
        systemDescription.value = chartStore.pendingSystemDescription;
        selectedIndicators.value = [...chartStore.pendingIndicators];
    }
});

// ── 指标体系信息 ──
const systemName = ref("");
const systemDescription = ref("");

const selectedIndicators = ref<Indicator[]>([]);

// ── 从指标库选择 ──
const libraryModalShow = ref(false);
const libraryCheckedRowKeys = ref<number[]>([]);

const availableLibraryIndicators = computed(() =>
    indicatorStore.indicators.filter(
        (i) => !selectedIndicators.value.some((s) => s.id === i.id),
    ),
);

const libraryColumns = computed(() => [
    {
        type: "selection" as const,
        width: 50,
        disabled: (row: Indicator) =>
            selectedIndicators.value.length >= 50 &&
            !libraryCheckedRowKeys.value.includes(row.id),
    },
    {
        title: "序号",
        key: "index",
        width: 70,
        render: (_row: any, index: number) => index + 1,
    },
    { title: "指标名称", key: "name", minWidth: 140 },
    { title: "指标类型", key: "type", width: 100 },
    { title: "基准值", key: "baseline", width: 90 },
    { title: "目标值", key: "target", width: 90 },
    { title: "单位", key: "unit", width: 70 },
]);

function openLibraryPicker() {
    libraryCheckedRowKeys.value = [];
    libraryModalShow.value = true;
}

function addSelectedFromLibrary() {
    const toAdd: Indicator[] = [];
    for (const id of libraryCheckedRowKeys.value) {
        const ind = indicatorStore.indicators.find((i) => i.id === id);
        if (ind) toAdd.push(ind);
    }
    if (selectedIndicators.value.length + toAdd.length > 50) {
        message.warning(
            `最多只能选择 50 个指标，还可添加 ${50 - selectedIndicators.value.length} 个`,
        );
        return;
    }
    for (const ind of toAdd) {
        if (!selectedIndicators.value.some((s) => s.id === ind.id)) {
            selectedIndicators.value.push(ind);
        }
    }
    libraryModalShow.value = false;
}

function removeFromSelected(id: number) {
    selectedIndicators.value = selectedIndicators.value.filter(
        (i) => i.id !== id,
    );
}

// ── 新增指标 ──
const showCreateModal = ref(false);
const createFormRef = ref<any>(null);
const createFormData = ref<IndicatorFormData>({
    name: "",
    description: "",
    baseline: 0,
    target: 0,
    type: "",
    unit: "",
});
const createRules = {
    name: { required: true, message: "请输入指标名称", trigger: "blur" },
};

const typeOptions = [
    { label: "正向指标", value: "正向指标" },
    { label: "负向指标", value: "负向指标" },
];

function openCreateModal() {
    createFormData.value = {
        name: "",
        description: "",
        baseline: 0,
        target: 0,
        type: "",
        unit: "",
    };
    showCreateModal.value = true;
}

async function handleCreate() {
    try {
        await createFormRef.value?.validate();
    } catch {
        return;
    }
    if (selectedIndicators.value.length >= 50) {
        message.warning("指标数量已达上限（50 个），无法继续添加");
        return;
    }
    try {
        await indicatorStore.create(createFormData.value);
        // find the newly created indicator by name and auto-select it
        const created = indicatorStore.indicators.find(
            (i) => i.name === createFormData.value.name,
        );
        if (created) {
            selectedIndicators.value.push(created);
        }
        message.success("指标已创建并添加到计算列表");
        showCreateModal.value = false;
    } catch (e) {
        message.error(String(e));
    }
}

// ── 下一步：进入权重分配页 ──
function nextStep() {
    if (selectedIndicators.value.length === 0) {
        message.warning("请至少选择一个指标进行计算");
        return;
    }
    if (!systemName.value.trim()) {
        message.warning("请输入指标体系名称");
        return;
    }

    // 将当前数据暂存到 chartStore，传给权重分配页
    chartStore.pendingSystemName = systemName.value.trim();
    chartStore.pendingSystemDescription = systemDescription.value.trim();
    chartStore.pendingIndicators = [...selectedIndicators.value];
    chartStore.calcIndicators = [...selectedIndicators.value];

    emit("navigate", "weight-allocation");
}

// ── 已选指标表格列 ──
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
        render: (row: Indicator) =>
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
        title: "操作",
        key: "actions",
        width: 80,
        fixed: "right",
        render: (row: Indicator) =>
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
                    onClick: () => removeFromSelected(row.id),
                },
                "移除",
            ),
    },
]);

const remainingCount = computed(() => 50 - selectedIndicators.value.length);
</script>

<template>
    <div class="entry-page">
        <!-- 标题栏 -->
        <div class="entry-header">
            <div>
                <div class="entry-title">录入指标体系</div>
                <n-text depth="3" class="entry-subtitle">
                    填写体系信息，选择或创建指标后进行计算，最多 50 个
                </n-text>
            </div>
            <div class="entry-actions">
                <n-button quaternary @click="emit('navigate', 'home')">
                    ← 返回首页
                </n-button>
            </div>
        </div>

        <!-- 指标体系名称 -->
        <n-card :bordered="false" class="table-card">
            <div class="system-info">
                <div style="flex: 1">
                    <n-form-item
                        label="指标体系名称"
                        label-placement="top"
                        required
                    >
                        <n-input
                            v-model:value="systemName"
                            placeholder="请输入本次指标体系名称，如：2026年Q1业务评估"
                            maxlength="100"
                            show-count
                        />
                    </n-form-item>
                </div>
                <div style="flex: 1">
                    <n-form-item label="体系描述" label-placement="top">
                        <n-input
                            v-model:value="systemDescription"
                            type="textarea"
                            :rows="2"
                            placeholder="指标体系描述说明（可选）"
                            maxlength="500"
                            show-count
                        />
                    </n-form-item>
                </div>
            </div>
        </n-card>

        <!-- 已选指标列表 -->
        <n-card :bordered="false" class="table-card">
            <template #header>
                <div class="selected-header">
                    <span class="selected-title">已选指标</span>
                    <div class="selected-actions">
                        <n-button
                            size="small"
                            :disabled="remainingCount <= 0"
                            @click="openLibraryPicker"
                        >
                            从指标库选择
                        </n-button>
                        <n-button
                            size="small"
                            type="primary"
                            :disabled="remainingCount <= 0"
                            @click="openCreateModal"
                        >
                            + 新增指标
                        </n-button>
                    </div>
                </div>
            </template>

            <n-data-table
                :columns="columns"
                :data="selectedIndicators"
                :bordered="false"
                :single-line="false"
                :max-height="460"
                size="small"
                striped
            />

            <template #footer>
                <div class="table-footer">
                    <n-text depth="3">
                        已选
                        <n-text
                            type="primary"
                            depth="1"
                            style="font-weight: 700"
                            >{{ selectedIndicators.length }}</n-text
                        >
                        / 50 个指标，还可添加
                        <n-text type="success" style="font-weight: 700">{{
                            remainingCount
                        }}</n-text>
                        个
                    </n-text>
                    <n-button
                        type="primary"
                        size="large"
                        strong
                        :disabled="selectedIndicators.length === 0"
                        @click="nextStep"
                    >
                        下一步 → 权重分配
                    </n-button>
                </div>
            </template>
        </n-card>
    </div>

    <!-- 从指标库选择 对话框 -->
    <n-modal
        v-model:show="libraryModalShow"
        title="从指标库选择"
        preset="card"
        style="width: 720px; max-width: 90vw"
        :mask-closable="false"
        :segmented="{ content: true, footer: true }"
    >
        <n-data-table
            :columns="libraryColumns"
            :data="availableLibraryIndicators"
            :bordered="false"
            :single-line="false"
            :max-height="400"
            size="small"
            :row-key="(row: Indicator) => row.id"
            v-model:checked-row-keys="libraryCheckedRowKeys"
        />
        <template #footer>
            <n-space justify="end">
                <n-button @click="libraryModalShow = false">取消</n-button>
                <n-button
                    type="primary"
                    :disabled="libraryCheckedRowKeys.length === 0"
                    @click="addSelectedFromLibrary"
                >
                    添加选中 ({{ libraryCheckedRowKeys.length }})
                </n-button>
            </n-space>
        </template>
    </n-modal>

    <!-- 新增指标 对话框 -->
    <n-modal
        v-model:show="showCreateModal"
        title="新增指标"
        preset="card"
        style="width: 560px; max-width: 90vw"
        :mask-closable="false"
        :segmented="{ content: true, footer: true }"
    >
        <n-form
            ref="createFormRef"
            :model="createFormData"
            :rules="createRules"
            label-placement="left"
            label-width="90"
            label-align="right"
            require-mark-placement="right-hanging"
            style="margin-top: 8px"
        >
            <n-form-item label="指标名称" path="name">
                <n-input
                    v-model:value="createFormData.name"
                    placeholder="请输入指标名称"
                />
            </n-form-item>
            <n-form-item label="指标解释">
                <n-input
                    v-model:value="createFormData.description"
                    type="textarea"
                    :rows="2"
                    placeholder="请输入指标解释说明"
                />
            </n-form-item>
            <div style="display: flex; gap: 12px">
                <n-form-item label="基准值" style="flex: 1">
                    <n-input-number
                        v-model:value="createFormData.baseline"
                        style="width: 100%"
                        :precision="2"
                    />
                </n-form-item>
                <n-form-item label="目标值" style="flex: 1">
                    <n-input-number
                        v-model:value="createFormData.target"
                        style="width: 100%"
                        :precision="2"
                    />
                </n-form-item>
            </div>
            <div style="display: flex; gap: 12px">
                <n-form-item label="指标类型" style="flex: 1">
                    <n-select
                        v-model:value="createFormData.type"
                        :options="typeOptions"
                        placeholder="选择指标类型"
                    />
                </n-form-item>
                <n-form-item label="指标单位" style="flex: 1">
                    <n-input
                        v-model:value="createFormData.unit"
                        placeholder="如：个、%、元"
                    />
                </n-form-item>
            </div>
        </n-form>
        <template #footer>
            <n-space justify="end">
                <n-button @click="showCreateModal = false">取消</n-button>
                <n-button type="primary" strong @click="handleCreate"
                    >创建并添加</n-button
                >
            </n-space>
        </template>
    </n-modal>
</template>

<style scoped>
.entry-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.entry-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
}

.entry-title {
    font-size: 18px;
    font-weight: 700;
    color: #1f2d3d;
}

.entry-subtitle {
    font-size: 12px;
    margin-top: 2px;
}

.table-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(30, 50, 90, 0.06);
}

.selected-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.selected-title {
    font-size: 15px;
    font-weight: 600;
    color: #1f2d3d;
}

.selected-actions {
    display: flex;
    gap: 8px;
}

.table-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
}

.system-info {
    display: flex;
    gap: 16px;
}

@media (max-width: 800px) {
    .system-info {
        flex-direction: column;
    }
}
</style>
