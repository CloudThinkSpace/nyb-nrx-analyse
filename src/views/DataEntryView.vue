<script setup lang="ts">
import { computed, h, onMounted, ref } from "vue";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import * as XLSX from "xlsx";
import { useMessage } from "naive-ui";
import { NTag } from "naive-ui";
import { useChartStore } from "../stores/chartStore";

const emit = defineEmits<{ (e: "navigate", view: string): void }>();

const chartStore = useChartStore();
const message = useMessage();

interface DisplayRow {
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

const displayRows = ref<DisplayRow[]>([]);
const regions = ref<string[]>([]);
const importing = ref(false);
const hasData = ref(false);

onMounted(() => {
    // 从 chartStore 读取暂存的指标数据
    const indicators = chartStore.pendingIndicators;
    if (indicators.length === 0) {
        message.warning("无指标数据，请返回重新选择");
        emit("navigate", "indicator-entry");
        return;
    }

    displayRows.value = indicators.map((ind) => ({
        id: ind.id,
        name: ind.name,
        description: ind.description,
        type: ind.type,
        baseline: ind.baseline,
        target: ind.target,
        unit: ind.unit,
        weight: chartStore.pendingWeights[ind.id] ?? 0,
        values: [],
    }));

    // 如果已有评价数据，恢复显示
    if (chartStore.evaluationData) {
        regions.value = chartStore.evaluationData.regions;
        hasData.value = true;
        // 合并已导入的数据
        for (const row of displayRows.value) {
            const found = chartStore.evaluationData.items.find(
                (ei) => ei.id === row.id || ei.name === row.name,
            );
            if (found) {
                row.values = [...found.values];
            }
        }
    }
});

// 生成 XLSX 模版内容
function generateTemplateWorkbook(): Uint8Array {
    const headerRow = [
        "序号",
        "指标名称",
        "指标类型",
        "单位",
        "广东省2021",
        "广东省2022",
        "广东省2023",
    ];
    const dataRows = displayRows.value.map((row, idx) => [
        idx + 1,
        row.name,
        row.type,
        row.unit,
        "",
        "",
        "",
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "评价数据");
    const arrayBuf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return new Uint8Array(arrayBuf);
}

// 下载模版
async function downloadTemplate() {
    try {
        const filePath = await save({
            defaultPath: `${chartStore.pendingSystemName || "评价模版"}_数据模版.xlsx`,
            filters: [{ name: "Excel 文件", extensions: ["xlsx"] }],
        });
        if (!filePath) return;

        const data = generateTemplateWorkbook();
        await writeFile(filePath, data);
        message.success("模版已下载");
    } catch (e) {
        message.error("下载模版失败：" + String(e));
    }
}

// 导入数据
async function importData() {
    try {
        const filePath = await open({
            multiple: false,
            filters: [{ name: "Excel 文件", extensions: ["xlsx"] }],
        });
        if (!filePath) return;

        importing.value = true;
        const fileData = await readFile(filePath);
        const wb = XLSX.read(fileData, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length < 2) {
            message.warning("Excel 文件中缺少数据行");
            importing.value = false;
            return;
        }

        const headers = rows[0] as string[];
        const dataRows = rows.slice(1);

        // 验证列
        const regionCols = headers.slice(4); // 跳过 序号,指标名称,指标类型,单位
        if (regionCols.length === 0) {
            message.warning("Excel 中缺少评价区域列（如：广东省2021）");
            importing.value = false;
            return;
        }

        // 匹配数据行（按序号匹配）
        const valueMap = new Map<
            number,
            { values: (number | null)[]; name: string }
        >();
        for (const row of dataRows) {
            const seq = parseInt(String(row[0]), 10);
            if (isNaN(seq)) continue;
            const values = regionCols.map((_, ci) => {
                const v = row[ci + 4];
                if (v === undefined || v === null || v === "") return null;
                const n = parseFloat(String(v));
                return isNaN(n) ? null : n;
            });
            valueMap.set(seq, { values, name: String(row[1] || "") });
        }

        // 合并到显示行
        for (let i = 0; i < displayRows.value.length; i++) {
            const row = displayRows.value[i];
            const matched = valueMap.get(i + 1);
            if (matched) {
                row.values = matched.values;
            } else {
                row.values = regionCols.map(() => null);
            }
        }

        regions.value = regionCols;
        hasData.value = true;
        message.success(`数据已导入，共 ${regionCols.length} 个区域`);
    } catch (e) {
        message.error("导入数据失败：" + String(e));
    } finally {
        importing.value = false;
    }
}

// 进入计算结果
function goToCalc() {
    // 保存评价数据到 chartStore
    chartStore.evaluationData = {
        regions: regions.value,
        items: displayRows.value.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            type: row.type,
            baseline: row.baseline,
            target: row.target,
            unit: row.unit,
            weight: row.weight,
            values: row.values,
        })),
    };
    emit("navigate", "calc-result");
}

