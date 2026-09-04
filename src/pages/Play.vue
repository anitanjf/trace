<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { stats, settings } from '../store'
import { seasons } from '../utils/constants'
import { getRealWorldSeason } from '../utils/helpers'
import { fetchPassages } from '../services/api'

const route = useRoute()
const router = useRouter()

const gameState = ref('loading') 
const gameMode = ref(route.query.mode || 'infinite') 
const currentPoemIndex = ref(0)
const isTransitioning = ref(false)
const isEntering = ref(false)
const isKintsugi = ref(false) 
const activePoems = ref([]) 

// --- METRICS ---
const sessionStartTime = ref(0)
const sessionKeystrokes = ref(0)
const sessionMistakes = ref(0)
const lastWPM = ref(0)
const lastAccuracy = ref(0)
const streak = ref(0) 
const isShaking = ref(false) 
const liveWPM = ref(0)
const isTypingActive = ref(false) 
let typingTimeout = null

const userInputs = ref([])
const typedCount = computed(() => userInputs.value.length)
const missedLetters = ref({})
const missedWords = ref(new Set())
const activeMistakeMarks = ref({}) 
const keystrokeSparks = ref([]) 

// --- GLIDING CURSOR REFS ---
const typingArea = ref(null)
const cursorStyle = ref({ transform: 'translate(0px, 0px)', width: '0px', height: '0px', opacity: 0 })
const cursorAbsoluteX = ref(-1000)
const cursorAbsoluteY = ref(-1000)

// --- COMPUTED PROPERTIES ---
const activeVisualIndex = computed(() => settings.value.themeMode === 'locked' ? (settings.value.lockedSeason || 0) : getRealWorldSeason())
const activeSeason = computed(() => seasons[activeVisualIndex.value] || seasons[0])
const currentQuote = computed(() => activePoems.value[currentPoemIndex.value] || { text: '', author: '' })
const processedQuoteText = computed(() => {
  let text = currentQuote.value.text
  if (settings.value.pureZen) text = text.toLowerCase().replace(/[^\w\s']/g, "").replace(/\s+/g, " ").trim()
  return text
})
const poemCharacters = computed(() => processedQuoteText.value.split(''))

const fontClass = computed(() => {
  switch(settings.value.fontFamily) {
    case 'minimalist': return 'poem-text-minimalist'
    case 'antique': return 'poem-text-antique'
    case 'classic': return 'poem-text-classic'
    case 'modern': return 'poem-text-modern'
    case 'mono': return 'poem-text-mono'
    case 'brush': return 'poem-text-brush'
    case 'sumi': return 'poem-text-sumi'
    case 'calligraphy': default: return 'poem-text-calligraphy'
  }
})

// --- SMART WORD WRAPPER LOGIC ---
const poemWords = computed(() => {
  const words = []
  let currentWord = []
  const chars = poemCharacters.value
  
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === ' ') {
      if (currentWord.length > 0) { words.push(currentWord); currentWord = [] }
      words.push([{ char: ' ', index: i, isSpace: true }])
    } else {
      currentWord.push({ char: chars[i], index: i, isSpace: false })
    }
  }
  if (currentWord.length > 0) words.push(currentWord)
  return words
})

const topMissedLetters = computed(() => Object.entries(missedLetters.value).sort((a, b) => b[1] - a[1]).slice(0, 4))

// --- GUARANTEED INITIALIZATION ---
const initGame = async () => {
  gameState.value = 'loading'
  const dailySeed = gameMode.value === 'daily' ? Math.floor(Date.now() / 86400000) : null
  
  try {
    const passages = await fetchPassages()
    if (dailySeed !== null) {
      const startIndex = dailySeed % (passages.length - 1)
      activePoems.value = passages.slice(startIndex, startIndex + 1)
    } else {
      activePoems.value = passages
      currentPoemIndex.value = stats.value.lifetimePassages % passages.length
    }
    startNewPassage()
  } catch (error) {
    console.error("Trace API Error:", error)
  }
}

// --- LIFECYCLE ---
onMounted(() => {
  window.addEventListener('keydown', handleKey, { passive: false })
  window.addEventListener('resize', updateCursor)
  initGame() // Call explicitly to ensure it runs every time the route mounts
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKey)
  window.removeEventListener('resize', updateCursor)
  clearTimeout(typingTimeout)
})

watch(() => settings.value.pureZen, () => {
  if (gameState.value === 'playing' || gameState.value === 'paused') restartPassage()
})

