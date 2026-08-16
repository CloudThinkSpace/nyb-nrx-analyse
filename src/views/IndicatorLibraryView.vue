<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from "vue";
import { useMessage, useDialog, NTag } from "naive-ui";
import {
    useIndicatorStore,
    type Indicator,
    type IndicatorFormData,
} from "../stores/indicatorStore";

const indicatorStore = useIndicatorStore();
const message = useMessage();
const dialog = useDialog();

// ── 分页 ──
const page = ref(1);
const pageSize = ref(15);

const paginatedData = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return indicatorStore.indicators.slice(start, start + pageSize.value);
});

watch(
    () => indicatorStore.indicators.length,
    () => {
        const maxPage =
            Math.ceil(indicatorStore.indicators.length / pageSize.value) || 1;
        if (page.value > maxPage) {
            page.value = maxPage;
        }
    },
);

onMounted(() => {
    indicatorStore.init();
});

// 指标类型选项
const typeOptions = [
    { label: "正向指标", value: "正向指标" },
    { label: "负向指标", value: "负向指标" },
];

// 对话框状态
const showModal = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref<InstanceType<(typeof import("naive-ui"))["NForm"]> | null>(
    null,
);

const formData = ref<IndicatorFormData>({
    name: "",
    description: "",
    baseline: 0,
    target: 0,
    type: "",
    unit: "",
});

const rules = {
    name: { required: true, message: "请输入指标名称", trigger: "blur" },
};

function openCreate() {
    editingId.value = null;
    formData.value = {
        name: "",
        description: "",
        baseline: 0,
        target: 0,
        type: "",
        unit: "",
    };
    showModal.value = true;
}

function openEdit(indicator: Indicator) {
    editingId.value = indicator.id;
    formData.value = {
        name: indicator.name,
        description: indicator.description,
        baseline: indicator.baseline,
        target: indicator.target,
        type: indicator.type,
        unit: indicator.unit,
    };
    showModal.value = true;
}

async function handleSubmit() {
    try {
        await formRef.value?.validate();
    } catch {
        return;
    }
    try {
        if (editingId.value !== null) {
            await indicatorStore.update({
                ...formData.value,
                id: editingId.value,
                created_at: "",
                updated_at: "",
            });
            message.success("指标已更新");
        } else {
            await indicatorStore.create(formData.value);
            message.success("指标已创建");
        }
        showModal.value = false;
    } catch (e) {
        message.error(String(e));
    }
}

function confirmRemove(id: number, name: string) {
    dialog.warning({
        title: "确认删除",
        content: `确定要删除指标「${name}」吗？此操作不可撤销。`,
        positiveText: "删除",
        negativeText: "取消",
        onPositiveClick: async () => {
            try {
                await indicatorStore.remove(id);
                message.success("指标已删除");
            } catch (e) {
                message.error(String(e));
            }
        },
    });
}

function fmt(n: number): string {
    return n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
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
        minWidth: 150,
        ellipsis: { tooltip: true },
    },
    {
        title: "指标解释",
        key: "description",
        minWidth: 200,
        ellipsis: { tooltip: true },
    },
    {
        title: "指标类型",
        key: "type",
        width: 110,
        render: (row: Indicator) =>
            row.type
                ? h(
                      NTag,
                      { size: "small", bordered: false, round: true },
                      { default: () => row.type },
                  )
                : h(
                      NTag,
                      {
                          size: "small",
                          bordered: false,
                          round: true,
                          type: "default",
                      },
                      { default: () => "未分类" },
                  ),
    },
    {
        title: "基准值",
        key: "baseline",
        width: 100,
        sorter: (a: Indicator, b: Indicator) => a.baseline - b.baseline,
        render: (row: Indicator) =>
            h("span", { style: { fontWeight: 500 } }, fmt(row.baseline)),
    },
    {
        title: "目标值",
        key: "target",
        width: 100,
        sorter: (a: Indicator, b: Indicator) => a.target - b.target,
        render: (row: Indicator) =>
            h(
                "span",
                { style: { fontWeight: 600, color: "#2f6fd8" } },
                fmt(row.target),
            ),
    },
    { title: "单位", key: "unit", width: 80 },
    {
        title: "操作",
        key: "actions",
        width: 160,
        fixed: "right",
        render: (row: Indicator) =>
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
                        onClick: () => openEdit(row),
                    },
                    "编辑",
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
]);
</script>

