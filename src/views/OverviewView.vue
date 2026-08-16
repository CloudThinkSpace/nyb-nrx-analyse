<script setup lang="ts">
import { computed } from 'vue'
import { useChartStore } from '../stores/chartStore'
import ChartCard from '../components/ChartCard.vue'

const store = useChartStore()

function fmt(n: number): string {
    return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

const stats = computed(() => {
    const d = store.data
    if (!d) return []
    return [
        { key: 'count', label: '类别数量', value: fmt(d.categories.length), icon: '🗂️', color: '#2f6fd8' },
        { key: 'total', label: '总值（合计）', value: fmt(d.total), icon: '💰', color: '#18a058' },
        { key: 'avg', label: '平均值', value: fmt(d.avg), icon: '📐', color: '#d03050' },
        { key: 'max', label: '最大值', value: fmt(d.max), icon: '🚀', color: '#f0a020' },
        { key: 'min', label: '最小值', value: fmt(d.min), icon: '⬇️', color: '#7c8db5' },
    ]
})

const previewOption = computed(() => {
    const d = store.data
    if (!d) return {}
    return {
        tooltip: { trigger: 'axis' },
        grid: { left: '4%', right: '4%', bottom: '4%', top: '6%', containLabel: true },
        xAxis: {
            type: 'category',
            data: d.categories,
            axisLabel: { rotate: 30, color: '#666', fontSize: 11 },
            axisLine: { lineStyle: { color: '#d9dee7' } },
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: '#666' },
            splitLine: { lineStyle: { color: '#f0f2f5' } },
        },
        series: [
            {
                type: 'bar',
                data: d.values,
                barMaxWidth: 30,
                itemStyle: {
                    borderRadius: [4, 4, 0, 0],
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: '#5ec8e5' },
                            { offset: 1, color: '#2f6fd8' },
                        ],
                    },
                },
            },
        ],
    }
})

const topCategories = computed(() => {
    const d = store.data
    if (!d) return []
    return d.categories.slice(0, 5).map((name, i) => ({ name, value: d.values[i] }))
})
</script>

<template>
    <div class="overview">
        <div class="stat-grid">
            <div v-for="s in stats" :key="s.key" class="stat-card">
                <div class="stat-icon" :style="{ background: s.color + '1a', color: s.color }">
                    {{ s.icon }}
                </div>
                <div class="stat-info">
                    <div class="stat-value">{{ s.value }}</div>
                    <div class="stat-label">{{ s.label }}</div>
                </div>
            </div>
        </div>

        <div class="overview-row">
            <ChartCard
                title="数据分布预览"
                subtitle="按类别汇总的柱状图"
                :has-data="!!store.data"
                style="flex: 1.6;"
            >
                <v-chart :option="previewOption" autoresize style="height: 320px" />
            </ChartCard>
            <ChartCard
                title="TOP 5 类别"
                subtitle="数值最高的前 5 个类别"
                :has-data="!!store.data"
                style="flex: 1;"
            >
                <div class="top-list">
                    <div v-for="(item, i) in topCategories" :key="item.name" class="top-item">
                        <span class="rank" :class="'rank-' + (i + 1)">{{ i + 1 }}</span>
                        <span class="top-name" :title="item.name">{{ item.name }}</span>
                        <span class="top-value">{{ fmt(item.value) }}</span>
                    </div>
                </div>
            </ChartCard>
        </div>
    </div>
</template>

<style scoped>
.overview {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.stat-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
}

.stat-card {
    background: #fff;
    border-radius: 12px;
    padding: 18px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 2px 10px rgba(30, 50, 90, 0.06);
}

.stat-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
}

.stat-info {
    min-width: 0;
}

.stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #1f2d3d;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.stat-label {
    font-size: 12px;
    color: #86909c;
    margin-top: 2px;
}

.overview-row {
    display: flex;
    gap: 16px;
}

.top-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.top-item {
    display: flex;
    align-items: center;
    gap: 10px;
}

.rank {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: #eef1f7;
    color: #7c8db5;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.rank-1 {
    background: #f7e9c9;
    color: #d97706;
}

.rank-2 {
    background: #e5e7eb;
    color: #6b7280;
}

.rank-3 {
    background: #fde2d2;
    color: #c2612f;
}

.top-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    color: #1f2d3d;
}

.top-value {
    font-size: 14px;
    font-weight: 600;
    color: #2f6fd8;
}
</style>
