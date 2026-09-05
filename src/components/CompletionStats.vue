<script setup>
import { computed, ref } from 'vue'
import { settings } from '../store'

const props = defineProps({
  mode: { type: String, required: true },
  passageText: { type: String, default: '' },
  attempts: { type: Array, default: () => [] },
  isAlreadyArchived: { type: Boolean, default: false } // NEW
})

const emit = defineEmits(['next', 'menu', 'archive', 'retry'])

const showFlawlessWarning = ref(false)

const currentAttempt = computed(() => {
  if (!props.attempts || props.attempts.length === 0) return {}
  return props.attempts[props.attempts.length - 1]
})

const previousAttempt = computed(() => {
  if (!props.attempts || props.attempts.length < 2) return null
  return props.attempts[props.attempts.length - 2]
})

const topMissedLetters = computed(() => {
  if (!currentAttempt.value || !currentAttempt.value.missedLetters) return []
  return Object.entries(currentAttempt.value.missedLetters).sort((a, b) => b[1] - a[1]).slice(0, 4)
})

const getDelta = (stat) => {
  if (!previousAttempt.value || currentAttempt.value[stat] === undefined) return null
  const diff = currentAttempt.value[stat] - previousAttempt.value[stat]
  if (diff === 0) return null
  return {
    value: Math.abs(diff),
    isPositive: diff > 0,
    isImprovement: stat === 'mistakes' ? diff < 0 : diff > 0 
  }
}

const annotatedPassage = computed(() => {
  if (!props.passageText) return []
  return props.passageText.split(' ').map((word, index) => {
    const missedNow = currentAttempt.value.missedIndices?.includes(index)
    const missedBefore = previousAttempt.value?.missedIndices?.includes(index)

    let state = 'perfect' 
    if (missedBefore && !missedNow) state = 'healed'       
    else if (missedNow && !missedBefore) state = 'new-scar'  
    else if (missedNow && missedBefore) state = 'deep-scar'  
    
    return { text: word, state }
  })
})

const requestRetry = () => {
  if (currentAttempt.value.accuracy === 100) {
    showFlawlessWarning.value = true
  } else {
    emit('retry')
  }
}
</script>

