<script setup lang="ts">
import { computed, ref } from "vue";
import { zhCN } from "naive-ui";
import { useChartStore } from "./stores/chartStore";
import AppBanner from "./components/AppBanner.vue";
import SideMenu from "./components/SideMenu.vue";
import HomeView from "./views/HomeView.vue";
import IndicatorLibraryView from "./views/IndicatorLibraryView.vue";
import IndicatorEntryView from "./views/IndicatorEntryView.vue";
import WeightAllocationView from "./views/WeightAllocationView.vue";
import DataEntryView from "./views/DataEntryView.vue";
import CalcResultView from "./views/CalcResultView.vue";
import IndicatorSystemView from "./views/IndicatorSystemView.vue";
import SystemDetailView from "./views/SystemDetailView.vue";
import HistoricalCalcView from "./views/HistoricalCalcView.vue";
import AboutView from "./views/AboutView.vue";
import type { MenuItem } from "./types/menu";

const chartStore = useChartStore();

const menus: MenuItem[] = [
    { key: "home", label: "首页", icon: "🏠" },
    { key: "indicators", label: "指标库", icon: "📋" },
    { key: "systems", label: "指标体系", icon: "📦" },
    { key: "calc-history", label: "历史计算", icon: "📊" },
    { key: "about", label: "关于", icon: "ℹ️" },
];

const activeMenu = ref("home");

// navigate helper for dynamic views to emit back to parent
function navigateTo(view: string) {
    activeMenu.value = view;
}

const currentView = computed(() => {
    const menu = activeMenu.value;
    if (menu.startsWith("system-detail-")) {
        return SystemDetailView;
    }
    if (menu.startsWith("calc-history-view-")) {
        return CalcResultView;
    }
    switch (menu) {
        case "indicators":
            return IndicatorLibraryView;
        case "indicator-entry":
            return IndicatorEntryView;
        case "weight-allocation":
            return WeightAllocationView;
        case "data-entry":
            return DataEntryView;
        case "calc-result":
            return CalcResultView;
        case "calc-history":
            return HistoricalCalcView;
        case "systems":
            return IndicatorSystemView;
        case "about":
            return AboutView;
        default:
            return HomeView;
    }
});

const componentProps = computed(() => {
    const m = activeMenu.value;
    const props: Record<string, any> = {};
    if (m.startsWith("system-detail-")) {
        props.systemId = Number(m.replace("system-detail-", ""));
    }
    if (m.startsWith("calc-history-view-")) {
        props.recordId = Number(m.replace("calc-history-view-", ""));
    }
    return props;
});

function startCalc() {
    chartStore.clearPending();
    chartStore.clearEvalData();
    chartStore.calcIndicators = [];
    navigateTo("indicator-entry");
}
</script>

<template>
    <n-config-provider :locale="zhCN">
        <n-dialog-provider>
            <n-message-provider>
                <div class="app">
                    <AppBanner
                        :loading="chartStore.loading"
                        :current-file="chartStore.currentFile"
                        @start-calc="startCalc"
                    />

                    <div class="app-body">
                        <SideMenu v-model:active="activeMenu" :menus="menus" />

                        <main class="content">
                            <n-alert
                                v-if="chartStore.error"
                                type="error"
                                closable
                                style="margin-bottom: 16px"
                                @close="chartStore.error = null"
                            >
                                {{ chartStore.error }}
                            </n-alert>

                            <n-spin
                                :show="chartStore.loading"
                                style="height: 100%"
                            >
                                <div class="view-transition-wrap">
                                    <Transition name="view">
                                        <component
                                            :is="currentView"
                                            :key="activeMenu"
                                            v-bind="componentProps"
                                            @navigate="navigateTo"
                                        />
                                    </Transition>
                                </div>
                            </n-spin>
                        </main>
                    </div>
                </div>
            </n-message-provider>
        </n-dialog-provider>
    </n-config-provider>
</template>

<style scoped>
.app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
}

.app-body {
    display: flex;
    flex: 1;
    min-height: 0;
}

.content {
    flex: 1;
    min-width: 0;
    padding: 20px;
    overflow-y: scroll;
    overflow-x: hidden;
    background: #f5f7fa;
}

/* 让滚动条更美观 */
.content::-webkit-scrollbar {
    width: 6px;
}
.content::-webkit-scrollbar-track {
    background: transparent;
}
.content::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 3px;
}
.content::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.25);
}

/* 过渡动画：离开元素 absolute 出流，进入元素正常流入，避免空白间隙 */
.view-transition-wrap {
    position: relative;
    height: 100%;
}

/* 过渡期间阻止子元素滚动，防止 scrollbar 闪烁 */
.view-enter-active,
.view-leave-active {
    overflow: hidden;
}

.view-enter-active {
    transition:
        opacity 0.25s ease,
        transform 0.25s ease;
}

.view-leave-active {
    transition:
        opacity 0.2s ease,
        transform 0.2s ease;
    position: absolute;
    width: 100%;
    left: 0;
    top: 0;
}

.view-enter-from {
    opacity: 0;
    transform: translateX(24px);
}

.view-leave-to {
    opacity: 0;
    transform: translateX(-12px);
}
</style>
