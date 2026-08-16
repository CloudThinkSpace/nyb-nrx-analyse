<script setup lang="ts">
import { computed } from "vue";
import { NTag } from "naive-ui";
import { useChartStore } from "../stores/chartStore";
import { useIndicatorStore } from "../stores/indicatorStore";
import { useSystemStore } from "../stores/systemStore";
import { useCalcHistoryStore } from "../stores/calcHistoryStore";
import ChartCard from "../components/ChartCard.vue";

const emit = defineEmits<{ (e: "navigate", view: string): void }>();

const chartStore = useChartStore();
const indicatorStore = useIndicatorStore();
const systemStore = useSystemStore();
const calcHistoryStore = useCalcHistoryStore();

// Kick off init
indicatorStore.init();
systemStore.init();
calcHistoryStore.init();

function fmt(n: number): string {
    return n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

// CSV 数据统计
const chartStats = computed(() => {
    const d = chartStore.data;
    if (!d) return [];
    return [
        {
            label: "类别数量",
            value: d.categories.length,
            icon: "🗂️",
            color: "#2f6fd8",
        },
        { label: "总值", value: fmt(d.total), icon: "💰", color: "#18a058" },
        { label: "平均值", value: fmt(d.avg), icon: "📐", color: "#d03050" },
    ];
});

// CSV 预览图表
const previewOption = computed(() => {
    const d = chartStore.data;
    if (!d) return {};
    return {
        tooltip: { trigger: "axis" },
        grid: {
            left: "4%",
            right: "4%",
            bottom: "4%",
            top: "6%",
            containLabel: true,
        },
        xAxis: {
            type: "category",
            data: d.categories,
            axisLabel: { rotate: 30, color: "#666", fontSize: 11 },
        },
        yAxis: {
            type: "value",
            axisLabel: { color: "#666" },
            splitLine: { lineStyle: { color: "#f0f2f5" } },
        },
        series: [
            {
                type: "bar",
                data: d.values,
                barMaxWidth: 28,
                itemStyle: {
                    borderRadius: [4, 4, 0, 0],
                    color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: "#5ec8e5" },
                            { offset: 1, color: "#2f6fd8" },
                        ],
                    },
                },
            },
        ],
    };
});

