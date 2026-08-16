<script setup lang="ts">
import { computed } from 'vue'
import { useChartStore } from '../stores/chartStore'
import ChartCard from '../components/ChartCard.vue'

const store = useChartStore()

const option = computed(() => {
    const d = store.data
    if (!d) return {}
    return {
        tooltip: { trigger: 'axis' },
        grid: { left: '4%', right: '4%', bottom: '6%', top: '10%', containLabel: true },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: d.categories,
            axisLabel: { rotate: 30, color: '#666', fontSize: 12 },
            axisLine: { lineStyle: { color: '#d9dee7' } },
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
                name: '数值',
                type: 'line',
                data: d.values,
                smooth: true,
                symbol: 'circle',
                symbolSize: 7,
                lineStyle: { width: 3, color: '#2f6fd8' },
                itemStyle: { color: '#5ec8e5', borderColor: '#2f6fd8', borderWidth: 1.5 },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(94, 200, 229, 0.45)' },
                            { offset: 1, color: 'rgba(47, 111, 216, 0.05)' },
                        ],
                    },
                },
            },
        ],
    }
})
</script>

<template>
    <ChartCard title="趋势分析" subtitle="各类别数值走势（平滑曲线 + 面积填充）" :has-data="!!store.data">
        <v-chart :option="option" autoresize style="height: 480px" />
    </ChartCard>
</template>