const updateCursor = async () => {
  await nextTick()
  if (!typingArea.value || (gameState.value !== 'playing' && gameState.value !== 'paused')) {
    cursorStyle.value.opacity = 0
    return
  }
  const spans = typingArea.value.querySelectorAll('.char-span')
  const isEnd = typedCount.value >= poemCharacters.value.length
  const targetIndex = isEnd ? poemCharacters.value.length - 1 : typedCount.value
  const activeSpan = spans[targetIndex]

  if (activeSpan && typingArea.value) {
    const activeRect = activeSpan.getBoundingClientRect()
    const areaRect = typingArea.value.getBoundingClientRect()
    const left = activeRect.left - areaRect.left + (isEnd ? activeRect.width : 0)
    const top = activeRect.top - areaRect.top
    cursorStyle.value = { transform: `translate(${left}px, ${top}px)`, width: `${activeSpan.offsetWidth}px`, height: `${activeSpan.offsetHeight}px`, opacity: gameState.value === 'playing' ? 1 : 0.4 }
    cursorAbsoluteX.value = activeRect.left + (activeRect.width / 2)
    cursorAbsoluteY.value = activeRect.top + (activeRect.height / 2)
  }
}

watch(typedCount, updateCursor)

const startNewPassage = () => {
  missedLetters.value = {}
  missedWords.value = new Set()
  resetPassageMetrics()
  sessionKeystrokes.value = 0
  sessionMistakes.value = 0
  isEntering.value = true
  gameState.value = 'playing'
  updateCursor()
  setTimeout(() => { isEntering.value = false; updateCursor(); }, (currentQuote.value.text.length * 15) + 600)
}

const resetPassageMetrics = () => {
  userInputs.value = []
  streak.value = 0
  liveWPM.value = 0
  isShaking.value = false
  isKintsugi.value = false
  activeMistakeMarks.value = {} 
  sessionStartTime.value = Date.now()
}

const restartPassage = () => { resetPassageMetrics(); gameState.value = 'playing'; updateCursor(); }

const getWordAtIndex = (text, index) => {
  let start = index; while (start > 0 && text[start - 1] !== ' ') start--
  let end = index; while (end < text.length && text[end] !== ' ') end++
  return text.slice(start, end).trim()
}

