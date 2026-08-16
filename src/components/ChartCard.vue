<script setup lang="ts">
defineProps<{
    title: string;
    subtitle?: string;
    hasData: boolean;
}>();
</script>

<template>
    <n-card class="chart-card" :bordered="false" size="large">
        <template #header>
            <div class="card-header">
                <div>
                    <div class="card-title">{{ title }}</div>
                    <n-text v-if="subtitle" depth="3" class="card-subtitle">{{
                        subtitle
                    }}</n-text>
                </div>
                <slot name="extra" />
            </div>
        </template>
        <n-empty
            v-if="!hasData"
            class="empty"
            description="暂无数据，请点击右上角「🚀 开始计算」加载数据"
        />
        <slot v-else />
    </n-card>
</template>

<style scoped>
.chart-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(30, 50, 90, 0.06);
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.card-title {
    font-size: 16px;
    font-weight: 600;
    color: #1f2d3d;
}

.card-subtitle {
    font-size: 12px;
}

.empty {
    padding: 70px 0;
}
</style>
