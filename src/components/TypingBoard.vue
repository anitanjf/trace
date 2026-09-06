<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { settings } from '../store'
import SplashScreen from './SplashScreen.vue'

const props = defineProps({ 
  quote: { type: Object, required: true },
  seasonName: { type: String, required: true },
  passageNumber: { type: Number, required: true },
  gameMode: { type: String, required: true },
  isPaused: { type: Boolean, default: false }
})

const emit = defineEmits(['passage-complete', 'pause', 'resume'])

const userInputs = ref([])
const mobileInputValue = ref('') 
const typedCount = computed(() => userInputs.value.length)
const missedLetters = ref({})
const missedWords = ref(new Set())
const missedWordIndices = ref(new Set()) 
const activeMistakeMarks = ref({}) 
const keystrokeSparks = ref([]) 
const sessionKeystrokes = ref(0)
const sessionMistakes = ref(0)
const sessionStartTime = ref(Date.now())
const pauseStartTime = ref(0) 
const isShaking = ref(false)
const liveWPM = ref(0)
const isTypingActive = ref(false)
let typingTimeout = null

const isEntering = ref(true)
const isSweeping = ref(false) 
const isTransitioning = ref(false) 
const isKintsugi = ref(false)

const typingArea = ref(null)
const textContainer = ref(null) 
const mobileInputRef = ref(null)

const cursorStyle = ref({ transform: 'translate(0px, 0px)', width: '0px', height: '0px', opacity: 0 })
const fireflyStyle = ref({ transform: 'translate(0px, 0px)', opacity: 0 })
const cursorAbsoluteX = ref(-1000)
const cursorAbsoluteY = ref(-1000)

const scrollOffset = ref(0)
const viewportMaxHeight = ref('none')
const linesTops = ref([])
const lineHeight = ref(0)

watch(() => props.isPaused, (isNowPaused) => {
  if (isNowPaused) {
    pauseStartTime.value = Date.now()
    if (mobileInputRef.value) mobileInputRef.value.blur() 
  } else {
    if (pauseStartTime.value > 0) {
      sessionStartTime.value += (Date.now() - pauseStartTime.value)
      pauseStartTime.value = 0
    }
  }
})

watch(userInputs, (newVal) => {
  mobileInputValue.value = newVal.join('')
}, { deep: true })

const processedQuoteText = computed(() => {
  let text = props.quote.text
  if (settings.value.pureZen || props.gameMode === 'flow') {
    text = text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim()
  }
  return text
})
const poemCharacters = computed(() => processedQuoteText.value.split(''))

