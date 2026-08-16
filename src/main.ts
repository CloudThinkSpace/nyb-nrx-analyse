import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import VChart from './plugins/echarts'

const app = createApp(App)
app.use(createPinia())
app.component('VChart', VChart)
app.mount('#app')