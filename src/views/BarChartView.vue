<script setup lang="ts">
import { computed } from 'vue'
import { useChartStore } from '../stores/chartStore'
import ChartCard from '../components/ChartCard.vue'

const store = useChartStore()

const option = computed(() => {
    const d = store.data
    if (!d) return {}
    return {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '4%', right: '4%', bottom: '6%', top: '8%', containLabel: true },
        xAxis: {
            type: 'category',
            data: d.categories,
            axisLabel: { rotate: 30, color: '#666', fontSize: 12 },
            axisLine: { lineStyle: { color: '#d9dee7' } },
            axisTick: { alignWithLabel: true },
        },
        yAxis: {
            type: 'value',
            name: '数值',
            nameTextStyle: { color: '#86909c' },
            axisLabel: { color: '#666' },
            splitLine: { lineStyle: { color: '#f0f2f5' } },
        },
        series: [
            {
                name: '合计',
                type: 'bar',
                data: d.values,
                barMaxWidth: 40,
                itemStyle: {
                    borderRadius: [6, 6, 0, 0],
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
                label: { show: true, position: 'top', color: '#4b5b7a', fontSize: 11 },
            },
        ],
    }
})
</script>

<template>
    <ChartCard title="柱状图分析" subtitle="各类别数值汇总对比（按数值降序）" :has-data="!!store.data">
        <v-chart :option="option" autoresize style="height: 480px" />
    </ChartCard>
</template>
