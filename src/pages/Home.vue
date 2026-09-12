<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { stats, settings } from '../store'
import ComingSoonModal from '../components/ComingSoonModal.vue'

const router = useRouter()
const showMultiplayerModal = ref(false)

const lifetimeAccuracy = computed(() => {
  if (stats.value.lifetimeKeystrokes === 0) return null
  const correct = stats.value.lifetimeKeystrokes - stats.value.lifetimeMistakes
  return Math.max(0, Math.round((correct / stats.value.lifetimeKeystrokes) * 100))
})
</script>

<template>
  <main class="z-10 flex flex-col items-center w-full max-w-2xl mx-auto my-auto gap-8 py-8 sm:py-12 px-4 sm:px-6 transition-all duration-700" :class="[
      { 'blur-sm opacity-40 scale-95 pointer-events-none': showMultiplayerModal },
      settings?.darkMode ? 'text-stone-300' : 'text-stone-800'
    ]">
    <header class="text-center">
      <h1 class="text-5xl sm:text-7xl tracking-[0.35em] uppercase leading-none font-bold" :class="settings?.darkMode ? 'text-stone-100' : 'text-stone-900'">TRACE</h1>
      <p class="mt-3 text-xs uppercase tracking-[0.45em] opacity-70 font-ui-sans">Leave your mark gently</p>
    </header>

    <section class="w-full space-y-4" aria-labelledby="practice-heading">
      <h2 id="practice-heading" class="sr-only">Choose a practice</h2>
      <button aria-describedby="meditation-description" @click="router.push('/meditation')" class="relative isolate w-full min-h-32 p-6 sm:p-8 text-left group hover:scale-[1.01] transition-transform">
        <div class="absolute inset-0 -z-10 rounded-2xl bg-[#DFBE73] opacity-15 group-hover:opacity-20 transition-opacity" style="filter: url(#ink-blot); transform: scale(1.01) rotate(-0.25deg);"></div>
        <div class="relative z-10 flex justify-between gap-5">
          <span class="flex flex-col gap-2">
            <span class="text-[9px] uppercase tracking-[0.3em] font-ui-sans font-semibold" :class="settings?.darkMode ? 'text-[#DFBE73]' : 'text-[#6f4d0f]'">Start here</span>
            <span class="text-xl sm:text-2xl tracking-[0.16em] uppercase font-ui-serif" :class="settings?.darkMode ? 'text-stone-100' : 'text-stone-900'">Begin Meditation</span>
            <span id="meditation-description" class="text-xs sm:text-sm leading-relaxed font-ui-sans normal-case tracking-normal" :class="settings?.darkMode ? 'text-stone-300' : 'text-stone-700'">Practice a seasonal passage at your own pace and build lasting progress.</span>
          </span>
          <span aria-hidden="true" class="text-xl group-hover:translate-x-1 transition-transform" :class="settings?.darkMode ? 'text-[#DFBE73]' : 'text-[#6f4d0f]'">→</span>
        </div>
      </button>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button aria-describedby="daily-description" @click="router.push('/daily')" class="relative isolate min-h-28 p-5 text-left group">
          <div class="absolute inset-0 -z-10 rounded-xl transition-opacity" :class="settings?.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-35 group-hover:opacity-50'" style="filter: url(#ink-blot); transform: rotate(0.2deg);"></div>
          <span class="relative z-10 block text-sm tracking-[0.2em] uppercase font-ui-serif mb-2" :class="settings?.darkMode ? 'text-stone-200' : 'text-stone-900'">Daily Reflection</span>
          <span id="daily-description" class="relative z-10 block text-xs leading-relaxed font-ui-sans normal-case tracking-normal" :class="settings?.darkMode ? 'text-stone-400' : 'text-stone-700'">Complete one shared passage each day and return tomorrow for another.</span>
        </button>
        <button aria-describedby="flow-description" @click="router.push('/flow')" class="relative isolate min-h-28 p-5 text-left group">
          <div class="absolute inset-0 -z-10 rounded-xl transition-opacity" :class="settings?.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-35 group-hover:opacity-50'" style="filter: url(#ink-blot); transform: rotate(-0.2deg);"></div>
          <span class="relative z-10 block text-sm tracking-[0.2em] uppercase font-ui-serif mb-2" :class="settings?.darkMode ? 'text-stone-200' : 'text-stone-900'">Flow State</span>
          <span id="flow-description" class="relative z-10 block text-xs leading-relaxed font-ui-sans normal-case tracking-normal" :class="settings?.darkMode ? 'text-stone-400' : 'text-stone-700'">Choose 50, 100, or 200 words for a continuous punctuation-free session.</span>
        </button>
        <button aria-describedby="multiplayer-description" @click="showMultiplayerModal = true" class="relative isolate min-h-28 p-5 text-left group">
          <div class="absolute inset-0 -z-10 rounded-xl transition-opacity" :class="settings?.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-35 group-hover:opacity-50'" style="filter: url(#ink-blot); transform: rotate(0.15deg);"></div>
          <span class="relative z-10 flex items-center gap-2 mb-2">
            <span class="text-sm tracking-[0.2em] uppercase font-ui-serif" :class="settings?.darkMode ? 'text-stone-200' : 'text-stone-900'">Multiplayer</span>
            <span class="px-2 py-0.5 rounded-full border text-[8px] uppercase tracking-normal font-ui-sans" :class="settings?.darkMode ? 'border-stone-600 text-[#DFBE73]' : 'border-stone-400 text-[#6f4d0f]'">Soon</span>
          </span>
          <span id="multiplayer-description" class="relative z-10 block text-xs leading-relaxed font-ui-sans normal-case tracking-normal" :class="settings?.darkMode ? 'text-stone-400' : 'text-stone-700'">A quiet shared typing experience is being prepared.</span>
        </button>
      </div>
    </section>

    <section class="w-full pt-6 border-t" :class="settings?.darkMode ? 'border-stone-800' : 'border-stone-300'" aria-labelledby="explore-heading">
      <h2 id="explore-heading" class="text-[9px] uppercase tracking-[0.3em] opacity-55 text-center mb-4 font-ui-sans">Explore Trace</h2>
      <nav aria-label="Account and information" class="grid grid-cols-2 sm:grid-cols-4 gap-2 font-ui-sans">
        <button @click="router.push('/profile')" class="relative min-h-11 rounded-lg text-[10px] uppercase tracking-[0.16em] group">
          <div class="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" :class="settings?.darkMode ? 'bg-white/5' : 'bg-stone-300/60'" style="filter: url(#ink-blot);"></div>
          <span class="relative z-10" :class="settings?.darkMode ? 'text-stone-300' : 'text-stone-800'">Profile</span>
        </button>
        <button @click="router.push('/archive')" class="relative min-h-11 rounded-lg text-[10px] uppercase tracking-[0.16em] group">
          <div class="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" :class="settings?.darkMode ? 'bg-white/5' : 'bg-stone-300/60'" style="filter: url(#ink-blot);"></div>
          <span class="relative z-10" :class="settings?.darkMode ? 'text-stone-300' : 'text-stone-800'">Archive</span>
        </button>
        <button @click="router.push('/settings')" class="relative min-h-11 rounded-lg text-[10px] uppercase tracking-[0.16em] group">
          <div class="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" :class="settings?.darkMode ? 'bg-white/5' : 'bg-stone-300/60'" style="filter: url(#ink-blot);"></div>
          <span class="relative z-10" :class="settings?.darkMode ? 'text-stone-300' : 'text-stone-800'">Preferences</span>
        </button>
        <button @click="router.push('/about')" class="relative min-h-11 rounded-lg text-[10px] uppercase tracking-[0.16em] group">
          <div class="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" :class="settings?.darkMode ? 'bg-white/5' : 'bg-stone-300/60'" style="filter: url(#ink-blot);"></div>
          <span class="relative z-10" :class="settings?.darkMode ? 'text-stone-300' : 'text-stone-800'">About</span>
        </button>
      </nav>
    </section>

    <footer class="flex flex-col items-center gap-3">
      <div class="flex gap-12 sm:gap-16 text-[11px] uppercase tracking-[0.25em] font-ui-sans" :class="settings?.darkMode ? 'text-stone-400' : 'text-stone-700'">
        <span class="flex flex-col items-center gap-1"><span class="opacity-45">Passages</span><span>{{ stats.lifetimePassages }}</span></span>
        <span class="flex flex-col items-center gap-1"><span class="opacity-45">Clarity · Accuracy</span><span>{{ lifetimeAccuracy === null ? 'No data' : `${lifetimeAccuracy}%` }}</span></span>
      </div>
      <p v-if="lifetimeAccuracy === null" class="text-[10px] opacity-60">Complete a passage to see your accuracy.</p>
      <p class="sm:hidden text-[10px] text-center uppercase tracking-widest leading-relaxed opacity-50 font-ui-sans">Tap a passage to open your keyboard.<br>Rotate your device if you need more room.</p>
    </footer>
  </main>
  <ComingSoonModal v-if="showMultiplayerModal" @close="showMultiplayerModal = false" />
</template>