const poemWords = computed(() => {
  const words = []; let currentWord = []
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

const getWordAtIndex = (text, index) => {
  let start = index; while (start > 0 && text[start - 1] !== ' ') start--
  let end = index; while (end < text.length && text[end] !== ' ') end++
  return text.slice(start, end).trim()
}

const checkCanBackspace = () => {
  if (userInputs.value.length === 0) return false;
  const lastIndex = userInputs.value.length - 1;
  if (userInputs.value[lastIndex] === ' ' && poemCharacters.value[lastIndex] === ' ') {
    let start = lastIndex - 1;
    while (start >= 0 && poemCharacters.value[start] !== ' ') start--;
    start++;
    let isPerfect = true;
    for (let i = start; i < lastIndex; i++) {
      if (userInputs.value[i] !== poemCharacters.value[i]) {
        isPerfect = false; break;
      }
    }
    if (isPerfect) return false;
  }
  return true;
}

const calculateLines = () => {
  if (!textContainer.value) return;
  const containerRect = textContainer.value.getBoundingClientRect();
  const wordWrappers = textContainer.value.querySelectorAll('.word-wrapper');
  
  const tops = [];
  wordWrappers.forEach(w => {
    const y = w.getBoundingClientRect().top - containerRect.top;
    if (tops.length === 0 || y > tops[tops.length - 1] + 15) { 
      tops.push(y);
    }
  });
  
  linesTops.value = tops;
  if (tops.length > 1) {
    lineHeight.value = tops[1] - tops[0];
  } else if (wordWrappers.length > 0) {
    lineHeight.value = wordWrappers[0].getBoundingClientRect().height * 1.5;
  }
};

const updateCursor = async () => {
  await nextTick()
  if (!typingArea.value || !textContainer.value || isEntering.value || isTransitioning.value || isSweeping.value || isKintsugi.value) {
    cursorStyle.value.opacity = 0
    fireflyStyle.value.opacity = 0
    
    if (isKintsugi.value || isSweeping.value) {
      viewportMaxHeight.value = 'none'
    }
    
    scrollOffset.value = 0
    return
  }
  
  const spans = textContainer.value.querySelectorAll('.char-span')
  const isEnd = typedCount.value >= poemCharacters.value.length
  const targetIndex = isEnd ? poemCharacters.value.length - 1 : typedCount.value
  const activeSpan = spans[targetIndex]

  if (activeSpan) {
    const activeRect = activeSpan.getBoundingClientRect()
    const containerRect = textContainer.value.getBoundingClientRect()
    const typingAreaRect = typingArea.value.getBoundingClientRect() 
    
    const left = activeRect.left - containerRect.left + (isEnd ? activeRect.width : 0)
    const top = activeRect.top - containerRect.top
    cursorStyle.value = { transform: `translate(${left}px, ${top}px)`, width: `${activeRect.width}px`, height: `${activeRect.height}px`, opacity: 1 }
    
    const fireflyLeft = activeRect.left - typingAreaRect.left + (isEnd ? activeRect.width : 0) + (activeRect.width / 2)
    const fireflyTop = activeRect.top - typingAreaRect.top + (activeRect.height / 2)
    fireflyStyle.value = { transform: `translate(${fireflyLeft}px, ${fireflyTop}px)`, opacity: 1 }
    
    cursorAbsoluteX.value = activeRect.left + (activeRect.width / 2)
    cursorAbsoluteY.value = activeRect.top + (activeRect.height / 2)

    if (props.gameMode === 'flow' || poemCharacters.value.length > 150) {
      if (linesTops.value.length === 0) calculateLines();
      
      const activeWordWrapper = activeSpan.closest('.word-wrapper');
      if (activeWordWrapper) {
        const activeY = activeWordWrapper.getBoundingClientRect().top - containerRect.top;
        const currentLineIndex = linesTops.value.findIndex(ly => Math.abs(ly - activeY) < 15);
        
        if (currentLineIndex > 1) {
            scrollOffset.value = linesTops.value[currentLineIndex - 1] - linesTops.value[0];
        } else {
            scrollOffset.value = 0;
        }

        if (lineHeight.value > 0) {
            viewportMaxHeight.value = `${(lineHeight.value * 3.2)}px`; 
        }
      }
    } else {
      viewportMaxHeight.value = 'none';
      scrollOffset.value = 0;
    }
  }
}

watch(typedCount, updateCursor)
watch(() => props.quote, () => { nextTick(calculateLines) })

const processCharacter = (char) => {
  isTypingActive.value = true
  clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => { isTypingActive.value = false }, 2000)

  if (userInputs.value.length >= poemCharacters.value.length) return

  const currentIndex = userInputs.value.length
  const expectedChar = poemCharacters.value[currentIndex]
  
  sessionKeystrokes.value++
  userInputs.value.push(char)

  if (char === expectedChar) {
    if (char !== ' ') {
      const sparkId = Date.now() + Math.random()
      keystrokeSparks.value.push({ id: sparkId, x: cursorAbsoluteX.value, y: cursorAbsoluteY.value, rotation: Math.random() * 360 })
      setTimeout(() => { keystrokeSparks.value = keystrokeSparks.value.filter(s => s.id !== sparkId) }, 400)
    }
  } else {
    sessionMistakes.value++
    if (!activeMistakeMarks.value[currentIndex]) {
      activeMistakeMarks.value[currentIndex] = { rotate: Math.random() * 360, scale: Math.random() * 0.4 + 0.8 }
    }
    
    const textUpToCurrent = processedQuoteText.value.slice(0, currentIndex + 1)
    const wordIndex = textUpToCurrent.split(' ').length - 1
    missedWordIndices.value.add(wordIndex)

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
    isTypingActive.value = false
    if (mobileInputRef.value) mobileInputRef.value.blur()
    triggerCompletion()
  }
}

const processBackspace = (isCtrl) => {
  if (!checkCanBackspace()) return
  if (isCtrl) {
    if (userInputs.value.length > 0) {
      let lastChar = userInputs.value[userInputs.value.length - 1]
      if (lastChar === ' ') userInputs.value.pop() 
      while (userInputs.value.length > 0 && userInputs.value[userInputs.value.length - 1] !== ' ') userInputs.value.pop()
    }
  } else {
    if (userInputs.value.length > 0) userInputs.value.pop()
  }
  updateCursor()
}

const handleKey = (e) => {
  if (e.key === 'Escape') { 
    if (props.isPaused) emit('resume')
    else emit('pause')
    return 
  }

  if (props.isPaused || isEntering.value || isTransitioning.value || isSweeping.value || isKintsugi.value) return 
  if (e.keyCode === 229) return 
  if (e.code === 'Space') e.preventDefault()
  
  if (e.key === 'Backspace') {
    processBackspace(e.ctrlKey || e.metaKey)
    return
  }

  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
    e.preventDefault() 
    processCharacter(e.key)
  }
}

