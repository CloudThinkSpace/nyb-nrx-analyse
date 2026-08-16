<script setup lang="ts">
import { computed, h } from 'vue'
import { useChartStore } from '../stores/chartStore'
import ChartCard from '../components/ChartCard.vue'

const store = useChartStore()

function fmt(n: number): string {
    return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

interface Row {
    rank: number
    category: string
    value: number
    ratio: number
}

const rows = computed<Row[]>(() => {
    const d = store.data
    if (!d) return []
    return d.categories.map((name, i) => ({
        rank: i + 1,
        category: name,
        value: d.values[i],
        ratio: d.total > 0 ? (d.values[i] / d.total) * 100 : 0,
    }))
})

const columns = computed(() => [
    { title: '排名', key: 'rank', width: 70, sorter: 'default' },
    { title: '类别', key: 'category', minWidth: 180 },
    {
        title: '数值',
        key: 'value',
        width: 150,
        sorter: (a: Row, b: Row) => a.value - b.value,
        render: (row: Row) => h('span', { style: { fontWeight: 600, color: '#2f6fd8' } }, fmt(row.value)),
    },
    {
        title: '占比',
        key: 'ratio',
        width: 260,
        sorter: (a: Row, b: Row) => a.ratio - b.ratio,
        render: (row: Row) =>
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [
                h('div', {
                    style: {
                        width: `${Math.max(2, row.ratio)}%`,
                        height: '10px',
                        borderRadius: '5px',
                        background: 'linear-gradient(90deg, #5ec8e5, #2f6fd8)',
                    },
                }),
                h('span', {}, `${row.ratio.toFixed(2)}%`),
            ]),
    },
])
</script>

<template>
    <ChartCard title="数据明细" subtitle="按数值降序排列的类别明细" :has-data="!!store.data">
        <n-data-table
            :columns="columns"
            :data="rows"
            :bordered="false"
            :single-line="false"
            :max-height="520"
            :pagination="{ pageSize: 10 }"
            size="small"
        />
    </ChartCard>
</template>