// 表格列
const columns = computed(() => {
    const cols: any[] = [
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
            title: "指标类型",
            key: "type",
            width: 90,
            render: (row: DisplayRow) =>
                row.type
                    ? h(
                          NTag,
                          {
                              size: "small",
                              bordered: false,
                              round: true,
                          },
                          { default: () => row.type },
                      )
                    : h("span", { style: { color: "#86909c" } }, "-"),
        },
        { title: "基准值", key: "baseline", width: 80 },
        { title: "目标值", key: "target", width: 80 },
        {
            title: "权重",
            key: "weight",
            width: 80,
            render: (row: DisplayRow) =>
                h(
                    "span",
                    { style: "font-weight: 600; color: #2f6fd8;" },
                    `${row.weight}`,
                ),
        },
        { title: "单位", key: "unit", width: 70 },
    ];

    // 动态添加区域列
    for (const region of regions.value) {
        const idx = regions.value.indexOf(region);
        cols.push({
            title: region,
            key: `val_${idx}`,
            width: 110,
            render: (row: DisplayRow) => {
                const v = row.values[idx];
                return v !== null && v !== undefined
                    ? h(
                          "span",
                          {
                              style: "font-weight: 600; color: #2f6fd8;",
                          },
                          v.toLocaleString("zh-CN", {
                              maximumFractionDigits: 2,
                          }),
                      )
                    : h("span", { style: "color: #d9dee7;" }, "-");
            },
        });
    }

    return cols;
});
</script>

<template>
    <div class="data-entry-page">
        <!-- 标题栏 -->
        <div class="data-entry-header">
            <div>
                <div class="data-entry-title">评价区域数据录入</div>
                <n-text depth="3" class="data-entry-subtitle">
                    指标体系「{{ chartStore.pendingSystemName }}」—
                    下载模版填写数据后导入，或直接导入已填好的 Excel 文件
                </n-text>
            </div>
            <div class="data-entry-actions">
                <n-button
                    v-if="!chartStore.fromSystemList"
                    quaternary
                    @click="emit('navigate', 'weight-allocation')"
                >
                    ← 返回权重分配
                </n-button>
            </div>
        </div>

        <!-- 操作按钮 -->
        <n-card :bordered="false" class="action-card">
            <div class="action-bar">
                <n-button size="small" @click="downloadTemplate">
                    📥 下载模版
                </n-button>
                <n-button
                    size="small"
                    type="primary"
                    :loading="importing"
                    @click="importData"
                >
                    📤 导入数据
                </n-button>
                <n-text
                    v-if="hasData"
                    type="success"
                    depth="1"
                    style="font-size: 13px; margin-left: 12px"
                >
                    ✓ 已导入 {{ regions.length }} 个区域数据
                </n-text>
                <n-text
                    v-else
                    depth="3"
                    style="font-size: 13px; margin-left: 12px"
                >
                    暂无数据，请下载模版填写后导入
                </n-text>
            </div>
        </n-card>

        <!-- 数据表格 -->
        <n-card :bordered="false" class="table-card">
            <template #header>
                <span class="section-title">指标体系数据列表</span>
            </template>

            <n-data-table
                :columns="columns"
                :data="displayRows"
                :bordered="false"
                :single-line="false"
                size="small"
                striped
                :max-height="500"
            />

            <template #footer>
                <div class="table-footer">
                    <n-text depth="3">
                        共 {{ displayRows.length }} 个指标
                        <n-text
                            v-if="hasData"
                            type="success"
                            style="margin-left: 8px"
                        >
                            · {{ regions.length }} 个评价区域
                        </n-text>
                    </n-text>
                    <n-tooltip :disabled="hasData" placement="top">
                        <template #trigger>
                            <n-button
                                type="primary"
                                size="large"
                                strong
                                :disabled="!hasData"
                                @click="goToCalc"
                            >
                                下一步 → 计算结果
                            </n-button>
                        </template>
                        <span>请先导入数据后再进行下一步计算</span>
                    </n-tooltip>
                </div>
            </template>
        </n-card>

        <!-- 导入数据预览说明 -->
        <n-card v-if="!hasData" :bordered="false" class="info-card">
            <n-empty description="暂无评价数据">
                <template #extra>
                    <div class="guide-text">
                        <p>1. 点击「📥 下载模版」下载 Excel 模版文件</p>
                        <p>2. 在 Excel 中打开并填写数据</p>
                        <p>3. 点击「📤 导入数据」上传填好的 Excel 文件</p>
                    </div>
                </template>
            </n-empty>
        </n-card>
    </div>
</template>

<style scoped>
.data-entry-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.data-entry-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
}

.data-entry-title {
    font-size: 18px;
    font-weight: 700;
    color: #1f2d3d;
}

.data-entry-subtitle {
    font-size: 12px;
    margin-top: 2px;
    display: block;
}

.data-entry-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
}

.action-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(30, 50, 90, 0.06);
}

.action-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.table-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(30, 50, 90, 0.06);
}

.section-title {
    font-size: 15px;
    font-weight: 600;
    color: #1f2d3d;
}

.table-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
}

.info-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(30, 50, 90, 0.06);
}

.guide-text {
    text-align: left;
    padding: 8px 0;
    font-size: 14px;
    color: #4b5b7a;
    line-height: 2;
}
</style>
