<script setup lang="ts">
import { computed } from 'vue'
import { useChartStore } from '../stores/chartStore'
import ChartCard from '../components/ChartCard.vue'

const store = useChartStore()

const palette = [
    '#2f6fd8', '#5ec8e5', '#18a058', '#f0a020',
    '#d03050', '#7c8db5', '#a26cd8', '#e8684a',
    '#3fb6b2', '#b0b840',
]

const option = computed(() => {
    const d = store.data
    if (!d) return {}
    return {
        tooltip: { trigger: 'item', formatter: '{b}: {c}（{d}%）' },
        legend: {
            bottom: 0,
            icon: 'circle',
            itemWidth: 10,
            itemHeight: 10,
            textStyle: { color: '#666', fontSize: 12 },
            type: 'scroll',
        },
        series: [
            {
                name: '占比',
                type: 'pie',
                radius: ['42%', '68%'],
                center: ['50%', '45%'],
                avoidLabelOverlap: true,
                itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
                label: { show: false },
                emphasis: {
                    label: { show: true, fontSize: 16, fontWeight: 'bold' },
                    scaleSize: 6,
                },
                data: d.categories.map((name, i) => ({
                    name,
                    value: d.values[i],
                    itemStyle: { color: palette[i % palette.length] },
                })),
            },
        ],
    }
})
</script>

<template>
    <ChartCard title="占比分析" subtitle="各类别数值占比环形图" :has-data="!!store.data">
        <v-chart :option="option" autoresize style="height: 480px" />
    </ChartCard>
</template>
