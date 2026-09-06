<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import TypingBoard from '../components/TypingBoard.vue'
import CompletionStats from '../components/CompletionStats.vue'
import PassageLoader from '../components/PassageLoader.vue'
import AuthModal from '../components/AuthModal.vue'
import { fetchPassages } from '../services/api'
import { stats, settings, currentUser, recordSession, checkEnlightenments } from '../store' 
import { saveQuoteToArchive } from '../services/firebase' 
import { seasons } from '../utils/constants'
import { getRealWorldSeason } from '../utils/helpers'

const router = useRouter()
const dailyQuote = ref(null)
const gameState = ref('loading') 
const showAuthModal = ref(false)

const attemptsArray = ref([])
const boardKey = ref(0)
const isFirstCompletionOfDay = ref(true)
const isCurrentQuoteArchived = ref(false)

const activeVisualIndex = computed(() => settings.value.themeMode === 'locked' ? (settings.value.lockedSeason || 0) : getRealWorldSeason())
const activeSeason = computed(() => seasons[activeVisualIndex.value] || seasons[0])

const checkAuthGuard = () => {
  if (!currentUser.value) {
    showAuthModal.value = true
    return false
  }
  return true
}

const initGame = async () => {
  if (!checkAuthGuard()) return

  const todaySeed = Math.floor(Date.now() / 86400000)
  
  if (stats.value.lastDailyDate === todaySeed) {
    gameState.value = 'already-completed'
    return
  }

  gameState.value = 'loading'
  try {
    const passages = await fetchPassages()
    const startIndex = todaySeed % (passages.length - 1)
    dailyQuote.value = passages[startIndex]
    isFirstCompletionOfDay.value = true
    isCurrentQuoteArchived.value = false
    setTimeout(() => { gameState.value = 'playing' }, 1500)
  } catch (error) {
    console.error("Failed to load daily passage", error)
  }
}

const handleRestartFromPause = () => {
  gameState.value = 'playing'
  boardKey.value++ 
}

const handleGlobalKey = (e) => {
  if (gameState.value === 'paused') {
    if (e.key === 'Enter') {
      handleRestartFromPause()
    }
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
    initGame() 
  }
})

const handleModalClose = () => {
  showAuthModal.value = false
  if (!currentUser.value) {
    router.push('/') 
  }
}

const handlePause = () => { gameState.value = 'paused' }
const handleResume = () => { gameState.value = 'playing' }

const handleCompletion = (results) => {
  attemptsArray.value.push(results)
  const currentS = activeVisualIndex.value
  
  if (isFirstCompletionOfDay.value) {
    stats.value.lifetimeDaily++ 
    stats.value.lastDailyDate = Math.floor(Date.now() / 86400000)
    
    if (!stats.value.seasonal[currentS]) stats.value.seasonal[currentS] = { passages: 0, keystrokes: 0, mistakes: 0, quotes: [] }
    stats.value.seasonal[currentS].passages++ 
    
    isFirstCompletionOfDay.value = false
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

const handleArchiveQuote = async () => {
  if (!currentUser.value || !dailyQuote.value) return
  await saveQuoteToArchive(currentUser.value.uid, dailyQuote.value.text, dailyQuote.value.author)
  isCurrentQuoteArchived.value = true 
}

const handleReturnToMenu = () => {
  attemptsArray.value = []
  router.push('/')
}
</script>

<template>
  <div class="w-full flex flex-col items-center justify-center relative min-h-screen">
    
    <PassageLoader v-if="gameState === 'loading' && !showAuthModal" text="Preparing the tea..." />

    <div v-if="gameState === 'already-completed'" class="flex flex-col items-center justify-center animate-fade-in z-20 text-center max-w-md px-6">
      <h3 class="text-3xl tracking-[0.3em] uppercase font-light mb-8 font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">Mind Full</h3>
      <p class="text-xl italic font-light leading-relaxed mb-8 font-ui-serif" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-500'">"A cup can only hold so much tea before it overflows."</p>
      <p class="text-[10px] tracking-widest uppercase font-ui-sans opacity-70 mb-12 leading-loose" :class="settings.darkMode ? 'text-stone-500' : 'text-stone-500'">You have already found your clarity for today.<br>Return tomorrow when the mind is empty again.</p>
      <button @click="router.push('/')" class="relative px-8 py-3 group transition-transform hover:scale-105 font-ui-sans">
        <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div>
        <span class="relative z-10 tracking-[0.25em] uppercase text-xs" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">Return to Menu</span>
      </button>
    </div>

    <div v-if="gameState === 'paused'" class="fixed inset-0 z-50 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in font-ui-sans" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
      <h3 class="text-4xl tracking-[0.3em] uppercase font-light mb-12 font-ui-serif">Paused</h3>
      <div class="flex flex-col gap-6 w-64 items-center">
        <button @click="handleResume" class="relative px-8 py-3 w-full group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-xs">Resume <span class="opacity-50 ml-1 text-[9px]">(ESC)</span></span></button>
        <button @click="handleRestartFromPause" class="relative px-8 py-3 w-full group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-xs">Restart <span class="opacity-50 ml-1 text-[9px]">(Enter)</span></span></button>
        <button @click="router.push('/')" class="relative px-8 py-3 w-full group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-xs">Quit to Menu</span></button>
      </div>
    </div>

    <TypingBoard 
      v-if="(gameState === 'playing' || gameState === 'paused') && dailyQuote"
      :isPaused="gameState === 'paused'"
      :key="boardKey"
      :quote="dailyQuote" 
      :seasonName="activeSeason.name"
      :passageNumber="stats.lifetimeDaily + 1" 
      gameMode="daily"
      @passage-complete="handleCompletion"
      @pause="handlePause"
      @resume="handleResume"
    />

    <CompletionStats 
      v-if="gameState === 'complete'"
      mode="daily"
      :passageText="dailyQuote?.text || ''"
      :attempts="attemptsArray"
      :isAlreadyArchived="isCurrentQuoteArchived"
      @retry="handleRetryPassage"
      @menu="handleReturnToMenu"
      @archive="handleArchiveQuote"
    />

    <AuthModal v-if="showAuthModal" @close="handleModalClose" />

  </div>
</template>