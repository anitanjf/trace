import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { initStore } from './store'

initStore() // Boot up local storage and theme settings
createApp(App).use(router).mount('#app')