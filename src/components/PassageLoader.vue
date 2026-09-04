<script setup>
import { settings } from '../store'

defineProps({
  text: {
    type: String,
    default: 'Unfolding the path...'
  }
})
</script>

<template>
  <div class="flex flex-col items-center animate-fade-in z-20">
    <div class="relative w-24 h-24 mb-6 flex items-center justify-center opacity-80">
      
      <!-- Minimalist Enso Brush Circle -->
      <svg class="absolute inset-0 w-full h-full animate-spin-slow" 
           :class="settings?.darkMode ? 'text-stone-400' : 'text-stone-600'" 
           viewBox="0 0 100 100" fill="none">
        <path d="M 50,10 C 75,10 90,30 90,50 C 90,75 70,90 50,90 C 25,90 10,70 10,50 C 10,25 30,10 45,12" 
              stroke="currentColor" 
              stroke-width="2.5" 
              stroke-linecap="round" 
              filter="url(#zen-brush)" 
              pathLength="100" 
              stroke-dasharray="100" 
              class="animate-enso-draw" />
      </svg>
      
    </div>
    
    <p class="italic text-[10px] tracking-[0.3em] uppercase font-ui-sans animate-pulse-slow transition-colors duration-1000" 
       :class="settings?.darkMode ? 'text-stone-400 opacity-70' : 'text-stone-500'">
      {{ text }}
    </p>
  </div>
</template>

<style scoped>
.animate-spin-slow {
  animation: spin 12s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes enso-draw { 
  0% { stroke-dashoffset: 100; opacity: 0; } 
  20% { opacity: 1; } 
  50%, 80% { stroke-dashoffset: 0; opacity: 1; } 
  100% { stroke-dashoffset: 0; opacity: 0; } 
}

.animate-enso-draw { 
  animation: enso-draw 4s ease-in-out infinite; 
}

@keyframes pulse-slow { 
  0%, 100% { opacity: 0.4; } 
  50% { opacity: 0.8; } 
}

.animate-pulse-slow { 
  animation: pulse-slow 3s ease-in-out infinite; 
}
</style>