const handleKey = (e) => {
  if (e.key === 'Escape') {
    if (gameState.value === 'playing') { gameState.value = 'paused'; isTypingActive.value = false; updateCursor(); return } 
    else if (gameState.value === 'paused') { gameState.value = 'playing'; updateCursor(); return }
  }

  if (gameState.value === 'paused' && e.key === 'Enter') { restartPassage(); return }
  if (gameState.value !== 'playing' || isTransitioning.value || isEntering.value || isKintsugi.value) return
  if (e.code === 'Space') e.preventDefault()

  if (e.key === 'Backspace') {
    if (userInputs.value.length > 0) userInputs.value.pop()
    updateCursor()
    return
  }

  if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.key === 'CapsLock' || e.key === 'Tab' || e.key === 'Enter') return
  if (e.key.length !== 1) return

  isTypingActive.value = true
  clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => { isTypingActive.value = false }, 2000)

  if (userInputs.value.length >= poemCharacters.value.length) return

  const currentIndex = userInputs.value.length
  const expectedChar = poemCharacters.value[currentIndex]
  
  sessionKeystrokes.value++
  stats.value.lifetimeKeystrokes++
  userInputs.value.push(e.key)

  if (e.key === expectedChar) {
    streak.value++ 
    if (e.key !== ' ') {
      const sparkId = Date.now() + Math.random()
      keystrokeSparks.value.push({ id: sparkId, x: cursorAbsoluteX.value, y: cursorAbsoluteY.value, rotation: Math.random() * 360 })
      setTimeout(() => { keystrokeSparks.value = keystrokeSparks.value.filter(s => s.id !== sparkId) }, 400)
    }
  } else {
    sessionMistakes.value++
    stats.value.lifetimeMistakes++
    streak.value = 0 
    
    if (!activeMistakeMarks.value[currentIndex]) {
      activeMistakeMarks.value[currentIndex] = { rotate: Math.random() * 360, scale: Math.random() * 0.4 + 0.8 }
    }

    const charToTrack = expectedChar.toLowerCase()
    if (charToTrack !== ' ' && charToTrack.match(/[a-z0-9]/i)) missedLetters.value[charToTrack] = (missedLetters.value[charToTrack] || 0) + 1
    
    const currentWord = getWordAtIndex(processedQuoteText.value, currentIndex)
    if (currentWord) {
      const cleanWord = currentWord.toLowerCase().replace(/[^\w\s']/g, "")
      if (cleanWord.length > 0) missedWords.value.add(cleanWord)
    }
    
    isShaking.value = true
    setTimeout(() => { isShaking.value = false }, 300)
  }

  const minutes = Math.max((Date.now() - sessionStartTime.value) / 60000, 0.01)
  liveWPM.value = Math.round((userInputs.value.length / 5) / minutes)

  if (userInputs.value.length === poemCharacters.value.length) {
    stats.value.lifetimePassages++
    isTypingActive.value = false
    completePoem()
  }
}

const completePoem = () => {
  isKintsugi.value = true 
  const quoteToArchive = activePoems.value[currentPoemIndex.value]
  const currentS = activeVisualIndex.value
  
  if (!stats.value.seasonal[currentS]) stats.value.seasonal[currentS] = { passages: 0, keystrokes: 0, mistakes: 0, quotes: [] }
  stats.value.seasonal[currentS].passages++
  stats.value.seasonal[currentS].keystrokes += sessionKeystrokes.value
  stats.value.seasonal[currentS].mistakes += sessionMistakes.value
  
  const isDuplicate = stats.value.seasonal[currentS].quotes.some(q => q.text === quoteToArchive.text)
  if (!isDuplicate) stats.value.seasonal[currentS].quotes.unshift(quoteToArchive) 
  
  setTimeout(() => {
    isTransitioning.value = true 
    isKintsugi.value = false 
    const sweepDuration = (poemCharacters.value.length * 25) + 1200 
    setTimeout(() => { endPassage() }, sweepDuration) 
  }, 3500) 
}

const transitionToNextPoem = () => {
  isTransitioning.value = false
  isEntering.value = true
  userInputs.value = []
  streak.value = 0
  activeMistakeMarks.value = {} 
  currentPoemIndex.value = (currentPoemIndex.value + 1) % activePoems.value.length
  
  updateCursor()
  setTimeout(() => { isEntering.value = false; updateCursor(); }, (poemCharacters.value.length * 20) + 800)
}

const endPassage = () => {
  const timeInMinutes = Math.max((Date.now() - sessionStartTime.value) / 60000, 0.01)
  const totalChars = currentQuote.value.text.length
  
  lastWPM.value = Math.round((totalChars / 5) / timeInMinutes)
  const correctKeystrokes = sessionKeystrokes.value - sessionMistakes.value
  lastAccuracy.value = Math.max(0, Math.round((correctKeystrokes / sessionKeystrokes.value) * 100))
  
  gameState.value = gameMode.value === 'daily' ? 'daily-complete' : 'passage-complete'
  isTransitioning.value = false
  isEntering.value = false
}

const nextPassage = () => { transitionToNextPoem(); gameState.value = 'playing' }
</script>

<template>
  <div class="z-10 w-full flex flex-col items-center relative py-12 px-6">
    
    <!-- KEYSTROKE SPARKS -->
    <div class="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <div v-for="spark in keystrokeSparks" :key="spark.id" class="absolute flex items-center justify-center animate-ink-puff" :style="{ left: `${spark.x}px`, top: `${spark.y}px` }">
        <div class="w-3 h-3 rounded-full opacity-60" :class="settings.darkMode ? 'bg-stone-300' : 'bg-stone-500'" :style="{ transform: `rotate(${spark.rotation}deg)`, filter: 'url(#ink-blot)' }"></div>
      </div>
    </div>
    
    <div v-if="gameState === 'loading'" class="flex flex-col items-center">
      <div class="relative w-24 h-24 mb-6 flex items-center justify-center">
        <svg class="absolute inset-0 w-full h-full animate-spin" style="animation-duration: 4s;" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'" viewBox="0 0 100 100" fill="none"><path d="M 50,10 C 75,10 90,30 90,50 C 90,75 70,90 50,90 C 25,90 10,70 10,50 C 10,25 30,10 45,12" stroke="currentColor" stroke-width="4" stroke-linecap="round" filter="url(#zen-brush)" pathLength="100" stroke-dasharray="100" class="animate-enso-draw" /></svg>
      </div>
      <p class="italic text-sm tracking-widest uppercase font-ui-sans" :class="settings.darkMode ? 'text-stone-500' : 'text-stone-600'">Gathering thoughts...</p>
    </div>

    <!-- PAUSE OVERLAY -->
    <div v-else-if="gameState === 'paused'" class="fixed inset-0 z-50 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in font-ui-sans" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
      <h3 class="text-4xl tracking-[0.3em] uppercase font-light mb-12 font-ui-serif">Paused</h3>
      <div class="flex flex-col gap-6 w-64 items-center">
        <button @click="gameState = 'playing'; updateCursor()" class="relative px-8 py-3 w-full group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-xs">Resume <span class="opacity-50 ml-1 text-[9px]">(ESC)</span></span></button>
        <button @click="restartPassage" class="relative px-8 py-3 w-full group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-xs">Restart <span class="opacity-50 ml-1 text-[9px]">(Enter)</span></span></button>
        <button @click="router.push('/')" class="relative px-8 py-3 w-full group transition-transform hover:scale-105"><div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div><span class="relative z-10 tracking-[0.25em] uppercase text-xs">Quit to Menu</span></button>
      </div>
    </div>

    <!-- PLAYING CANVAS -->
    <div v-else-if="gameState === 'playing'" class="w-full max-w-4xl flex flex-col items-center">
      <div v-if="settings.showLiveWPM" class="fixed top-12 left-12 text-xs tracking-widest uppercase font-ui-sans transition-all duration-700" :class="[isTypingActive && liveWPM > 0 && !isTransitioning && !isEntering ? 'opacity-50' : 'opacity-0', settings.darkMode ? 'text-stone-400' : 'text-stone-500']">{{ liveWPM }} WPM</div>

      <div class="mb-12 flex flex-col items-center gap-4 w-full transition-opacity duration-1000 font-ui-sans" :class="isTypingActive && !isKintsugi ? 'opacity-0' : 'opacity-100'">
        <span class="text-xs tracking-[0.3em] uppercase transition-colors" :class="settings.darkMode ? 'text-stone-500' : 'text-stone-600'">{{ gameMode === 'daily' ? 'Daily Meditation' : activeSeason.name }} &middot; Passage {{ stats.lifetimePassages + 1 }}</span>
        <div class="w-1/3 h-px relative transition-all duration-1000" :class="settings.darkMode ? 'bg-gradient-to-r from-transparent via-stone-700 to-transparent' : 'bg-gradient-to-r from-transparent via-stone-400 to-transparent'"><div class="absolute top-0 left-0 h-full transition-all duration-1000" :class="settings.darkMode ? 'bg-gradient-to-r from-stone-400 to-stone-400' : 'bg-gradient-to-r from-stone-600 to-stone-600'" :style="{ width: `${(userInputs.length / poemCharacters.length) * 100}%`, maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }"></div></div>
      </div>

      <div class="flex flex-col items-center w-full relative" :class="{'animate-shake': isShaking && userInputs.length < poemCharacters.length}" ref="typingArea">
        <div class="absolute top-0 left-0 z-20 pointer-events-none cursor-glide flex items-end justify-center" :style="cursorStyle">
          <div class="w-full h-full flex items-end justify-center transition-all duration-1000 ease-in-out" :class="isTransitioning || isEntering ? 'opacity-0 blur-md translate-x-12 -translate-y-2 rotate-[15deg]' : 'opacity-100 blur-0 translate-x-0 translate-y-0 rotate-0'">
            <svg width="40" height="15" viewBox="0 0 40 15" class="overflow-visible mb-[-8px] origin-right" :class="settings.darkMode ? 'text-white/70' : 'text-stone-500'"><path d="M -5,10 Q 10,2 20,10 T 45,10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" class="wind-path-1" /><path d="M -10,14 Q 15,16 25,10 T 55,14" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" class="wind-path-2 opacity-60" /></svg>
          </div>
        </div>

        <div class="text-3xl leading-relaxed text-center mb-8 max-w-4xl relative z-10" :class="fontClass">
          <span v-for="(word, wIdx) in poemWords" :key="'w-'+wIdx" :class="{'inline-block whitespace-nowrap': !word[0].isSpace}">
            <template v-for="c in word" :key="c.index">
              <span class="char-span transition-all duration-150 ease-out inline-block rounded-sm relative"
                    :style="{ transitionDelay: isTransitioning ? `${c.index * 25}ms` : (isEntering ? `${(poemCharacters.length - c.index) * 20}ms` : '0ms') }"
                    :class="[
                      c.char === ' ' ? 'w-[0.8em]' : '',
                      isTransitioning ? 'opacity-0 blur-md translate-x-16 -translate-y-8 scale-110 rotate-[12deg]' : 
                      isEntering ? 'opacity-0 blur-sm -translate-x-8 translate-y-4 scale-95 -rotate-[6deg]' : 
                      isKintsugi ? 'opacity-100 blur-0 translate-x-0 translate-y-0 rotate-0 scale-100 ' + (settings.darkMode ? 'text-stone-200' : 'text-stone-800') : 
                      (!isTransitioning && !isEntering && !isKintsugi ? [
                        c.index < typedCount && userInputs[c.index] === c.char ? (settings.darkMode ? 'text-stone-200 opacity-100' : 'text-stone-800 opacity-100') : '',
                        c.index < typedCount && userInputs[c.index] !== c.char ? 'text-red-500/90 opacity-100 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]' : '',
                        c.index > typedCount ? (settings.darkMode ? 'text-stone-500 opacity-40' : 'text-stone-400 opacity-40') : '',
                        c.index === typedCount ? (settings.darkMode ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] animate-blink' : 'text-stone-900 drop-shadow-[0_0_8px_rgba(0,0,0,0.15)] animate-blink') : ''
                      ] : '')
                    ]">
                <div v-if="activeMistakeMarks[c.index]" class="absolute inset-0 flex items-center justify-center pointer-events-none z-[-1] transition-all duration-700 ease-out" :class="[isKintsugi ? 'opacity-100 drop-shadow-[0_0_10px_rgba(223,190,115,0.4)]' : (c.index < typedCount && userInputs[c.index] !== c.char) ? 'opacity-100' : 'opacity-0']">
                  <div class="w-[1.2em] h-[1.2em] rounded-full transition-all duration-700 ease-out" :style="{ transform: `rotate(${activeMistakeMarks[c.index].rotate}deg) scale(${isKintsugi ? activeMistakeMarks[c.index].scale * 1.5 : (c.index < typedCount && userInputs[c.index] !== c.char ? activeMistakeMarks[c.index].scale : 0.5)})`, filter: 'url(#ink-blot)' }" :class="[isKintsugi ? 'bg-[#DFBE73]/90' : (settings.darkMode ? 'bg-red-400/40' : 'bg-red-900/20')]"></div>
                </div>
                {{ c.char }}
              </span>
            </template>
          </span>
        </div>
        
        <div class="text-xl italic font-light tracking-wide transition-all duration-[1000ms] ease-out font-ui-serif" 
             :style="{ transitionDelay: isTransitioning || isEntering ? `${poemCharacters.length * 15}ms` : '0ms' }" 
             :class="[isTransitioning ? 'opacity-0 blur-md translate-x-12 -translate-y-4 scale-110' : 
                      isEntering ? 'opacity-0 blur-sm -translate-x-8 translate-y-2 scale-95' : 
                      (isTypingActive && !isKintsugi ? 'opacity-0' : 'opacity-80 blur-0 translate-x-0 translate-y-0 rotate-0 scale-100'), 
                      settings.darkMode ? 'text-stone-500' : 'text-stone-600']">
          — {{ currentQuote.author }}
        </div>
      </div>
    </div>

    <!-- PASSAGE / DAILY COMPLETE -->
    <div v-else class="flex flex-col items-center animate-fade-in w-full font-ui-sans" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">
      <h2 class="text-4xl tracking-[0.3em] uppercase font-light mb-2 font-ui-serif">{{ gameState === 'daily-complete' ? 'Meditation Complete' : 'Passage Complete' }}</h2>
      <p v-if="gameState === 'daily-complete'" class="italic text-sm mb-8 tracking-wide" :class="settings.darkMode ? 'text-stone-500' : 'text-stone-600'">Return tomorrow for a new passage.</p>
      <div v-else class="mb-12"></div>
      
      <div class="flex gap-16 mb-12">
        <div class="flex flex-col items-center"><span class="text-[10px] uppercase tracking-[0.3em] mb-3 opacity-60">Speed</span><span class="text-5xl font-light font-ui-serif">{{ lastWPM }} <span class="text-lg opacity-60 font-ui-sans">WPM</span></span></div>
        <div class="w-px h-16 opacity-40" :class="settings.darkMode ? 'bg-gradient-to-b from-transparent via-stone-500 to-transparent' : 'bg-gradient-to-b from-transparent via-stone-500 to-transparent'"></div>
        <div class="flex flex-col items-center"><span class="text-[10px] uppercase tracking-[0.3em] mb-3 opacity-60">Clarity</span><span class="text-5xl font-light font-ui-serif">{{ lastAccuracy }}<span class="text-lg opacity-60 font-ui-sans">%</span></span></div>
      </div>

      <div class="w-32 h-px opacity-40 mb-12" :class="settings.darkMode ? 'bg-gradient-to-r from-transparent via-stone-500 to-transparent' : 'bg-gradient-to-r from-transparent via-stone-500 to-transparent'"></div>

      <div v-if="topMissedLetters.length > 0 || missedWords.size > 0" class="w-full max-w-2xl flex flex-col items-center mb-16">
         <span class="text-[10px] uppercase tracking-[0.4em] mb-10 opacity-60">Session Reflection</span>
         <div class="flex w-full justify-center gap-16">
           <div class="flex flex-col items-center w-1/2" v-if="topMissedLetters.length > 0">
             <span class="text-[9px] uppercase tracking-widest mb-6 opacity-60">Tangled Keys</span>
             <div class="flex gap-8">
               <div v-for="[letter, count] in topMissedLetters" :key="letter" class="flex flex-col items-center gap-1 relative">
                 <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-[-1] opacity-40">
                    <div class="w-8 h-8 rounded-full bg-[#DFBE73]" style="filter: url(#ink-blot);" :style="{ transform: `scale(${Math.random() * 0.3 + 1.2}) rotate(${Math.random() * 360}deg)` }"></div>
                 </div>
                 <span class="text-3xl font-light transition-colors relative z-10 font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">{{ letter }}</span>
                 <span class="text-[10px] opacity-60 tracking-widest">{{ count }}x</span>
               </div>
             </div>
           </div>
           <div class="w-px opacity-40" :class="settings.darkMode ? 'bg-gradient-to-b from-transparent via-stone-500 to-transparent' : 'bg-gradient-to-b from-transparent via-stone-500 to-transparent'" v-if="topMissedLetters.length > 0 && missedWords.size > 0"></div>
           <div class="flex flex-col items-center w-1/2" v-if="missedWords.size > 0">
             <span class="text-[9px] uppercase tracking-widest mb-6 opacity-60">Slipped Words</span>
             <div class="flex flex-wrap justify-center gap-x-5 gap-y-4 max-w-[280px]">
               <span v-for="word in Array.from(missedWords).slice(0, 8)" :key="word" class="relative text-sm font-light transition-colors tracking-wide px-2 py-0.5 font-ui-serif" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-900'">
                 <div class="absolute inset-0 rounded-sm opacity-[0.25] pointer-events-none z-[-1] bg-[#DFBE73]" style="filter: url(#ink-blot);"></div>
                 <span class="relative z-10">{{ word }}</span>
               </span>
               <span v-if="missedWords.size > 8" class="text-sm opacity-60">...</span>
             </div>
           </div>
         </div>
      </div>
      <div v-else class="mb-16 flex flex-col items-center"><span class="text-sm italic opacity-80 font-ui-serif" :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">A flawless journey. The mind was perfectly still.</span></div>

      <button v-if="gameState === 'daily-complete'" @click="router.push('/')" class="relative px-8 py-3 group transition-transform hover:scale-105">
        <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div>
        <span class="relative z-10 tracking-[0.25em] uppercase text-xs" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-900'">Return to Menu</span>
      </button>
      <button v-else @click="nextPassage" class="relative px-8 py-3 group transition-transform hover:scale-105">
        <div class="absolute inset-0 rounded-full transition-opacity" :class="settings.darkMode ? 'bg-white opacity-5 group-hover:opacity-10' : 'bg-stone-300 opacity-30 group-hover:opacity-50'" style="filter: url(#ink-blot);"></div>
        <span class="relative z-10 tracking-[0.25em] uppercase text-xs" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-900'">Proceed to Next</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Scoped Animations specifically for Play.vue to guarantee they load */
.cursor-glide {
  transition: transform 0.15s cubic-bezier(0.2, 0, 0.2, 1), width 0.15s cubic-bezier(0.2, 0, 0.2, 1), height 0.15s cubic-bezier(0.2, 0, 0.2, 1), opacity 0.2s ease;
  will-change: transform, width, height;
}

.wind-path-1 { stroke-dasharray: 20 80; animation: wind-blow 2s linear infinite; }
.wind-path-2 { stroke-dasharray: 10 90; animation: wind-blow 2.5s linear infinite; }
@keyframes wind-blow { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }

@keyframes blink-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.animate-blink { animation: blink-cursor 1.2s ease-in-out infinite; }

@keyframes ink-puff {
  0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
  100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
}
.animate-ink-puff { animation: ink-puff 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
</style>