<template>
    <div class="indicator-library">
        <div class="page-header">
            <div>
                <div class="page-title">指标库</div>
                <n-text depth="3" class="page-subtitle"
                    >管理所有业务指标及其目标值</n-text
                >
            </div>
            <n-button type="primary" strong @click="openCreate">
                + 新增指标
            </n-button>
        </div>

        <n-card :bordered="false" class="table-card">
            <n-data-table
                :columns="columns"
                :data="paginatedData"
                :loading="indicatorStore.loading"
                :bordered="false"
                :single-line="false"
                :max-height="600"
                size="small"
                striped
            />
            <template #footer>
                <div class="pagination-wrap">
                    <n-pagination
                        v-model:page="page"
                        :page-count="
                            Math.ceil(
                                indicatorStore.indicators.length / pageSize,
                            ) || 1
                        "
                        :page-size="pageSize"
                        :page-sizes="[10, 15, 20, 50]"
                        show-size-picker
                        @update:page-size="
                            (val) => {
                                pageSize = val;
                                page = 1;
                            }
                        "
                    />
                    <n-text depth="3" style="font-size: 13px">
                        共 {{ indicatorStore.indicators.length }} 条
                    </n-text>
                </div>
            </template>
        </n-card>

        <n-modal
            v-model:show="showModal"
            :title="editingId !== null ? '编辑指标' : '新增指标'"
            preset="card"
            style="width: 600px; max-width: 90vw"
            :mask-closable="false"
            :close-on-esc="true"
            :segmented="{ content: true, footer: true }"
        >
            <n-form
                ref="formRef"
                :model="formData"
                :rules="rules"
                label-placement="left"
                label-width="100"
                label-align="right"
                require-mark-placement="right-hanging"
                style="margin-top: 8px"
            >
                <n-form-item label="指标名称" path="name">
                    <n-input
                        v-model:value="formData.name"
                        placeholder="请输入指标名称"
                    />
                </n-form-item>
                <n-form-item label="指标解释">
                    <n-input
                        v-model:value="formData.description"
                        type="textarea"
                        :rows="3"
                        placeholder="请输入指标解释说明"
                    />
                </n-form-item>
                <div style="display: flex; gap: 16px">
                    <n-form-item label="基准值" style="flex: 1">
                        <n-input-number
                            v-model:value="formData.baseline"
                            placeholder="0"
                            style="width: 100%"
                            :precision="2"
                        />
                    </n-form-item>
                    <n-form-item label="目标值" style="flex: 1">
                        <n-input-number
                            v-model:value="formData.target"
                            placeholder="0"
                            style="width: 100%"
                            :precision="2"
                        />
                    </n-form-item>
                </div>
                <div style="display: flex; gap: 16px">
                    <n-form-item label="指标类型" style="flex: 1">
                        <n-select
                            v-model:value="formData.type"
                            :options="typeOptions"
                            placeholder="选择指标类型"
                        />
                    </n-form-item>
                    <n-form-item label="指标单位" style="flex: 1">
                        <n-input
                            v-model:value="formData.unit"
                            placeholder="如：个、%、元"
                        />
                    </n-form-item>
                </div>
            </n-form>
            <template #footer>
                <n-space justify="end">
                    <n-button @click="showModal = false">取消</n-button>
                    <n-button type="primary" strong @click="handleSubmit">
                        {{ editingId !== null ? "保存修改" : "创建指标" }}
                    </n-button>
                </n-space>
            </template>
        </n-modal>
    </div>
</template>

<style scoped>
.indicator-library {
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
