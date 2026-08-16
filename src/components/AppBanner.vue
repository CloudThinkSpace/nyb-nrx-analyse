<script setup lang="ts">
import { computed } from "vue";
import logoImg from "../assets/logo.png";

const props = defineProps<{
    loading: boolean;
    currentFile: string | null;
}>();

defineEmits<{
    (e: "start-calc"): void;
}>();

const fileName = computed(() => {
    if (!props.currentFile) return "";
    return props.currentFile.split(/[\\/]/).pop() ?? props.currentFile;
});
</script>

<template>
    <header class="banner">
        <div class="banner-left">
            <div class="logo">
                <img :src="logoImg" class="logo-img" alt="Logo" />
            </div>
            <div class="title-group">
                <h1 class="title">区域农业绿色发展水平评价软件</h1>
                <span class="subtitle">指标体系管理与分析评价工具</span>
            </div>
        </div>
        <div class="banner-right">
            <span v-if="currentFile" class="file-chip" :title="currentFile"
                >📄 {{ fileName }}</span
            >
            <n-button
                color="#ffffff"
                text-color="#2f6fd8"
                strong
                :loading="loading"
                @click="$emit('start-calc')"
            >
                🚀 开始计算
            </n-button>
        </div>
    </header>
</template>

<style scoped>
.banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 76px;
    flex-shrink: 0;
    padding: 0 28px;
    background: linear-gradient(120deg, #16245e 0%, #24419c 45%, #2f6fd8 100%);
    color: #fff;
    box-shadow: 0 2px 12px rgba(22, 36, 94, 0.35);
    position: relative;
    z-index: 10;
}

.banner-left {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
}

.logo {
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
}

.logo-img {
    width: 80px;
    height: 80px;
    object-fit: contain;
}

.title {
    font-size: 20px;
    font-weight: 700;
    margin: 0;
    letter-spacing: 1px;
    white-space: nowrap;
}

.subtitle {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.75);
}

.banner-right {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
}

.file-chip {
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    padding: 5px 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
    border: 1px solid rgba(255, 255, 255, 0.25);
}
</style>
