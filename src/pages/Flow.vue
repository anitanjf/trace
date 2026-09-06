<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import TypingBoard from '../components/TypingBoard.vue'
import CompletionStats from '../components/CompletionStats.vue'
import AuthModal from '../components/AuthModal.vue'
import PassageLoader from '../components/PassageLoader.vue'
import { settings, currentUser } from '../store'
import { seasons } from '../utils/constants'
import { getRealWorldSeason } from '../utils/helpers'
import { fetchPassages } from '../services/api' // <-- Bring in your API!

const router = useRouter()
const gameState = ref('loading') // loading -> menu -> playing -> paused -> complete
const showAuthModal = ref(false)

const boardKey = ref(0)
const attemptsArray = ref([])
const generatedQuote = ref(null)
const selectedWordCount = ref(50)
const sourceQuotes = ref([]) // Holds the real quotes

const activeVisualIndex = computed(() => settings.value.themeMode === 'locked' ? (settings.value.lockedSeason || 0) : getRealWorldSeason())
const activeSeason = computed(() => seasons[activeVisualIndex.value] || seasons[0])

// 1. Fetch real quotes when the page loads
onMounted(async () => {
  window.addEventListener('keydown', handleGlobalKey)
  sourceQuotes.value = await fetchPassages()
  gameState.value = 'menu'
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKey)
})

const generatePassage = (count) => {
  const shuffled = [...sourceQuotes.value].sort(() => 0.5 - Math.random())
  let combinedText = ""

  for (const q of shuffled) {
    combinedText += q.text + " "
    if (combinedText.split(' ').length > count + 10) break
  }

  // Forcefully strip all punctuation including apostrophes for Flow mode
  const streamOfConsciousness = combinedText.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim()
  const finalWords = streamOfConsciousness.split(' ').slice(0, count).join(' ')

  let poeticAuthor = "A Passing Stream"
  if (count === 50) poeticAuthor = "A Short Breath"
  if (count === 100) poeticAuthor = "A Steady Breath"
  if (count === 200) poeticAuthor = "A Deep Exhale"

  return {
    text: finalWords,
    author: poeticAuthor
  }
}

const startFlow = (count) => {
  selectedWordCount.value = count
  generatedQuote.value = generatePassage(count)
  attemptsArray.value = []
  boardKey.value++
  gameState.value = 'playing'
}

const handleRestartFromPause = () => {
  generatedQuote.value = generatePassage(selectedWordCount.value)
  gameState.value = 'playing'
  boardKey.value++ 
}

const handleGlobalKey = (e) => {
  if (gameState.value === 'paused' && e.key === 'Enter') {
    handleRestartFromPause()
  }
}

const handlePause = () => { gameState.value = 'paused' }
const handleResume = () => { gameState.value = 'playing' }

const handleCompletion = (results) => {
  attemptsArray.value.push(results)
  gameState.value = 'complete'
}

const handleRetry = () => {
  generatedQuote.value = generatePassage(selectedWordCount.value)
  gameState.value = 'playing'
  boardKey.value++ 
}
</script>

<template>
  <div class="w-full flex flex-col items-center justify-center relative min-h-screen">

    <PassageLoader v-if="gameState === 'loading'" text="Gathering thoughts..." />

