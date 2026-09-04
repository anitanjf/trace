<script setup>
import Atmosphere from './components/Atmosphere.vue'
import ZenLoader from './components/ZenLoader.vue'
import { isAppReady, settings } from './store'
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center select-none overflow-hidden relative font-ui-serif">
    
    <!-- 1. Atmosphere is ALWAYS rendered instantly using the local cache -->
    <Atmosphere />

    <transition name="splash-fade">
      <!-- 2. The Main App (Revealed when Firebase finishes loading) -->
      <div v-if="isAppReady" class="w-full h-full flex flex-col items-center justify-center absolute inset-0 z-10">
        <router-view :key="$route.fullPath"></router-view>
      </div>

      <!-- 3. Solid, Poetic Splash Screen Overlay (Shows while waiting) -->
      <div v-else class="absolute inset-0 z-50 flex flex-col items-center justify-center w-full h-full transition-colors duration-1000"
           :class="settings.darkMode ? 'bg-stone-950' : 'bg-[#FDFBF7]'">
        
        <div class="flex flex-col items-center text-center animate-fade-in px-6 mt-[-5vh]">
          
          <p class="text-sm sm:text-lg italic font-light tracking-wide font-ui-serif mb-12 transition-colors duration-1000"
             :class="settings.darkMode ? 'text-stone-400' : 'text-stone-600'">
            "In the space between breaths, clarity awakens."
          </p>
          
          <div class="w-16 h-px mb-12 opacity-30 transition-colors duration-1000" 
               :class="settings.darkMode ? 'bg-stone-400' : 'bg-stone-600'"></div>
          
          <ZenLoader text="Gathering presence..." />
          
        </div>
      </div>
    </transition>

    <!-- GOOGLE FONTS INJECTION -->
    <component :is="'style'">
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&family=Courier+Prime&family=Plus+Jakarta+Sans:wght@300;400;500&family=Playfair+Display:ital,wght@0,400;0,500;0,600&family=Cinzel:wght@400;500;600&family=Questrial&family=Zhi+Mang+Xing&family=Yuji+Syuku&display=swap');
      
      .font-ui-serif { font-family: 'Cormorant Garamond', serif !important; }
      .font-ui-sans { font-family: 'Plus Jakarta Sans', sans-serif !important; }
      
      .poem-text-calligraphy { font-family: 'Playfair Display', serif !important; letter-spacing: 0.25em !important; }
      .poem-text-minimalist { font-family: 'Questrial', sans-serif !important; letter-spacing: 0.25em !important; }
      .poem-text-mono { font-family: 'Courier Prime', monospace !important; letter-spacing: 0.15em !important; }
      .poem-text-antique { font-family: 'Cinzel', serif !important; letter-spacing: 0.25em !important; }
      .poem-text-classic { font-family: 'Cormorant Garamond', serif !important; letter-spacing: 0.25em !important; }
      .poem-text-modern { font-family: 'Plus Jakarta Sans', sans-serif !important; letter-spacing: 0.2em !important; }
      .poem-text-brush { font-family: 'Zhi Mang Xing', cursive !important; letter-spacing: 0.15em !important; }
      .poem-text-sumi { font-family: 'Yuji Syuku', serif !important; letter-spacing: 0.15em !important; }
    </component>

  </div>
</template>

<style>
/* Splash Screen Crossfade Transition */
.splash-fade-enter-active,
.splash-fade-leave-active {
  transition: opacity 1.5s ease-in-out;
}
.splash-fade-enter-from,
.splash-fade-leave-to {
  opacity: 0;
}

/* Global Animations */
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 1s ease-out forwards; }
@keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
.animate-breathe { animation: breathe 8s ease-in-out infinite; }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 50% { transform: translateX(4px); } 75% { transform: translateX(-4px); } }
.animate-shake { animation: shake 0.3s ease-in-out; }
@keyframes fall { 0% { transform: translateY(-10vh) translateX(0) rotate(0deg); } 100% { transform: translateY(110vh) translateX(30px) rotate(360deg); } }
.animate-fall { animation: fall linear infinite; }
@keyframes float-up { 0% { transform: translateY(110vh) translateX(0) scale(1); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(-10vh) translateX(-20px) scale(0.8); opacity: 0; } }
.animate-float-up { animation: float-up linear infinite; }
@keyframes fall-sway { 0% { transform: translateY(-10vh) translateX(0) rotate(0deg); } 33% { transform: translateY(30vh) translateX(50px) rotate(120deg); } 66% { transform: translateY(70vh) translateX(-20px) rotate(240deg); } 100% { transform: translateY(110vh) translateX(40px) rotate(360deg); } }
.animate-fall-sway { animation: fall-sway linear infinite; }
@keyframes fall-straight { 0% { transform: translateY(-10vh); } 100% { transform: translateY(110vh); } }
.animate-fall-straight { animation: fall-straight linear infinite; }

/* Wet Season CSS */
.drop-container { position: absolute; top: -20vh; width: 10px; height: 80px; animation: drop var(--anim-dur) linear infinite var(--anim-del); }
.stem { width: 1.5px; height: 70%; margin-left: 4px; background: linear-gradient(to bottom, transparent, currentColor); animation: stem var(--anim-dur) linear infinite var(--anim-del); }
.splat { width: 10px; height: 6px; border-top: 1px dotted currentColor; border-radius: 50%; position: absolute; bottom: 15px; left: 0; transform: scale(0); animation: splat var(--anim-dur) linear infinite var(--anim-del); }
@keyframes drop { 0% { transform: scale(var(--drop-scale)) rotate(15deg) translateY(0); } 75%, 100% { transform: scale(var(--drop-scale)) rotate(15deg) translateY(120vh); } }
@keyframes stem { 0%, 65% { opacity: 1; } 75%, 100% { opacity: 0; } }
@keyframes splat { 0%, 65% { opacity: 1; transform: scale(0); } 75% { opacity: 1; transform: scale(1); } 90%, 100% { opacity: 0; transform: scale(1.5); } }

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.animate-blink { animation: blink 1.2s ease-in-out infinite; }
@keyframes ink-puff { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; } 100% { transform: translate(-50%, -50%) scale(2); opacity: 0; } }
.animate-ink-puff { animation: ink-puff 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes enso-draw { 0% { stroke-dashoffset: 100; opacity: 0; } 20% { opacity: 1; } 50%, 80% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 0; } }
.animate-enso-draw { animation: enso-draw 3s ease-in-out infinite; }

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.mask-fade-edges { mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent); }
</style>