const handleMobileInput = (e) => {
  if (props.isPaused || isEntering.value || isTransitioning.value || isSweeping.value || isKintsugi.value) {
    mobileInputValue.value = userInputs.value.join('')
    return
  }

  const val = e.target.value
  if (val.length < userInputs.value.length) {
    processBackspace(false)
  } else if (val.length > userInputs.value.length) {
    const char = val.slice(-1)
    processCharacter(char)
  }
}

const emitStatsData = () => {
  const timeInMinutes = Math.max((Date.now() - sessionStartTime.value) / 60000, 0.01)
  const wpm = Math.round((processedQuoteText.value.length / 5) / timeInMinutes)
  const accuracy = Math.max(0, Math.round(((sessionKeystrokes.value - sessionMistakes.value) / sessionKeystrokes.value) * 100))
  
  emit('passage-complete', {
    wpm, 
    accuracy, 
    keystrokes: sessionKeystrokes.value, 
    mistakes: sessionMistakes.value, 
    missedLetters: missedLetters.value, 
    missedWords: missedWords.value,
    missedIndices: Array.from(missedWordIndices.value) 
  })
}

const triggerCompletion = () => {
  isKintsugi.value = true
  viewportMaxHeight.value = 'none' 
  scrollOffset.value = 0
  
  setTimeout(() => {
    // Universal Animation Trigger!
    isKintsugi.value = false
    isSweeping.value = true
    
    // Performance fix: Groups 2 characters together using Math.floor at a 18ms speed.
    const sweepDuration = (Math.floor(poemCharacters.value.length / 2) * 18) + 1200
    
    setTimeout(() => {
      isTransitioning.value = true
      setTimeout(() => { emitStatsData() }, 2500)
    }, sweepDuration)
    
  }, 3500)
}

onMounted(() => {
  window.addEventListener('keydown', handleKey, { passive: false })
  window.addEventListener('resize', () => { calculateLines(); updateCursor(); })
  
  const enterDelay = props.gameMode === 'flow' ? 800 : (props.quote.text.length * 15) + 600

  setTimeout(() => { 
    isEntering.value = false; 
    setTimeout(() => {
       calculateLines(); 
       updateCursor(); 
       sessionStartTime.value = Date.now();
    }, 50)
  }, enterDelay)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKey)
  window.removeEventListener('resize', () => { calculateLines(); updateCursor(); })
  clearTimeout(typingTimeout)
})
</script>

