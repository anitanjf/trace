import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import Meditation from '../pages/Meditation.vue'
import Daily from '../pages/Daily.vue'
import Archive from '../pages/Archive.vue'
import Settings from '../pages/Settings.vue'
import About from '../pages/About.vue'
import Profile from '../pages/Profile.vue' // Import Profile

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/meditation', name: 'Meditation', component: Meditation },
  { path: '/daily', name: 'Daily', component: Daily },
  { path: '/archive', name: 'Archive', component: Archive },
  { path: '/settings', name: 'Settings', component: Settings },
  { path: '/about', name: 'About', component: About },
  { path: '/profile', name: 'Profile', component: Profile } // Map Profile Route
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router