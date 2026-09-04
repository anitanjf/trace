<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { stats, settings, currentUser } from '../store'
import { seasons } from '../utils/constants'
import { getRealWorldSeason } from '../utils/helpers'
import AuthModal from '../components/AuthModal.vue'

const router = useRouter()
const showAuthModal = ref(false)

// AUTH GUARD: Triggers instantly without delay
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

const visibleArchiveSeasons = computed(() => {
  return seasons.map((s, index) => ({ ...s, index })).filter(s => {
    return stats.value.seasonal[s.index].passages > 0 || getRealWorldSeason() === s.index
  })
})

const getSeasonAccuracy = (sIdx) => {
  const s = stats.value.seasonal[sIdx]
  if (!s || s.keystrokes === 0) return 100
  const correct = s.keystrokes - s.mistakes
  return Math.max(0, Math.round((correct / s.keystrokes) * 100))
}
</script>

<template>
  <div class="z-10 flex flex-col items-center w-full max-w-4xl px-8 h-screen py-16 relative">
    <h2 class="text-3xl tracking-[0.3em] uppercase font-light mb-4 flex-shrink-0 font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-700'">The Archive</h2>
    <p class="text-xs uppercase tracking-widest opacity-50 mb-12 flex-shrink-0 font-ui-sans" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-500'">A record of your journey</p>
    
    <div class="w-full flex-1 overflow-y-auto no-scrollbar flex flex-col gap-24 px-4 pb-12 mask-fade-edges">
      
      <!-- DATA GUARD: Content physically cannot render unless logged in -->
      <template v-if="currentUser">
        <div v-for="seasonData in visibleArchiveSeasons" :key="'archive-'+seasonData.index" class="flex flex-col items-center w-full animate-fade-in" :style="{ animationDelay: `${seasonData.index * 100}ms` }">
          <div class="flex flex-col items-center w-full mb-8">
            <h3 class="text-xl tracking-[0.4em] uppercase font-semibold mb-4" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">{{ seasonData.name }}</h3>
            <div class="flex gap-8 text-[9px] uppercase tracking-[0.2em] opacity-60 font-ui-sans" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">
              <span>{{ stats.seasonal[seasonData.index].passages }} Passages</span><span>&middot;</span><span>{{ getSeasonAccuracy(seasonData.index) }}% Clarity</span>
            </div>
            <div class="w-24 h-px opacity-30 mt-6" :class="settings.darkMode ? 'bg-stone-600' : 'bg-stone-300'"></div>
          </div>
          <div v-if="stats.seasonal[seasonData.index].quotes.length === 0" class="opacity-40 italic text-xs tracking-wide pb-8 font-ui-sans">No reflections gathered yet in {{ seasonData.name }}.</div>
          <div v-else class="flex flex-col gap-12 w-full max-w-2xl">
            <div v-for="(quote, i) in stats.seasonal[seasonData.index].quotes" :key="i" class="flex flex-col items-center text-center">
              <p class="text-lg leading-relaxed mb-4 font-ui-serif" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-600'">{{ quote.text }}</p>
              <div class="flex items-center gap-4 opacity-50">
                <div class="w-6 h-[1px]" :class="settings.darkMode ? 'bg-stone-600' : 'bg-stone-300'"></div>
                <span class="text-[9px] tracking-[0.2em] uppercase font-ui-sans">{{ quote.author }}</span>
                <div class="w-6 h-[1px]" :class="settings.darkMode ? 'bg-stone-600' : 'bg-stone-300'"></div>
              </div>
            </div>
          </div>
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