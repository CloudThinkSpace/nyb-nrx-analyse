<script setup lang="ts">
import logoImg from "../assets/logo.png";
</script>

<template>
    <div class="about-page">
        <n-card :bordered="false" class="about-card">
            <div class="about-hero">
                <div class="about-logo">
                    <img :src="logoImg" class="about-logo-img" alt="Logo" />
                </div>
                <h2>区域农业绿色发展水平评价软件</h2>
            </div>
            <n-divider />
            <n-text depth="3" class="usage">
                使用说明：点击右上角「🚀
                开始计算」系统进入数据评价，评价的结果，即可在左侧菜单中切换查看各类分析视图。
            </n-text>
        </n-card>
    </div>
</template>

<style scoped>
.about-page {
    display: flex;
    justify-content: center;
    padding-top: 40px;
}

.about-card {
    width: 100%;
    max-width: 640px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(30, 50, 90, 0.06);
}

.about-hero {
    text-align: center;
    padding: 20px 0 8px;
}

.about-logo {
    width: 64px;
    height: 64px;
    margin: 0 auto 14px;
    border-radius: 16px;
    background: linear-gradient(120deg, #16245e 0%, #2f6fd8 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 16px rgba(47, 111, 216, 0.3);
    overflow: hidden;
}

.about-logo-img {
    width: 80px;
    height: 80px;
    object-fit: contain;
}

.about-hero h2 {
    margin: 0 0 10px;
    font-size: 22px;
    color: #1f2d3d;
}

.about-hero p {
    margin: 0;
    font-size: 14px;
    color: #86909c;
    line-height: 1.7;
}

.tech-tags {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    padding: 14px 0;
}

.usage {
    font-size: 13px;
    line-height: 1.8;
    display: block;
}
</style>