function sortRecent<T extends { created_at: string }>(list: T[]): T[] {
    return [...list]
        .sort(
            (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
        )
        .slice(0, 5);
}

// 指标统计
const indicatorStats = computed(() => {
    const list = indicatorStore.indicators;
    if (list.length === 0) return null;
    return {
        total: list.length,
        recent: sortRecent(list),
    };
});

// 指标体系统计
const systemStats = computed(() => {
    const list = systemStore.systems;
    if (list.length === 0) return null;
    return {
        total: list.length,
        recent: sortRecent(list),
    };
});

// 历史计算统计
const historyStats = computed(() => {
    const list = calcHistoryStore.records;
    if (list.length === 0) return null;
    return {
        total: list.length,
        recent: sortRecent(list),
    };
});
</script>

<template>
    <div class="home">
        <!-- 欢迎横幅 -->
        <div class="welcome-banner">
            <div class="welcome-text">
                <h2>欢迎使用 区域农业绿色发展水平评价软件</h2>
                <p>集指标体系管理与数据评价于一体的轻量级分析工具</p>
            </div>
        </div>

        <!-- 若无任何数据，显示空状态引导 -->
        <div
            v-if="!chartStore.data && indicatorStore.indicators.length === 0"
            class="empty-guide"
        >
            <n-card :bordered="false" class="guide-card">
                <n-empty description="暂无数据，快速开始：">
                    <template #extra>
                        <div class="guide-steps">
                            <div class="guide-step">
                                <span class="step-num">1</span>
                                <span
                                    >点击右上角「🚀
                                    开始计算」进入指标录入与计算</span
                                >
                            </div>
                            <div class="guide-step">
                                <span class="step-num">2</span>
                                <span>在左侧菜单「指标库」中添加管理指标</span>
                            </div>
                            <div class="guide-step">
                                <span class="step-num">3</span>
                                <span>在首页查看汇总统计与预览</span>
                            </div>
                        </div>
                    </template>
                </n-empty>
            </n-card>
        </div>

        <!-- CSV 数据区域 -->
        <div v-if="chartStore.data" class="section">
            <div class="section-title">📊 CSV 数据分析</div>
            <div class="stat-grid">
                <div v-for="s in chartStats" :key="s.label" class="stat-card">
                    <div
                        class="stat-icon"
                        :style="{ background: s.color + '1a', color: s.color }"
                    >
                        {{ s.icon }}
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">{{ s.value }}</div>
                        <div class="stat-label">{{ s.label }}</div>
                    </div>
                </div>
            </div>
            <ChartCard
                title="数值分布"
                subtitle="前 20 个类别汇总"
                :has-data="true"
            >
                <v-chart
                    :option="previewOption"
                    autoresize
                    style="height: 280px"
                />
            </ChartCard>
        </div>

        <!-- 统计数据网格（指标库 / 指标体系 / 历史计算 并列展示） -->
        <div class="stats-grid">
            <!-- 指标库区域 -->
            <div v-if="indicatorStore.indicators.length > 0" class="section">
                <div class="section-title">📋 指标库一览</div>
                <div class="stat-card">
                    <div
                        class="stat-icon"
                        style="background: #e8f4fd; color: #2f6fd8"
                    >
                        📋
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">
                            {{ indicatorStats?.total }}
                        </div>
                        <div class="stat-label">指标总数</div>
                    </div>
                </div>
                <!-- 最近添加指标 -->
                <div class="recent-block">
                    <div class="recent-block-title">最近添加</div>
                    <div class="recent-list">
                        <div
                            v-for="item in indicatorStats?.recent"
                            :key="item.id"
                            class="recent-item clickable"
                            @click="emit('navigate', 'indicators')"
                        >
                            <span class="recent-name">{{ item.name }}</span>
                            <n-tag size="small" :bordered="false" round>{{
                                item.type || "未分类"
                            }}</n-tag>
                            <span class="recent-meta"
                                >基准 {{ item.baseline }} → 目标
                                {{ item.target }}</span
                            >
                        </div>
                    </div>
                </div>
            </div>

            <!-- 指标体系区域 -->
            <div v-if="systemStore.systems.length > 0" class="section">
                <div class="section-title">📦 指标体系</div>
                <div class="stat-card">
                    <div
                        class="stat-icon"
                        style="background: #e8f4fd; color: #2f6fd8"
                    >
                        📦
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">
                            {{ systemStats?.total }}
                        </div>
                        <div class="stat-label">体系总数</div>
                    </div>
                </div>
                <!-- 最近创建体系 -->
                <div class="recent-block">
                    <div class="recent-block-title">最近创建</div>
                    <div class="recent-list">
                        <div
                            v-for="item in systemStats?.recent"
                            :key="item.id"
                            class="recent-item clickable"
                            @click="
                                emit('navigate', 'system-detail-' + item.id)
                            "
                        >
                            <span class="recent-name">{{ item.name }}</span>
                            <n-tag
                                size="small"
                                :bordered="false"
                                round
                                type="primary"
                                >{{ item.indicator_count }}项</n-tag
                            >
                            <span class="recent-meta">{{
                                item.created_at
                            }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 历史计算区域 -->
            <div v-if="calcHistoryStore.records.length > 0" class="section">
                <div class="section-title">📊 历史计算</div>
                <div class="stat-card">
                    <div
                        class="stat-icon"
                        style="background: #f0e8fd; color: #a26cd8"
                    >
                        📊
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">
                            {{ historyStats?.total }}
                        </div>
                        <div class="stat-label">计算次数</div>
                    </div>
                </div>
                <!-- 最近计算记录 -->
                <div class="recent-block">
                    <div class="recent-block-title">最近计算</div>
                    <div class="recent-list">
                        <div
                            v-for="item in historyStats?.recent"
                            :key="item.id"
                            class="recent-item clickable"
                            @click="
                                emit('navigate', 'calc-history-view-' + item.id)
                            "
                        >
                            <span class="recent-name">{{
                                item.system_name
                            }}</span>
                            <n-tag size="small" :bordered="false" round
                                >{{ item.indicator_count }}项</n-tag
                            >
                            <span class="recent-meta">{{
                                item.created_at
                            }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.home {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.welcome-banner {
    background: linear-gradient(120deg, #16245e 0%, #24419c 45%, #2f6fd8 100%);
    border-radius: 12px;
    padding: 28px 32px;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
}

.welcome-text h2 {
    margin: 0 0 6px;
    font-size: 20px;
    font-weight: 700;
}

.welcome-text p {
    margin: 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.75);
}

.guide-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(30, 50, 90, 0.06);
}

.guide-steps {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 8px 0;
    text-align: left;
}

.guide-step {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    color: #4b5b7a;
}

.step-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2f6fd8, #5ec8e5);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    align-items: start;
}

.section {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.section-title {
    font-size: 15px;
    font-weight: 600;
    color: #1f2d3d;
}

.stat-card {
    background: #fff;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 2px 10px rgba(30, 50, 90, 0.06);
}

.stat-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 19px;
    flex-shrink: 0;
}

.stat-value {
    font-size: 18px;
    font-weight: 700;
    color: #1f2d3d;
    line-height: 1.2;
}

.stat-label {
    font-size: 12px;
    color: #86909c;
    margin-top: 2px;
}

.recent-block {
    background: #fff;
    border: 1px solid #e8ecf1;
    border-radius: 8px;
    padding: 10px 14px;
    box-shadow: 0 2px 8px rgba(30, 50, 90, 0.05);
}

.recent-block-title {
    font-size: 13px;
    font-weight: 600;
    color: #2f6fd8;
    margin-bottom: 8px;
}

.recent-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.recent-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f0f2f5;
}

.recent-item:last-child {
    border-bottom: none;
}

.recent-item.clickable {
    cursor: pointer;
    border-radius: 6px;
    transition:
        background 0.15s,
        padding-left 0.15s;
    padding-left: 4px;
    padding-right: 4px;
}

.recent-item.clickable:hover {
    background: #eef3fb;
    padding-left: 8px;
}

.recent-name {
    flex: 1;
    font-size: 14px;
    color: #1f2d3d;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.recent-meta {
    font-size: 12px;
    color: #86909c;
    white-space: nowrap;
}
</style>
