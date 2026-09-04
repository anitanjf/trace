<script setup>
import { computed } from 'vue'
import { settings } from '../store'

const props = defineProps({
  mode: { type: String, required: true },
  statsData: { type: Object, required: true }
})

const emit = defineEmits(['next', 'menu'])

const topMissedLetters = computed(() => {
  if (!props.statsData || !props.statsData.missedLetters) return []
  return Object.entries(props.statsData.missedLetters).sort((a, b) => b[1] - a[1]).slice(0, 4)
})

const missedWordsArray = computed(() => {
  if (!props.statsData || !props.statsData.missedWords) return []
  return Array.from(props.statsData.missedWords).slice(0, 8)
})
</script>

<template>
  <div class="flex flex-col items-center animate-fade-in w-full font-ui-sans z-10 relative py-8 sm:py-12 px-4 text-center" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">
    
    <h2 class="text-2xl sm:text-4xl tracking-[0.3em] uppercase font-light mb-2 font-ui-serif">{{ props.mode === 'daily' ? 'Meditation Complete' : 'Passage Complete' }}</h2>
    <p v-if="props.mode === 'daily'" class="italic text-xs sm:text-sm mb-8 tracking-wide" :class="settings.darkMode ? 'text-stone-500' : 'text-stone-600'">Return tomorrow for a new passage.</p>
    <div v-else class="mb-8 sm:mb-12"></div>
    
    <div class="flex gap-8 sm:gap-16 mb-8 sm:mb-12">
      <div class="flex flex-col items-center"><span class="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mb-2 sm:mb-3 opacity-60">Speed</span><span class="text-4xl sm:text-5xl font-light font-ui-serif">{{ props.statsData.wpm }} <span class="text-sm sm:text-lg opacity-60 font-ui-sans">WPM</span></span></div>
      <div class="w-px h-12 sm:h-16 opacity-40" :class="settings.darkMode ? 'bg-gradient-to-b from-transparent via-stone-500 to-transparent' : 'bg-gradient-to-b from-transparent via-stone-500 to-transparent'"></div>
      <div class="flex flex-col items-center"><span class="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mb-2 sm:mb-3 opacity-60">Clarity</span><span class="text-4xl sm:text-5xl font-light font-ui-serif">{{ props.statsData.accuracy }}<span class="text-sm sm:text-lg opacity-60 font-ui-sans">%</span></span></div>
    </div>

    <div class="w-24 sm:w-32 h-px opacity-40 mb-8 sm:mb-12" :class="settings.darkMode ? 'bg-gradient-to-r from-transparent via-stone-500 to-transparent' : 'bg-gradient-to-r from-transparent via-stone-500 to-transparent'"></div>

    <div v-if="topMissedLetters.length > 0 || missedWordsArray.length > 0" class="w-full max-w-2xl flex flex-col items-center mb-12 sm:mb-16">
       <span class="text-[9px] sm:text-[10px] uppercase tracking-[0.4em] mb-8 opacity-60">Session Reflection</span>
       <div class="flex flex-col sm:flex-row w-full justify-center gap-10 sm:gap-16">
         
         <div class="flex flex-col items-center sm:w-1/2" v-if="topMissedLetters.length > 0">
           <span class="text-[8px] sm:text-[9px] uppercase tracking-widest mb-4 sm:mb-6 opacity-60">Tangled Keys</span>
           <div class="flex gap-6 sm:gap-8">
             <div v-for="[letter, count] in topMissedLetters" :key="letter" class="flex flex-col items-center gap-1 relative">
               <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-[-1] opacity-40">
                  <div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#DFBE73]" style="filter: url(#ink-blot);" :style="{ transform: `scale(${Math.random() * 0.3 + 1.2}) rotate(${Math.random() * 360}deg)` }"></div>
               </div>
               <span class="text-2xl sm:text-3xl font-light transition-colors relative z-10 font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">{{ letter }}</span>
               <span class="text-[9px] sm:text-[10px] opacity-60 tracking-widest">{{ count }}x</span>
             </div>
           </div>
         </div>
         
         <div class="w-16 h-px sm:w-px sm:h-16 opacity-40 self-center" :class="settings.darkMode ? 'bg-gradient-to-r sm:bg-gradient-to-b from-transparent via-stone-500 to-transparent' : 'bg-gradient-to-r sm:bg-gradient-to-b from-transparent via-stone-500 to-transparent'" v-if="topMissedLetters.length > 0 && missedWordsArray.length > 0"></div>
         
         <div class="flex flex-col items-center sm:w-1/2" v-if="missedWordsArray.length > 0">
           <span class="text-[8px] sm:text-[9px] uppercase tracking-widest mb-4 sm:mb-6 opacity-60">Slipped Words</span>
           <div class="flex flex-wrap justify-center gap-x-3 gap-y-2 sm:gap-x-5 sm:gap-y-4 max-w-[280px]">
             <span v-for="word in missedWordsArray" :key="word" class="relative text-xs sm:text-sm font-light transition-colors tracking-wide px-2 py-0.5 font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-900'">
               <div class="absolute inset-0 rounded-sm opacity-[0.25] pointer-events-none z-[-1] bg-[#DFBE73]" style="filter: url(#ink-blot);"></div>
               <span class="relative z-10">{{ word }}</span>
             </span>
             <span v-if="props.statsData.missedWords.size > 8" class="text-xs sm:text-sm opacity-60">...</span>
           </div>
         </div>
       </div>
    </div>
    
    <div v-else class="mb-12 sm:mb-16 flex flex-col items-center text-center px-4"><span class="text-xs sm:text-sm italic opacity-80 font-ui-serif" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">A flawless journey. The mind was perfectly still.</span></div>

    <button v-if="props.mode === 'daily'" @click="emit('menu')" class="relative px-8 py-3 group transition-transform hover:scale-105">
      <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div>
      <span class="relative z-10 tracking-[0.25em] uppercase text-xs" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-900'">Return to Menu</span>
    </button>
    <button v-else @click="emit('next')" class="relative px-8 py-3 group transition-transform hover:scale-105">
      <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div>
      <span class="relative z-10 tracking-[0.25em] uppercase text-xs" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-900'">Proceed to Next</span>
    </button>
  </div>
</template>