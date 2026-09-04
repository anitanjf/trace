<script setup>
import { useRouter } from 'vue-router'
import { settings } from '../store'
const router = useRouter()
</script>

<template>
  <div class="z-10 flex flex-col items-center text-center w-full max-w-lg px-8">
    <h2 class="text-3xl tracking-[0.3em] uppercase font-light mb-8 font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">About</h2>
    <p class="text-sm leading-relaxed mb-16 tracking-wide font-ui-sans" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">Trace is a minimalist typing experience designed to encourage flow state and mindfulness. There is no failing, no ticking clock, and no leaderboards. Type at your own pace, breathe, and enjoy the wisdom.</p>
    <button @click="router.push('/')" class="relative px-8 py-3 group transition-transform hover:scale-105 font-ui-sans">
      <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div>
      <span class="relative z-10 tracking-[0.25em] uppercase text-xs" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-900'">Return to Menu</span>
    </button>
  </div>
</template>