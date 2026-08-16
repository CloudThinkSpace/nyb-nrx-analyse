<script setup lang="ts">
import type { MenuItem } from '../types/menu'

defineProps<{
    menus: MenuItem[]
    active: string
}>()

defineEmits<{
    (e: 'update:active', key: string): void
}>()
</script>

<template>
    <aside class="side-menu">
        <div class="menu-header">功能菜单</div>
        <nav class="menu-list">
            <div
                v-for="item in menus"
                :key="item.key"
                class="menu-item"
                :class="{ active: item.key === active }"
                @click="$emit('update:active', item.key)"
            >
                <span class="menu-icon">{{ item.icon }}</span>
                <span class="menu-label">{{ item.label }}</span>
            </div>
        </nav>
        <div class="menu-footer">版本 v0.1.0</div>
    </aside>
</template>

<style scoped>
.side-menu {
    width: 220px;
    flex-shrink: 0;
    background: linear-gradient(180deg, #1b2a5e 0%, #15204a 100%);
    display: flex;
    flex-direction: column;
    color: #fff;
}

.menu-header {
    padding: 18px 20px 12px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 2px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.menu-list {
    flex: 1;
    padding: 12px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
}

.menu-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.75);
    transition: all 0.2s ease;
    user-select: none;
}

.menu-item:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
}

.menu-item.active {
    background: linear-gradient(90deg, rgba(94, 200, 229, 0.28), rgba(94, 200, 229, 0.05));
    color: #fff;
    font-weight: 600;
}

.menu-item.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 22%;
    bottom: 22%;
    width: 3px;
    border-radius: 2px;
    background: #5ec8e5;
}

.menu-icon {
    font-size: 17px;
    width: 22px;
    text-align: center;
    flex-shrink: 0;
}

.menu-label {
    white-space: nowrap;
}

.menu-footer {
    padding: 14px 20px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
