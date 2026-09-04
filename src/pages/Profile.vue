<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { settings, currentUser, stats } from '../store'
import { logOut } from '../services/firebase'
import AuthModal from '../components/AuthModal.vue'

const router = useRouter()
const showAuthModal = ref(false)

// AUTH GUARD: Triggers instantly
onMounted(() => {
  if (!currentUser.value) showAuthModal.value = true
})

// Auto-close modal if they log in successfully
watch(currentUser, (newUser) => {
  if (newUser) showAuthModal.value = false
})

const handleModalClose = () => {
  showAuthModal.value = false
  // If they refuse to log in, kick them back to the menu
  if (!currentUser.value) {
    router.push('/')
  }
}

const handleLogout = async () => {
  try { 
    await logOut() 
    // Gently return them to the menu upon signing out
    router.push('/')
  } catch (err) { 
    console.error(err) 
  }
}

const lifetimeAccuracy = computed(() => {
  if (stats.value.lifetimeKeystrokes === 0) return 100
  const correct = stats.value.lifetimeKeystrokes - stats.value.lifetimeMistakes
  return Math.max(0, Math.round((correct / stats.value.lifetimeKeystrokes) * 100))
})
</script>

<template>
  <div class="z-10 flex flex-col items-center justify-center w-full max-w-md mx-auto min-h-[85vh] py-8 font-ui-sans">
    <h2 class="text-3xl tracking-[0.3em] uppercase font-light mb-8 flex-shrink-0 font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">Sanctuary</h2>
    
    <div class="w-full flex-1 flex flex-col items-center justify-center gap-8 px-4 pb-8">
      
      <!-- DATA GUARD: Content physically cannot render unless logged in -->
      <template v-if="currentUser">
        <div class="flex flex-col items-center gap-8 w-full">
          <div class="relative w-28 h-28 rounded-full overflow-hidden shadow-lg p-1" :class="settings.darkMode ? 'bg-stone-800' : 'bg-white'">
             <img :src="currentUser.photoURL" alt="Profile" class="w-full h-full rounded-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
             <div class="absolute inset-0 rounded-full opacity-30 pointer-events-none" style="filter: url(#ink-blot);" :class="settings.darkMode ? 'bg-stone-500' : 'bg-stone-300'"></div>
          </div>
          
          <div class="text-center flex flex-col gap-1 mb-2">
            <span class="text-xl tracking-widest font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">{{ currentUser.displayName }}</span>
            <span class="text-[10px] uppercase tracking-[0.2em] opacity-50">{{ currentUser.email }}</span>
          </div>

          <div class="flex gap-8 text-[10px] uppercase tracking-[0.3em] opacity-80 font-ui-sans" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">
            <div class="flex flex-col items-center gap-3"><span class="opacity-50">Meditations</span><span class="text-2xl font-light font-ui-serif">{{ stats.lifetimePassages }}</span></div>
            <div class="w-px h-12 opacity-30" :class="settings.darkMode ? 'bg-stone-500' : 'bg-stone-400'"></div>
            <div class="flex flex-col items-center gap-3"><span class="opacity-50">Reflections</span><span class="text-2xl font-light font-ui-serif">{{ stats.lifetimeDaily }}</span></div>
            <div class="w-px h-12 opacity-30" :class="settings.darkMode ? 'bg-stone-500' : 'bg-stone-400'"></div>
            <div class="flex flex-col items-center gap-3"><span class="opacity-50">Clarity</span><span class="text-2xl font-light font-ui-serif">{{ lifetimeAccuracy }}%</span></div>
          </div>

          <button @click="handleLogout" class="relative px-6 py-2 mt-8 group transition-transform hover:scale-105">
            <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div>
            <span class="relative z-10 tracking-[0.25em] uppercase text-[10px]" :class="settings.darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-stone-900'">Sign Out</span>
          </button>
        </div>
      </template>

    </div>

    <!-- Only show this button if the auth modal is NOT open -->
    <button v-if="!showAuthModal" @click="router.push('/')" class="relative px-8 py-3 group transition-transform hover:scale-105 mt-12 font-ui-sans">
        <div class="absolute inset-0 rounded-full transition-opacity" 
            :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" 
            style="filter: url(#ink-blot);"></div>
        <span class="relative z-10 tracking-[0.25em] uppercase text-xs"
                :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
            Return to Menu
        </span>
    </button>

    <!-- AUTHENTICATION WALL -->
    <AuthModal v-if="showAuthModal" @close="handleModalClose" />
  </div>
</template>