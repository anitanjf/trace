<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import TypingBoard from '../components/TypingBoard.vue'
import CompletionStats from '../components/CompletionStats.vue'
import PassageLoader from '../components/PassageLoader.vue'
import AuthModal from '../components/AuthModal.vue'
import { fetchPassages } from '../services/api'
import { stats, settings, currentUser, recordSession, savePassageHistory, checkEnlightenments } from '../store'
import { saveQuoteToArchive } from '../services/firebase'
import { seasons } from '../utils/constants'
import { getRealWorldSeason } from '../utils/helpers'

const router = useRouter()
const quotes = ref([])
const currentIndex = ref(0)
const gameState = ref('loading')
const showAuthModal = ref(false)

const attemptsArray = ref([])
const boardKey = ref(0)
const displayPassageNumber = ref(1) 
const isFirstCompletionOfPassage = ref(true) 
const isCurrentQuoteArchived = ref(false) 

const activeVisualIndex = computed(() => settings.value.themeMode === 'locked' ? (settings.value.lockedSeason || 0) : getRealWorldSeason())
const activeSeason = computed(() => seasons[activeVisualIndex.value] || seasons[0])

const checkAuthGuard = () => {
  if (!currentUser.value && stats.value.lifetimePassages >= 3) {
    showAuthModal.value = true
    return false
  }
  return true
}

const initGame = async () => {
  if (!checkAuthGuard()) return 
  
  gameState.value = 'loading'
  try {
    quotes.value = await fetchPassages()
    
    const seasonalPassageCount = stats.value.seasonal[activeVisualIndex.value]?.passages || 0
    currentIndex.value = seasonalPassageCount % quotes.value.length
    displayPassageNumber.value = seasonalPassageCount + 1
    
    isFirstCompletionOfPassage.value = true
    isCurrentQuoteArchived.value = false
    setTimeout(() => { gameState.value = 'playing' }, 1500)
  } catch (error) {
    console.error("Failed to load passages", error)
  }
}

const handleRestartFromPause = () => {
  gameState.value = 'playing'
  boardKey.value++ 
}

const handleGlobalKey = (e) => {
  if (gameState.value === 'paused' && e.key === 'Enter') {
    handleRestartFromPause()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKey)
  initGame()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKey)
})

watch(currentUser, (newUser) => {
  if (newUser && showAuthModal.value) {
    showAuthModal.value = false
    if (quotes.value.length === 0) initGame() 
    else handleNextPassage() 
  }
})

const handleModalClose = () => {
  showAuthModal.value = false
  if (!currentUser.value && stats.value.lifetimePassages >= 3) router.push('/') 
}

const handlePause = () => { gameState.value = 'paused' }
const handleResume = () => { gameState.value = 'playing' }

const handleCompletion = (results) => {
  attemptsArray.value.push(results)
  const currentS = activeVisualIndex.value
  
  if (isFirstCompletionOfPassage.value) {
    stats.value.lifetimePassages++
    if (!stats.value.seasonal[currentS]) stats.value.seasonal[currentS] = { passages: 0, keystrokes: 0, mistakes: 0, quotes: [] }
    stats.value.seasonal[currentS].passages++
    isFirstCompletionOfPassage.value = false
  }

  stats.value.lifetimeKeystrokes += results.keystrokes
  stats.value.lifetimeMistakes += results.mistakes
  stats.value.seasonal[currentS].keystrokes += results.keystrokes
  stats.value.seasonal[currentS].mistakes += results.mistakes
  
  recordSession()
  checkEnlightenments(results) 
  gameState.value = 'complete'
}

const handleRetryPassage = () => {
  gameState.value = 'playing'
  boardKey.value++ 
}

const proceedToNext = () => {
  if (attemptsArray.value.length > 0) {
    const passageId = `season_${activeVisualIndex.value}_passage_${displayPassageNumber.value}`
    savePassageHistory(passageId, [...attemptsArray.value])
  }

  attemptsArray.value = []
  isFirstCompletionOfPassage.value = true
  isCurrentQuoteArchived.value = false 
  displayPassageNumber.value++ 

  currentIndex.value = (currentIndex.value + 1) % quotes.value.length
  boardKey.value++
  gameState.value = 'playing'
}

const handleNextPassage = () => {
  if (!checkAuthGuard()) return 
  proceedToNext()
}

const handleArchiveQuote = async () => {
  if (!currentUser.value) return
  const currentQuote = quotes.value[currentIndex.value]
  if (!currentQuote) return
  await saveQuoteToArchive(currentUser.value.uid, currentQuote.text, currentQuote.author)
  isCurrentQuoteArchived.value = true 
}
</script>

<template>
  <div class="w-full flex flex-col items-center justify-center relative min-h-screen">
    
    <PassageLoader v-if="gameState === 'loading'" text="Unfolding the path..." />

    <div v-if="gameState === 'paused'" class="fixed inset-0 z-50 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in font-ui-sans" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
      <h3 class="text-4xl tracking-[0.3em] uppercase font-light mb-12 font-ui-serif">Paused</h3>
      <div class="flex flex-col gap-6 w-64 items-center">
        <button @click="handleResume" class="relative px-8 py-3 w-full group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-xs">Resume <span class="opacity-50 ml-1 text-[9px]">(ESC)</span></span></button>
        <button @click="handleRestartFromPause" class="relative px-8 py-3 w-full group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-xs">Restart <span class="opacity-50 ml-1 text-[9px]">(Enter)</span></span></button>
        <button @click="router.push('/')" class="relative px-8 py-3 w-full group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-xs">Quit to Menu</span></button>
      </div>
    </div>

    <TypingBoard 
      v-if="gameState === 'playing' || gameState === 'paused'"
      :isPaused="gameState === 'paused'"
      :key="boardKey"
      :quote="quotes[currentIndex]" 
      :seasonName="activeSeason.name"
      :passageNumber="displayPassageNumber"
      gameMode="infinite"
      @passage-complete="handleCompletion"
      @pause="handlePause"
      @resume="handleResume"
    />

    <CompletionStats 
      v-if="gameState === 'complete'"
      mode="infinite"
      :passageText="quotes[currentIndex]?.text || ''"
      :attempts="attemptsArray"
      :isAlreadyArchived="isCurrentQuoteArchived"
      @retry="handleRetryPassage"
      @next="handleNextPassage"
      @menu="router.push('/')"
      @archive="handleArchiveQuote"
    />

    <AuthModal v-if="showAuthModal" @close="handleModalClose" />
  </div>
</template>