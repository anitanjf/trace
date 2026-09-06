<script setup>
import { settings } from '../store'

const props = defineProps({
  message: { 
    type: String, 
    default: 'Finding Clarity...' 
  }
})
</script>

<template>
  <div class="fixed inset-0 z-[100] flex flex-col items-center justify-center animate-fade-in backdrop-blur-md transition-all duration-1000" :class="settings?.darkMode ? 'bg-stone-900/90' : 'bg-stone-100/90'">
    
    <div class="relative w-40 h-40 mb-2 flex flex-col items-center justify-center">
      
      <!-- Faint Golden Aura / Ripple -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
         <div class="w-24 h-24 rounded-full opacity-20 animate-ping bg-[#DFBE73]" style="animation-duration: 3s; filter: url(#ink-blot);"></div>
      </div>

      <!-- Floating Spirit Container -->
      <div class="relative z-10 animate-float flex items-center justify-center">
        
        <!-- Orbiting Fireflies of Clarity -->
        <div class="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div class="fireflies-container is-idle">
             <div class="firefly ff-1"></div>
             <div class="firefly ff-2"></div>
          </div>
        </div>

        <!-- Breathing Ink Body -->
        <div class="w-14 h-14 rounded-full transition-colors duration-1000 animate-zen-breathe relative"
             :class="settings?.darkMode ? 'bg-stone-300' : 'bg-stone-800'"
             style="filter: url(#ink-blot);"></div>
             
        <!-- Meditating Eyes (Separated so the ink-blot filter doesn't distort them) -->
        <div class="absolute inset-0 flex items-center justify-center gap-2 z-20 mb-1 animate-ponder pointer-events-none">
          <svg width="10" height="6" viewBox="0 0 10 6" class="transition-colors duration-1000" :class="settings?.darkMode ? 'text-stone-900' : 'text-[#FDFBF7]'">
            <path d="M 1,2 Q 5,5 9,2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <svg width="10" height="6" viewBox="0 0 10 6" class="transition-colors duration-1000" :class="settings?.darkMode ? 'text-stone-900' : 'text-[#FDFBF7]'">
            <path d="M 1,2 Q 5,5 9,2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
      
      <!-- Ground Shadow -->
      <div class="absolute bottom-6 w-12 h-1.5 rounded-[50%] blur-[3px] animate-shadow-pulse transition-colors duration-1000"
           :class="settings?.darkMode ? 'bg-black/80' : 'bg-stone-400/60'"></div>
    </div>
    
    <!-- Splash Screen Message -->
    <p class="text-xs sm:text-sm tracking-[0.4em] uppercase font-light animate-pulse font-ui-serif transition-colors duration-1000 z-10" 
       :class="settings?.darkMode ? 'text-stone-300' : 'text-stone-600'">
      {{ message }}
    </p>
  </div>
</template>

<style scoped>
/* Body Animations */
@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
.animate-float { animation: float 4s ease-in-out infinite; }

@keyframes zen-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
.animate-zen-breathe { animation: zen-breathe 4s ease-in-out infinite; }

@keyframes shadow-pulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(0.7); opacity: 0.3; } }
.animate-shadow-pulse { animation: shadow-pulse 4s ease-in-out infinite; }

@keyframes ponder {
  0%, 100% { transform: translate(0px, 0px); }
  20%, 40% { transform: translate(1.5px, -1.5px); }
  60%, 80% { transform: translate(-1px, 0.5px); }
}
.animate-ponder { animation: ponder 7s ease-in-out infinite; }

/* Firefly Animations */
.fireflies-container { position: absolute; width: 0; height: 0; }
.firefly { position: absolute; width: 4px; height: 4px; margin-top: -2px; margin-left: -2px; border-radius: 50%; pointer-events: none; }
.firefly::before { content: ""; position: absolute; inset: -1px; border-radius: 50%; background: #fef08a; box-shadow: 0 0 10px 3px rgba(253, 224, 71, 0.7); animation: flash 3s ease infinite alternate; }

@keyframes flash { 0%, 20%, 100% { opacity: 0.3; box-shadow: 0 0 3px 1px rgba(253, 224, 71, 0.2); } 50% { opacity: 1; box-shadow: 0 0 12px 5px rgba(253, 224, 71, 0.8); } }

.fireflies-container.is-idle .ff-1 { animation: orbit1 3.5s infinite linear; }
.fireflies-container.is-idle .ff-2 { animation: orbit2 4.5s infinite linear reverse; }

@keyframes orbit1 { 0% { transform: rotate(0deg) translateX(36px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(36px) rotate(-360deg); } }
@keyframes orbit2 { 0% { transform: rotate(180deg) translateX(42px) rotate(-180deg); } 100% { transform: rotate(540deg) translateX(42px) rotate(-540deg); } }
</style>