<script setup>
import { computed } from 'vue'
import { settings } from '../store'
import InkButton from './ui/InkButton.vue'

const props = defineProps({
  mode: { type: String, required: true },
  passageText: { type: String, default: '' },
  attempts: { type: Array, default: () => [] }
})

const emit = defineEmits(['next', 'menu', 'retry'])


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

const requestRetry = () => emit('retry')
</script>

<template>
  <div class="flex flex-col items-center animate-fade-in w-full font-ui-sans z-10 relative py-16 sm:py-24 px-4 text-center overflow-y-auto no-scrollbar" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">
    
    <div class="flex flex-col items-center w-full max-w-4xl pb-24">
      <h2 class="text-2xl sm:text-4xl tracking-[0.3em] uppercase font-light mb-2 font-ui-serif">
        {{ props.mode === 'daily' ? 'Meditation Complete' : 'Passage Complete' }}
      </h2>
      <p v-if="props.mode === 'daily'" class="italic text-xs sm:text-sm mb-8 tracking-wide" :class="settings.darkMode ? 'text-stone-500' : 'text-stone-600'">Return tomorrow for a new passage.</p>
      <p v-else-if="props.mode === 'flow'" class="italic text-xs sm:text-sm mb-8 tracking-wide opacity-60">Your rhythm has settled.</p>
      <div v-else class="mb-8 sm:mb-12"></div>
      
      <!-- STATS & DELTAS -->
      <div class="flex gap-8 sm:gap-16 mb-8 sm:mb-12 relative">
        <div class="flex flex-col items-center relative">
          <span class="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mb-2 sm:mb-3 opacity-60">Speed</span>
          <span class="text-4xl sm:text-5xl font-light font-ui-serif">{{ currentAttempt.wpm }} <span class="text-sm sm:text-lg opacity-60 font-ui-sans">WPM</span></span>
          <span v-if="getDelta('wpm')" class="absolute -bottom-5 text-xs font-semibold tracking-widest" :class="getDelta('wpm').isImprovement ? '' : 'text-red-500/70'" :style="getDelta('wpm').isImprovement ? { color: 'var(--trace-season-accent)' } : {}">
            {{ getDelta('wpm').isPositive ? '+' : '-' }}{{ getDelta('wpm').value }}
          </span>
        </div>
        
        <div class="w-px h-12 sm:h-16 opacity-40" :class="settings.darkMode ? 'bg-gradient-to-b from-transparent via-stone-500 to-transparent' : 'bg-gradient-to-b from-transparent via-stone-500 to-transparent'"></div>
        
        <div class="flex flex-col items-center relative">
          <span class="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mb-2 sm:mb-3 opacity-60">Clarity · Accuracy</span>
          <span class="text-4xl sm:text-5xl font-light font-ui-serif">{{ currentAttempt.accuracy }}<span class="text-sm sm:text-lg opacity-60 font-ui-sans">%</span></span>
          <span v-if="getDelta('accuracy')" class="absolute -bottom-5 text-xs font-semibold tracking-widest" :class="getDelta('accuracy').isImprovement ? '' : 'text-red-500/70'" :style="getDelta('accuracy').isImprovement ? { color: 'var(--trace-season-accent)' } : {}">
            {{ getDelta('accuracy').isPositive ? '+' : '-' }}{{ getDelta('accuracy').value }}%
          </span>
        </div>
      </div>
      <p class="text-[10px] sm:text-xs opacity-60 mb-8 sm:mb-12">WPM counts five typed characters as one word.</p>

      <div class="w-24 sm:w-32 h-px opacity-40 mb-8 sm:mb-12 mt-4" :class="settings.darkMode ? 'bg-gradient-to-r from-transparent via-stone-500 to-transparent' : 'bg-gradient-to-r from-transparent via-stone-500 to-transparent'"></div>

      <!-- FULL PAGE PASSAGE REFLECTION -->
      <div v-if="annotatedPassage.length > 0 && currentAttempt.accuracy < 100" class="w-full max-w-3xl flex flex-col items-center mb-12 sm:mb-16">
         <span class="text-[9px] sm:text-[10px] uppercase tracking-[0.4em] mb-6 opacity-60">Passage Reflection</span>
         
         <div class="w-full px-4 sm:px-8 py-6 border-y" :class="settings.darkMode ? 'border-stone-800' : 'border-stone-300'">
           <div class="flex flex-wrap justify-center gap-x-2 gap-y-1.5 font-ui-serif leading-relaxed text-sm sm:text-base">
              <span v-for="(word, idx) in annotatedPassage" :key="idx" 
                    class="transition-colors duration-500"
                    :class="{
                      'opacity-40': word.state === 'perfect',
                      'font-semibold opacity-100': word.state === 'healed',
                      'text-red-400 opacity-90 underline decoration-wavy decoration-red-500/40 underline-offset-4': word.state === 'new-scar',
                      'text-red-500 font-semibold opacity-100 underline decoration-wavy decoration-red-600/60 underline-offset-4': word.state === 'deep-scar'
                    }"
                    :style="word.state === 'healed' ? { color: 'var(--trace-season-accent)' } : {}">
                {{ word.text }}
              </span>
           </div>
         </div>

         <div v-if="previousAttempt" class="flex gap-6 mt-8 text-[8px] sm:text-[9px] uppercase tracking-[0.2em] font-ui-sans opacity-70">
            <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full" :style="{ backgroundColor: 'var(--trace-season-accent)' }"></span> Restored</div>
            <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-red-400"></span> Misstep</div>
         </div>
      </div>

      <div v-else class="mb-12 sm:mb-16 flex flex-col items-center text-center px-4">
        <span class="text-xs sm:text-sm italic opacity-80 font-ui-serif" :style="{ color: 'var(--trace-season-accent)' }">No typing errors in this attempt.</span>
      </div>

      <!-- TANGLED KEYS -->
      <div v-if="topMissedLetters.length > 0" class="w-full max-w-2xl flex flex-col items-center mb-8">
        <span class="text-[8px] sm:text-[9px] uppercase tracking-widest mb-4 sm:mb-6 opacity-60">Tangled Keys</span>
        <div class="flex gap-6 sm:gap-8">
          <div v-for="[letter, count] in topMissedLetters" :key="letter" class="flex flex-col items-center gap-1 relative">
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-[-1] opacity-40">
                <div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full" style="filter: url(#ink-blot);" :style="{ backgroundColor: 'var(--trace-season-ink)', transform: `scale(${Math.random() * 0.3 + 1.2}) rotate(${Math.random() * 360}deg)` }"></div>
            </div>
            <span class="text-2xl sm:text-3xl font-light transition-colors relative z-10 font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">{{ letter }}</span>
            <span class="text-[9px] sm:text-[10px] opacity-60 tracking-widest">{{ count }}x</span>
          </div>
        </div>
      </div>

      <!-- ACTIONS -->
      <div class="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 w-full max-w-lg mt-4">
        <InkButton variant="soft" block class="flex-1 text-[10px] sm:text-xs uppercase tracking-[0.2em] font-semibold" :style="{ color: 'var(--trace-season-accent)' }" aria-label="Retry this passage" @click="requestRetry">Retry Passage</InkButton>
        <InkButton v-if="props.mode === 'daily'" variant="primary" block class="flex-1 text-[10px] sm:text-xs uppercase tracking-[0.2em]" aria-label="Return to the main menu" @click="emit('menu')">Return to Menu</InkButton>
        <InkButton v-else-if="props.mode === 'flow'" variant="primary" block class="flex-1 text-[10px] sm:text-xs uppercase tracking-[0.2em]" aria-label="Return to the main menu" @click="emit('next')">Return to Menu</InkButton>
        <InkButton v-else variant="primary" block class="flex-1 text-[10px] sm:text-xs uppercase tracking-[0.2em]" @click="emit('next')">Proceed to Next</InkButton>
      </div>
    </div>
    
  </div>
</template>
