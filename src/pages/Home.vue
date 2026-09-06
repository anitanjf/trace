<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { stats, settings } from '../store'
import ComingSoonModal from '../components/ComingSoonModal.vue'

const router = useRouter()
const showMultiplayerModal = ref(false)

const lifetimeAccuracy = computed(() => {
  if (stats.value.lifetimeKeystrokes === 0) return 100
  const correct = stats.value.lifetimeKeystrokes - stats.value.lifetimeMistakes
  return Math.max(0, Math.round((correct / stats.value.lifetimeKeystrokes) * 100))
})
</script>

<template>
  <div class="z-10 flex flex-col items-center justify-center w-full max-w-md mx-auto my-auto space-y-8 py-6 transition-all duration-700 ease-in-out px-4"
       :class="{ 'blur-sm opacity-40 scale-95 pointer-events-none': showMultiplayerModal }">
       
    <div class="flex flex-col items-center text-center space-y-2">
      <h1 class="text-5xl sm:text-6xl md:text-7xl tracking-[0.35em] uppercase select-none leading-none font-bold" 
          :class="settings?.darkMode ? 'text-stone-100' : 'text-stone-900'" style="font-weight: 700;">TRACE</h1>
      <span class="text-xs uppercase tracking-[0.45em] opacity-70 font-ui-sans pt-1 text-center" 
            :class="settings?.darkMode ? 'text-stone-300' : 'text-stone-700'">Leave your mark gently</span>
      <div class="w-12 h-[1px] opacity-30 bg-current my-2"></div>
    </div>

    <div class="flex flex-col items-center gap-3.5 w-full">
      <button @click="router.push('/meditation')" class="relative w-full py-3.5 px-6 group transition-transform hover:scale-[1.02] flex items-center justify-center">
        <div class="absolute inset-0 rounded-xl transition-opacity" :class="settings?.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div>
        <span class="relative z-10 tracking-[0.25em] uppercase text-xs sm:text-sm font-medium" :class="settings?.darkMode ? 'text-stone-200' : 'text-stone-900'">Begin Meditation</span>
      </button>
      
      <button @click="router.push('/daily')" class="relative w-full py-3.5 px-6 group transition-transform hover:scale-[1.02] flex items-center justify-center">
        <div class="absolute inset-0 rounded-xl transition-opacity" :class="settings?.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div>
        <span class="relative z-10 tracking-[0.25em] uppercase text-xs sm:text-sm font-medium" :class="settings?.darkMode ? 'text-stone-200' : 'text-stone-900'">Daily Reflection</span>
      </button>

      <!-- NEW: Flow State Button -->
      <button @click="router.push('/flow')" class="relative w-full py-3.5 px-6 group transition-transform hover:scale-[1.02] flex items-center justify-center">
        <div class="absolute inset-0 rounded-xl transition-opacity" :class="settings?.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div>
        <span class="relative z-10 tracking-[0.25em] uppercase text-xs sm:text-sm font-medium" :class="settings?.darkMode ? 'text-stone-200' : 'text-stone-900'">Flow State</span>
      </button>

      <button @click="showMultiplayerModal = true" class="relative w-full py-3.5 px-6 group transition-transform hover:scale-[1.02] flex items-center justify-center">
        <div class="absolute inset-0 rounded-xl transition-opacity" :class="settings?.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div>
        <span class="relative z-10 tracking-[0.25em] uppercase text-xs sm:text-sm font-medium flex items-center gap-2" :class="settings?.darkMode ? 'text-stone-300' : 'text-stone-800'">Multiplayer <span class="text-[9px] px-2 py-0.5 rounded-full tracking-normal opacity-70 border font-ui-sans" :class="settings?.darkMode ? 'border-stone-700 bg-stone-900' : 'border-stone-300 bg-white/60'">soon ✦</span></span>
      </button>
    </div>

    <div class="flex flex-wrap gap-4 sm:gap-6 justify-center items-center w-full font-ui-sans">
      <button @click="router.push('/profile')" class="relative px-5 py-2 group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings?.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-[10px]" :class="settings?.darkMode ? 'text-stone-200' : 'text-stone-800'">Profile</span></button>
      <button @click="router.push('/archive')" class="relative px-5 py-2 group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings?.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-[10px]" :class="settings?.darkMode ? 'text-stone-200' : 'text-stone-800'">Archive</span></button>
      <button @click="router.push('/settings')" class="relative px-5 py-2 group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings?.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-[10px]" :class="settings?.darkMode ? 'text-stone-200' : 'text-stone-800'">Preferences</span></button>
      <button @click="router.push('/about')" class="relative px-5 py-2 group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings?.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-[10px]" :class="settings?.darkMode ? 'text-stone-200' : 'text-stone-800'">About</span></button>
    </div>

    <div class="flex justify-center gap-12 sm:gap-16 text-[10px] sm:text-[11px] uppercase tracking-[0.3em] opacity-80 pt-2 font-ui-sans" :class="settings?.darkMode ? 'text-stone-400' : 'text-stone-600'">
      <div class="flex flex-col items-center gap-1"><span class="opacity-40">Passages</span><span class="text-xs font-light">{{ stats.lifetimePassages }}</span></div>
      <div class="flex flex-col items-center gap-1"><span class="opacity-40">Clarity</span><span class="text-xs font-light">{{ lifetimeAccuracy }}%</span></div>
    </div>

    <!-- POETIC MOBILE INDICATOR -->
    <div class="block sm:hidden text-center mt-12 px-6">
      <p class="text-[10px] uppercase tracking-widest leading-relaxed opacity-50 font-ui-sans" :class="settings?.darkMode ? 'text-stone-400' : 'text-stone-500'">
        A tactile canvas invites deeper stillness.<br>This sanctuary is best traversed with a physical keyboard.
      </p>
    </div>

  </div>

  <ComingSoonModal v-if="showMultiplayerModal" @close="showMultiplayerModal = false" />
</template>