<template>
  <div class="w-full max-w-4xl flex flex-col items-center z-10 relative px-4 sm:px-8">
    
    <SplashScreen 
      v-if="isTransitioning" 
      :message="props.gameMode === 'flow' ? 'Catching Breath...' : 'Finding Clarity...'" 
    />

    <div v-if="settings?.showLiveWPM" class="fixed top-8 sm:top-12 left-6 sm:left-12 text-xs tracking-widest uppercase font-ui-sans transition-all duration-700" :class="[isTypingActive && liveWPM > 0 && !isTransitioning && !isEntering && !isSweeping ? 'opacity-50' : 'opacity-0', settings?.darkMode ? 'text-stone-300' : 'text-stone-500']">{{ liveWPM }} WPM</div>

    <div class="mb-8 sm:mb-12 flex flex-col items-center gap-4 w-full transition-opacity duration-1000 font-ui-sans" :class="isTypingActive && !isKintsugi ? 'opacity-0' : 'opacity-100'">
      <span class="text-[10px] sm:text-xs tracking-[0.3em] uppercase transition-colors duration-1000 text-center" :class="settings?.darkMode ? 'text-stone-300' : 'text-stone-600'">
        <template v-if="props.gameMode === 'daily'">Daily Focus &middot; Reflection {{ props.passageNumber }}</template>
        <template v-else-if="props.gameMode === 'flow'">Flow State &middot; {{ props.passageNumber }} Words</template>
        <template v-else>{{ props.seasonName }} &middot; Passage {{ props.passageNumber }}</template>
      </span>
    </div>

    <div class="flex flex-col items-center w-full relative" :class="{'animate-shake': isShaking}" ref="typingArea">
      
      <div class="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <div v-for="spark in keystrokeSparks" :key="spark.id" class="absolute flex items-center justify-center animate-ink-puff" :style="{ left: `${spark.x}px`, top: `${spark.y}px` }">
          <div class="w-3 h-3 rounded-full opacity-60" :class="settings?.darkMode ? 'bg-stone-300' : 'bg-stone-500'" :style="{ transform: `rotate(${spark.rotation}deg)`, filter: 'url(#ink-blot)' }"></div>
        </div>
      </div>

      <div class="absolute top-0 left-0 z-40 pointer-events-none firefly-glide flex items-center justify-center" :style="fireflyStyle">
        <div class="w-full h-full absolute inset-0 flex items-center justify-center transition-opacity duration-1000" :class="isTransitioning || isSweeping || isEntering ? 'opacity-0' : 'opacity-100'">
            <div class="fireflies-container" :class="{ 'is-idle': !isTypingActive }">
                <div class="firefly ff-1"></div>
                <div class="firefly ff-2"></div>
                <div class="firefly ff-3"></div>
            </div>
        </div>
      </div>

      <input 
        ref="mobileInputRef"
        type="text" 
        v-model="mobileInputValue"
        @input="handleMobileInput"
        autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
        class="absolute inset-0 w-full h-full opacity-0 z-30 cursor-text resize-none" 
        :class="isKintsugi || isTransitioning || isSweeping ? 'pointer-events-none' : 'pointer-events-auto'"
        style="color: transparent; text-shadow: none;"
      />

      <div class="w-[calc(100%+6rem)] px-12 flex-shrink-0 relative transition-all duration-[600ms] ease-in-out py-2" 
           :class="(isKintsugi || isSweeping) ? 'overflow-visible pointer-events-auto' : 'overflow-hidden pointer-events-none'"
           :style="{ 
             maxHeight: viewportMaxHeight, 
             maskImage: viewportMaxHeight !== 'none' ? 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' : 'none',
             WebkitMaskImage: viewportMaxHeight !== 'none' ? 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' : 'none' 
           }">
          
          <div ref="textContainer" class="relative z-10 transition-all duration-[800ms] ease-in-out will-change-transform text-center" 
               :style="{ transform: (isKintsugi || isSweeping || isTransitioning) ? 'translateY(0px)' : `translateY(-${scrollOffset}px)` }" 
               :class="[
                 fontClass,
                 (props.gameMode === 'flow' && (isKintsugi || isTransitioning || isSweeping))
                   ? 'text-[14px] leading-[2.5]'
                   : 'text-xl sm:text-2xl md:text-3xl leading-relaxed sm:leading-loose'
               ]">
            
            <div class="absolute top-0 left-0 z-20 pointer-events-none cursor-glide" :style="cursorStyle"></div>
            
            <span v-for="(word, wIdx) in poemWords" :key="'w-'+wIdx" class="word-wrapper inline-block" :class="{'whitespace-nowrap': !word[0].isSpace}">
              <template v-for="c in word" :key="c.index">
                <!-- Transition delays now smoothly incrementing 2 letters at a time via Math.floor -->
                <span class="char-span inline-block rounded-sm relative"
                      :style="{ transitionDelay: isSweeping ? `${Math.floor(c.index / 2) * 18}ms` : (isEntering ? (props.gameMode === 'flow' ? '0ms' : `${(poemCharacters.length - c.index) * 20}ms`) : '0ms') }"
                      :class="[
                        (isEntering || isSweeping) ? 'transition-all duration-700 ease-out' : 'transition-colors duration-100',
                        c.char === ' ' ? 'w-[0.5em] sm:w-[0.8em]' : '',
                        
                        isTransitioning ? 'opacity-0 blur-md' : 
                        isSweeping ? 'opacity-0 blur-md translate-x-16 -translate-y-8 scale-110 rotate-[12deg]' : 
                        isEntering ? 'opacity-0 blur-sm -translate-x-8 translate-y-4 scale-95 -rotate-[6deg]' : 
                        isKintsugi ? 'opacity-100 blur-0 translate-x-0 translate-y-0 rotate-0 scale-100 ' + (settings?.darkMode ? 'text-stone-200' : 'text-stone-800') : 
                        (!isEntering && !isKintsugi && !isSweeping ? [
                          c.index < typedCount && userInputs[c.index] === c.char ? ( settings?.darkMode ? 'text-stone-100 opacity-100' : 'text-stone-900 opacity-100' ) : '',
                          c.index < typedCount && userInputs[c.index] !== c.char ? 'text-red-400 opacity-100 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]' : '',
                          c.index > typedCount ? ( settings?.darkMode ? 'text-stone-300 opacity-40' : 'text-stone-600 opacity-40' ) : '',
                          c.index === typedCount ? ( settings?.darkMode ? 'text-stone-100 opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] animate-blink' : 'text-stone-900 opacity-100 drop-shadow-[0_0_8px_rgba(0,0,0,0.3)] animate-blink' ) : ''
                        ] : '')
                      ]">
                  
                  <div v-if="activeMistakeMarks[c.index]" class="absolute inset-0 flex items-center justify-center pointer-events-none z-[-1] transition-all duration-700 ease-out" :class="[isKintsugi ? 'opacity-100 drop-shadow-[0_0_10px_rgba(223,190,115,0.4)]' : (c.index < typedCount && userInputs[c.index] !== c.char) ? 'opacity-100' : 'opacity-0']">
                    <div class="w-[1.2em] h-[1.2em] rounded-full transition-all duration-700 ease-out" :style="{ transform: `rotate(${activeMistakeMarks[c.index].rotate}deg) scale(${isKintsugi ? activeMistakeMarks[c.index].scale * 1.5 : (c.index < typedCount && userInputs[c.index] !== c.char ? activeMistakeMarks[c.index].scale : 0.5)})`, filter: 'url(#ink-blot)' }" :class="[isKintsugi ? 'bg-[#DFBE73]/90' : (settings?.darkMode ? 'bg-red-400/40' : 'bg-red-900/20')]"></div>
                  </div>
                  
                  <span v-if="c.char === ' ' && c.index === typedCount && !isEntering" class="absolute bottom-0 left-0 w-full h-[2px] bg-current animate-blink opacity-60"></span>
                  
                  {{ c.char }}
                </span>
              </template>
            </span>
          </div>
      </div>
      
      <div class="text-base sm:text-xl italic font-light tracking-wide transition-all duration-[1000ms] ease-out font-ui-serif text-center mt-6" 
            :style="{ transitionDelay: isEntering ? (props.gameMode === 'flow' ? '0ms' : `${poemCharacters.length * 15}ms`) : '0ms' }" 
            :class="[
                    isEntering ? 'opacity-0 blur-sm -translate-x-8 translate-y-2 scale-95' : 
                    isTransitioning || isSweeping ? 'opacity-0 blur-md translate-x-12' :
                    (isTypingActive && !isKintsugi ? 'opacity-0' : 'opacity-80 blur-0 translate-x-0 translate-y-0 rotate-0 scale-100'), 
                    settings?.darkMode ? 'text-stone-300' : 'text-stone-600']">
        &mdash; {{ props.quote.author }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.cursor-glide { transition: transform 0.15s ease-out, width 0.15s ease-out, height 0.15s ease-out; }
.firefly-glide { transition: transform 1.5s cubic-bezier(0.2, 1, 0.4, 1), opacity 0.5s ease; will-change: transform; }
.fireflies-container { position: absolute; width: 0; height: 0; }
.firefly { position: absolute; width: 4px; height: 4px; margin-top: -2px; margin-left: -2px; border-radius: 50%; pointer-events: none; }
.firefly::before { content: ""; position: absolute; inset: -1px; border-radius: 50%; background: #fef08a; box-shadow: 0 0 10px 3px rgba(253, 224, 71, 0.7); animation: flash 3s ease infinite alternate; }

@keyframes flash { 0%, 20%, 100% { opacity: 0.3; box-shadow: 0 0 3px 1px rgba(253, 224, 71, 0.2); } 50% { opacity: 1; box-shadow: 0 0 12px 5px rgba(253, 224, 71, 0.8); } }
.fireflies-container:not(.is-idle) .ff-1 { animation: roam1 9s infinite; }
.fireflies-container:not(.is-idle) .ff-2 { animation: roam2 12s infinite reverse; }
.fireflies-container:not(.is-idle) .ff-3 { animation: roam3 15s infinite; }

@keyframes roam1 { 0% { transform: translate(-60px, -40px); animation-timing-function: ease-in-out; } 20% { transform: translate(30px, 80px); animation-timing-function: linear; } 40% { transform: translate(110px, -20px); animation-timing-function: ease-out; } 60% { transform: translate(-10px, -70px); animation-timing-function: ease-in; } 80% { transform: translate(-80px, 40px); animation-timing-function: ease-in-out; } 100% { transform: translate(-60px, -40px); } }
@keyframes roam2 { 0% { transform: translate(70px, 60px); animation-timing-function: linear; } 25% { transform: translate(-50px, -60px); animation-timing-function: ease-in; } 50% { transform: translate(-120px, 30px); animation-timing-function: ease-out; } 75% { transform: translate(40px, -80px); animation-timing-function: ease-in-out; } 100% { transform: translate(70px, 60px); } }
@keyframes roam3 { 0% { transform: translate(20px, -100px); animation-timing-function: ease-out; } 30% { transform: translate(90px, 30px); animation-timing-function: ease-in-out; } 55% { transform: translate(-40px, 110px); animation-timing-function: linear; } 80% { transform: translate(-90px, -30px); animation-timing-function: ease-in; } 100% { transform: translate(20px, -100px); } }

.fireflies-container.is-idle .ff-1 { animation: orbit1 3.5s infinite linear; }
.fireflies-container.is-idle .ff-2 { animation: orbit2 4.5s infinite linear reverse; }
.fireflies-container.is-idle .ff-3 { animation: orbit3 5.5s infinite linear; }

@keyframes orbit1 { 0% { transform: rotate(0deg) translateX(14px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(14px) rotate(-360deg); } }
@keyframes orbit2 { 0% { transform: rotate(45deg) translateX(20px) rotate(-45deg); } 100% { transform: rotate(405deg) translateX(20px) rotate(-405deg); } }
@keyframes orbit3 { 0% { transform: rotate(90deg) translateX(26px) rotate(-90deg); } 100% { transform: rotate(450deg) translateX(26px) rotate(-450deg); } }

@keyframes blink-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0.1; } }
.animate-blink { animation: blink-cursor 1.2s ease-in-out infinite; }
@keyframes ink-puff { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; } 100% { transform: translate(-50%, -50%) scale(2); opacity: 0; } }
.animate-ink-puff { animation: ink-puff 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
</style>