<!-- FLOW MENU SELECTION -->
    <div v-if="gameState === 'menu'" class="flex flex-col items-center animate-fade-in z-20 w-full max-w-md px-6">
      <h3 class="text-2xl sm:text-3xl tracking-[0.3em] uppercase font-light mb-4 font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">Enter Flow</h3>
      <p class="text-[9px] sm:text-[10px] tracking-widest uppercase font-ui-sans opacity-50 mb-12 text-center leading-loose">
        A continuous stream of consciousness.<br>No punctuation, no capital letters.
      </p>
      
      <div class="flex flex-col gap-4 w-full items-center font-ui-sans">
        
      <!-- SHORT BREATH -->
        <button @click="startFlow(50)" class="relative py-4 px-6 w-full max-w-[260px] group transition-transform hover:scale-[1.02] flex flex-col items-center justify-center gap-1.5">
          <div class="absolute inset-0 rounded-3xl transition-opacity duration-500" 
               :class="settings.darkMode ? 'bg-white opacity-[0.03] group-hover:opacity-[0.08]' : 'bg-stone-300 opacity-20 group-hover:opacity-40'" 
               style="filter: url(#ink-blot);"></div>
          <span class="relative z-10 tracking-[0.25em] uppercase text-[10px] font-semibold transition-colors duration-500" 
                :class="settings.darkMode ? 'text-stone-300 group-hover:text-stone-100' : 'text-stone-700 group-hover:text-stone-900'">Short Breath</span>
          <span class="relative z-10 text-[7px] tracking-[0.3em] uppercase transition-opacity duration-500"
                :class="settings.darkMode ? 'opacity-40 group-hover:opacity-70 text-stone-300' : 'opacity-50 group-hover:opacity-80 text-stone-600'">50 Words</span>
        </button>
        
        <!-- STEADY BREATH -->
        <button @click="startFlow(100)" class="relative py-4 px-6 w-full max-w-[260px] group transition-transform hover:scale-[1.02] flex flex-col items-center justify-center gap-1.5">
          <div class="absolute inset-0 rounded-3xl transition-opacity duration-500" 
               :class="settings.darkMode ? 'bg-white opacity-[0.03] group-hover:opacity-[0.08]' : 'bg-stone-300 opacity-20 group-hover:opacity-40'" 
               style="filter: url(#ink-blot);"></div>
          <span class="relative z-10 tracking-[0.25em] uppercase text-[10px] font-semibold transition-colors duration-500" 
                :class="settings.darkMode ? 'text-stone-300 group-hover:text-stone-100' : 'text-stone-700 group-hover:text-stone-900'">Steady Breath</span>
          <span class="relative z-10 text-[7px] tracking-[0.3em] uppercase transition-opacity duration-500"
                :class="settings.darkMode ? 'opacity-40 group-hover:opacity-70 text-stone-300' : 'opacity-50 group-hover:opacity-80 text-stone-600'">100 Words</span>
        </button>

        <!-- DEEP EXHALE -->
        <button @click="startFlow(200)" class="relative py-4 px-6 w-full max-w-[260px] group transition-transform hover:scale-[1.02] flex flex-col items-center justify-center gap-1.5">
          <div class="absolute inset-0 rounded-3xl transition-opacity duration-500" 
               :class="settings.darkMode ? 'bg-white opacity-[0.03] group-hover:opacity-[0.08]' : 'bg-stone-300 opacity-20 group-hover:opacity-40'" 
               style="filter: url(#ink-blot);"></div>
          <span class="relative z-10 tracking-[0.25em] uppercase text-[10px] font-semibold transition-colors duration-500" 
                :class="settings.darkMode ? 'text-stone-300 group-hover:text-stone-100' : 'text-stone-700 group-hover:text-stone-900'">Deep Exhale</span>
          <span class="relative z-10 text-[7px] tracking-[0.3em] uppercase transition-opacity duration-500"
                :class="settings.darkMode ? 'opacity-40 group-hover:opacity-70 text-stone-300' : 'opacity-50 group-hover:opacity-80 text-stone-600'">200 Words</span>
        </button>

        <!-- DELICATE DIVIDER -->
        <div class="w-12 h-[1px] my-4 opacity-20" :class="settings.darkMode ? 'bg-stone-400' : 'bg-stone-500'"></div>

        <!-- RETURN BUTTON -->
        <button @click="router.push('/')" class="relative px-8 py-3 group transition-transform hover:scale-105">
          <div class="absolute inset-0 rounded-full transition-opacity duration-500" 
               :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" 
               style="filter: url(#ink-blot);"></div>
          <span class="relative z-10 tracking-[0.25em] uppercase text-[9px] font-semibold transition-colors" 
                :class="settings.darkMode ? 'text-stone-400 group-hover:text-stone-300' : 'text-stone-600 group-hover:text-stone-800'">Return</span>
        </button>
      </div>
    </div>

    <!-- PAUSE MENU -->
    <div v-if="gameState === 'paused'" class="fixed inset-0 z-50 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in font-ui-sans" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
      <h3 class="text-4xl tracking-[0.3em] uppercase font-light mb-12 font-ui-serif">Paused</h3>
      <div class="flex flex-col gap-6 w-64 items-center">
        <button @click="handleResume" class="relative px-8 py-3 w-full group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-xs">Resume <span class="opacity-50 ml-1 text-[9px]">(ESC)</span></span></button>
        <button @click="handleRestartFromPause" class="relative px-8 py-3 w-full group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-xs">Restart <span class="opacity-50 ml-1 text-[9px]">(Enter)</span></span></button>
        <button @click="gameState = 'menu'" class="relative px-8 py-3 w-full group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-xs">Back to Menu</span></button>
      </div>
    </div>

    <!-- TYPING BOARD -->
    <TypingBoard 
      v-if="(gameState === 'playing' || gameState === 'paused') && generatedQuote"
      :isPaused="gameState === 'paused'"
      :key="boardKey"
      :quote="generatedQuote" 
      :seasonName="activeSeason.name"
      :passageNumber="selectedWordCount" 
      gameMode="flow"
      @passage-complete="handleCompletion"
      @pause="handlePause"
      @resume="handleResume"
    />

    <!-- COMPLETION STATS -->
    <CompletionStats 
      v-if="gameState === 'complete'"
      mode="flow"
      :passageText="generatedQuote.text"
      :attempts="attemptsArray"
      :isAlreadyArchived="true" 
      @retry="handleRetry"
      @next="gameState = 'menu'"
      @menu="router.push('/')"
    />

    <AuthModal v-if="showAuthModal" @close="showAuthModal = false" />
  </div>
</template>