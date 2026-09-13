<script setup>
import { settings } from '../store'

defineProps({
  compact: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: 'Gathering thoughts...'
  }
})
</script>

<template>
  <div class="flex flex-col items-center animate-fade-in z-20" :class="{ 'zen-loader--compact': compact }">
    <div class="relative flex flex-col items-center justify-center" :class="compact ? 'w-20 h-20' : 'w-40 h-40 mb-2'">
      
      <!-- Floating Spirit Container -->
      <div class="relative z-10 animate-float flex items-center justify-center">
        
        <!-- Organic Ink Thought Trail -->
        <div class="absolute z-30 pointer-events-none" :class="compact ? '-top-8 -right-8 w-12 h-12' : '-top-23 -right-23 w-28 h-28'">
          <!-- Small ink mark -->
          <div class="absolute rounded-full animate-thought-pop-1 transition-colors duration-1000" :class="[compact ? 'bottom-2 left-1 w-1 h-1' : 'bottom-4 left-4 w-1.5 h-1.5', settings?.darkMode ? 'bg-stone-300 opacity-90' : 'bg-stone-800 opacity-80']"
               style="filter: url(#ink-blot);"></div>
               
          <!-- Slightly bigger ink mark -->
          <div class="absolute rounded-full animate-thought-pop-2 transition-colors duration-1000" :class="[compact ? 'bottom-4 left-3 w-2 h-2' : 'bottom-6 left-6 w-4 h-4', settings?.darkMode ? 'bg-stone-300 opacity-90' : 'bg-stone-800 opacity-80']"
               style="filter: url(#ink-blot);"></div>
               
          <!-- Big ink cloud -->
          <div class="absolute rounded-[40%] animate-thought-pop-3 transition-colors duration-1000" :class="[compact ? 'bottom-6 left-5 w-5 h-3' : 'bottom-10 left-10 w-12 h-8', settings?.darkMode ? 'bg-stone-300 opacity-90' : 'bg-stone-800 opacity-80']"
               style="filter: url(#ink-blot);"></div>
        </div>

        <!-- Breathing Ink Body -->
        <div class="rounded-full transition-colors duration-1000 animate-zen-breathe" :class="[compact ? 'w-10 h-10' : 'w-14 h-14', settings?.darkMode ? 'bg-stone-300' : 'bg-stone-800']"
             style="filter: url(#ink-blot);"></div>
             
        <!-- Meditating Eyes -->
        <div class="absolute inset-0 flex items-center justify-center gap-2 z-20 mb-1 animate-ponder">
          <svg width="10" height="6" viewBox="0 0 10 6" class="transition-colors duration-1000" :class="settings?.darkMode ? 'text-stone-900' : 'text-[#FDFBF7]'">
            <path d="M 1,2 Q 5,5 9,2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg width="10" height="6" viewBox="0 0 10 6" class="transition-colors duration-1000" :class="settings?.darkMode ? 'text-stone-900' : 'text-[#FDFBF7]'">
            <path d="M 1,2 Q 5,5 9,2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
      
      <!-- Ground Shadow -->
      <div class="absolute rounded-[50%] blur-[3px] animate-shadow-pulse transition-colors duration-1000" :class="[compact ? 'bottom-2 w-8 h-1' : 'bottom-6 w-12 h-1.5', settings?.darkMode ? 'bg-black/80' : 'bg-stone-400/60']"></div>
    </div>
    
    <p v-if="text" class="italic text-[10px] tracking-widest uppercase font-ui-sans animate-pulse-slow transition-colors duration-1000"
       :class="settings?.darkMode ? 'text-stone-300 opacity-70' : 'text-stone-500'">
      {{ text }}
    </p>
  </div>
</template>

<style scoped>
@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
.animate-float { animation: float 4s ease-in-out infinite; }
@keyframes float-home { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
.zen-loader--compact .animate-float { animation: float-home 5.5s ease-in-out infinite; }

@keyframes zen-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
.animate-zen-breathe { animation: zen-breathe 4s ease-in-out infinite; }

@keyframes shadow-pulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(0.7); opacity: 0.3; } }
.animate-shadow-pulse { animation: shadow-pulse 4s ease-in-out infinite; }

@keyframes pulse-slow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
.animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }

/* Sequential pulsing for the 3 ink marks */
@keyframes thought-pop {
  0%, 100% { opacity: 0.4; transform: scale(0.95); }
  50% { opacity: 0.9; transform: scale(1.05); }
}
.animate-thought-pop-1 { animation: thought-pop 2.5s ease-in-out infinite 0s; }
.animate-thought-pop-2 { animation: thought-pop 2.5s ease-in-out infinite 0.2s; }
.animate-thought-pop-3 { animation: thought-pop 2.5s ease-in-out infinite 0.4s; }

/* Gentle eye movement simulating dreaming/pondering */
@keyframes ponder {
  0%, 100% { transform: translate(0px, 0px); }
  20%, 40% { transform: translate(1.5px, -1.5px); }
  60%, 80% { transform: translate(-1px, 0.5px); }
}
.animate-ponder { animation: ponder 7s ease-in-out infinite; }
</style>