<template>
  <div class="flex flex-col items-center animate-fade-in w-full font-ui-sans z-10 relative py-8 sm:py-12 px-4 text-center" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">
    
    <h2 class="text-2xl sm:text-4xl tracking-[0.3em] uppercase font-light mb-2 font-ui-serif">{{ props.mode === 'daily' ? 'Meditation Complete' : 'Passage Complete' }}</h2>
    <p v-if="props.mode === 'daily'" class="italic text-xs sm:text-sm mb-8 tracking-wide" :class="settings.darkMode ? 'text-stone-500' : 'text-stone-600'">Return tomorrow for a new passage.</p>
    <div v-else class="mb-8 sm:mb-12"></div>
    
    <!-- STATS & DELTAS -->
    <div class="flex gap-8 sm:gap-16 mb-8 sm:mb-12 relative">
      <div class="flex flex-col items-center relative">
        <span class="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mb-2 sm:mb-3 opacity-60">Speed</span>
        <span class="text-4xl sm:text-5xl font-light font-ui-serif">{{ currentAttempt.wpm }} <span class="text-sm sm:text-lg opacity-60 font-ui-sans">WPM</span></span>
        <span v-if="getDelta('wpm')" class="absolute -bottom-5 text-xs font-semibold tracking-widest" :class="getDelta('wpm').isImprovement ? 'text-[#DFBE73]' : 'text-red-500/70'">
          {{ getDelta('wpm').isPositive ? '+' : '-' }}{{ getDelta('wpm').value }}
        </span>
      </div>
      
      <div class="w-px h-12 sm:h-16 opacity-40" :class="settings.darkMode ? 'bg-gradient-to-b from-transparent via-stone-500 to-transparent' : 'bg-gradient-to-b from-transparent via-stone-500 to-transparent'"></div>
      
      <div class="flex flex-col items-center relative">
        <span class="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mb-2 sm:mb-3 opacity-60">Clarity</span>
        <span class="text-4xl sm:text-5xl font-light font-ui-serif">{{ currentAttempt.accuracy }}<span class="text-sm sm:text-lg opacity-60 font-ui-sans">%</span></span>
        <span v-if="getDelta('accuracy')" class="absolute -bottom-5 text-xs font-semibold tracking-widest" :class="getDelta('accuracy').isImprovement ? 'text-[#DFBE73]' : 'text-red-500/70'">
          {{ getDelta('accuracy').isPositive ? '+' : '-' }}{{ getDelta('accuracy').value }}%
        </span>
      </div>
    </div>

    <div class="w-24 sm:w-32 h-px opacity-40 mb-8 sm:mb-12 mt-4" :class="settings.darkMode ? 'bg-gradient-to-r from-transparent via-stone-500 to-transparent' : 'bg-gradient-to-r from-transparent via-stone-500 to-transparent'"></div>

    <div v-if="annotatedPassage.length > 0 && currentAttempt.accuracy < 100" class="w-full max-w-2xl flex flex-col items-center mb-12 sm:mb-16">
       <span class="text-[9px] sm:text-[10px] uppercase tracking-[0.4em] mb-6 opacity-60">Passage Reflection</span>
       <div class="flex flex-wrap justify-center gap-x-2 gap-y-1 text-sm sm:text-base font-ui-serif leading-relaxed px-4">
          <span v-for="(word, idx) in annotatedPassage" :key="idx" 
                class="transition-colors duration-500"
                :class="{
                  'opacity-40': word.state === 'perfect',
                  'text-[#DFBE73] font-semibold opacity-100': word.state === 'healed',
                  'text-red-400 opacity-90 underline decoration-wavy decoration-red-500/40 underline-offset-4': word.state === 'new-scar',
                  'text-red-500 font-semibold opacity-100 underline decoration-wavy decoration-red-600/60 underline-offset-4': word.state === 'deep-scar'
                }">
            {{ word.text }}
          </span>
       </div>
       <div v-if="previousAttempt" class="flex gap-6 mt-8 text-[8px] sm:text-[9px] uppercase tracking-[0.2em] font-ui-sans opacity-70">
          <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-[#DFBE73]"></span> Restored</div>
          <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-red-400"></span> Misstep</div>
       </div>
    </div>

    <div v-else class="mb-12 sm:mb-16 flex flex-col items-center text-center px-4">
      <span class="text-xs sm:text-sm italic opacity-80 font-ui-serif text-[#DFBE73]">A flawless journey. The mind is completely still.</span>
    </div>

    <div v-if="topMissedLetters.length > 0" class="w-full max-w-2xl flex flex-col items-center mb-12">
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

    <button 
      @click="emit('archive')" 
      :disabled="props.isAlreadyArchived"
      class="relative px-8 py-3 mb-6 group transition-all duration-500 flex justify-center items-center"
      :class="props.isAlreadyArchived ? 'scale-95 cursor-default' : 'hover:scale-105'"
    >
      <div class="absolute inset-0 rounded-full transition-opacity" 
           :class="[settings.darkMode ? 'bg-[#DFBE73]' : 'bg-[#DFBE73]', props.isAlreadyArchived ? 'opacity-30' : 'opacity-10 group-hover:opacity-25']" 
           style="filter: url(#ink-blot);"></div>
      <span class="relative z-10 tracking-[0.25em] uppercase text-xs transition-colors" 
            :class="props.isAlreadyArchived ? 'text-[#DFBE73]' : (settings.darkMode ? 'text-stone-300' : 'text-stone-900')">
        {{ props.isAlreadyArchived ? 'Preserved in Archive' : 'Preserve in Archive' }}
      </span>
    </button>

    <!-- ACTIONS OR WARNING OVERLAY -->
    <div v-if="showFlawlessWarning" class="flex flex-col items-center justify-center gap-6 w-full max-w-lg mt-4 animate-fade-in p-6 rounded-lg border border-[#DFBE73]/30 bg-[#DFBE73]/5">
      <p class="text-sm font-ui-serif text-[#DFBE73] italic">"The water is perfectly still. A flawless reflection needs no further ripples. Do you truly wish to disturb the surface?"</p>
      <div class="flex gap-4 w-full">
        <button @click="showFlawlessWarning = false" class="relative flex-1 py-3 group transition-transform hover:scale-105">
          <div class="absolute inset-0 rounded-full transition-opacity bg-[#DFBE73] opacity-10 group-hover:opacity-20" style="filter: url(#ink-blot);"></div>
          <span class="relative z-10 tracking-[0.2em] uppercase text-[9px] text-[#DFBE73]">Let It Rest</span>
        </button>
        <button @click="emit('retry')" class="relative flex-1 py-3 group transition-transform hover:scale-105">
          <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div>
          <span class="relative z-10 tracking-[0.2em] uppercase text-[9px] opacity-70" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-900'">Disturb the Surface</span>
        </button>
      </div>
    </div>

    <div v-else class="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 w-full max-w-lg mt-4">
      <button @click="requestRetry" class="relative flex-1 py-3 group transition-transform hover:scale-105">
        <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-10 group-hover:opacity-20' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div>
        <span class="relative z-10 tracking-[0.25em] uppercase text-[10px] sm:text-xs font-semibold" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-900'">Retry Passage</span>
      </button>
      
      <button v-if="props.mode === 'daily'" @click="emit('menu')" class="relative flex-1 py-3 group transition-transform hover:scale-105">
        <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div>
        <span class="relative z-10 tracking-[0.25em] uppercase text-[10px] sm:text-xs" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-900'">Return to Menu</span>
      </button>
      
      <button v-else @click="emit('next')" class="relative flex-1 py-3 group transition-transform hover:scale-105">
        <div class="absolute inset-0 rounded-full transition-opacity bg-[#DFBE73] opacity-20 group-hover:opacity-30" style="filter: url(#ink-blot);"></div>
        <span class="relative z-10 tracking-[0.25em] uppercase text-[10px] sm:text-xs text-[#DFBE73]">Proceed to Next</span>
      </button>
    </div>
    
  </div>
</template>