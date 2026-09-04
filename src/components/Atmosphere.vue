<script setup>
import { computed } from 'vue'
import { seasons } from '../utils/constants'
import { settings, timeOfDay } from '../store'
import { getRealWorldSeason } from '../utils/helpers'

const activeVisualIndex = computed(() => {
  if (settings.value.themeMode === 'locked') return settings.value.lockedSeason || 0
  return getRealWorldSeason()
})

const activeSeason = computed(() => seasons[activeVisualIndex.value] || seasons[0])
const isWetSeason = computed(() => activeSeason.value.name === 'Wet Season')

// Gradients completely removed. Now Time of Day only handles neutral night dimming.
const atmosphereClass = computed(() => {
  if (!settings.value.timeAtmosphere) return 'bg-transparent'
  
  if (timeOfDay.value === 'night') {
    return settings.value.darkMode 
      ? 'bg-transparent backdrop-brightness-75' 
      : 'bg-transparent backdrop-brightness-95'
  }
  
  return 'bg-transparent'
})

const distantParticles = Array.from({ length: 35 }).map((_, i) => ({
  id: `d-${i}`, left: `${Math.random() * 120 - 10}vw`, size: `${Math.random() * 0.4 + 0.2}rem`, duration: `${Math.random() * 12 + 12}s`, delay: `-${Math.random() * 15}s`,
}))

const foregroundParticles = Array.from({ length: 35 }).map((_, i) => ({
  id: `f-${i}`, left: `${Math.random() * 120 - 10}vw`, size: `${Math.random() * 0.6 + 0.5}rem`, duration: `${Math.random() * 7 + 7}s`, delay: `-${Math.random() * 15}s`,
}))

const getParticleStyle = (p, seasonName, isForeground) => {
  if (seasonName === 'Wet Season') {
     const dur = isForeground ? (Math.random() * 0.2 + 0.4) : (Math.random() * 0.3 + 0.5);
     const scale = isForeground ? (Math.random() * 0.3 + 0.6) : (Math.random() * 0.2 + 0.4);
     return { left: p.left, '--anim-dur': `${dur}s`, '--anim-del': p.delay, '--drop-scale': scale }
  }
  return { left: p.left, width: p.size, height: p.size, animationDuration: p.duration, animationDelay: p.delay }
}
</script>

<template>
  <div class="fixed inset-0 pointer-events-none z-[0] transition-colors duration-[3000ms]" :class="settings.darkMode ? activeSeason.darkBgColor : activeSeason.bgColor">
    <!-- Time of Day Overlay -->
    <div class="absolute inset-0 transition-colors duration-[5000ms]" :class="atmosphereClass"></div>

    <!-- SVG Filters -->
    <svg width="0" height="0" class="absolute">
      <defs>
        <filter id="zen-brush" x="-10%" y="-30%" width="120%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04 0.4" numOctaves="3" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 4 -1.5" in="noise" result="coloredNoise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          <feComposite operator="in" in="displaced" in2="coloredNoise" />
        </filter>
        <filter id="ink-blot" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>

    <!-- SEASONAL ATMOSPHERE DYNAMIC LAYER -->
    <div class="absolute inset-0 z-[1] overflow-hidden">
      <div v-for="(season, sIdx) in seasons" :key="'season-'+sIdx" class="absolute inset-0 transition-opacity duration-[3000ms]" :class="activeVisualIndex === sIdx ? 'opacity-100' : 'opacity-0'">
        
        <!-- WET SEASON: Falling Rain Particles -->
        <template v-if="season.name === 'Wet Season'">
          <div class="absolute inset-0 opacity-40">
            <div v-for="p in distantParticles" :key="p.id" class="absolute blur-[1px]" :class="season.particleClass" :style="getParticleStyle(p, season.name, false)">
              <div class="stem"></div><div class="splat"></div>
            </div>
          </div>
          <div class="absolute inset-0">
            <div v-for="p in foregroundParticles" :key="p.id" class="absolute blur-[0.3px]" :class="season.particleClass" :style="getParticleStyle(p, season.name, true)">
              <div class="stem"></div><div class="splat"></div>
            </div>
          </div>
        </template>

        <!-- ALL OTHER SEASONS: Floating/Falling Particles -->
        <template v-else>
          <!-- DRY SEASON EXCLUSIVE: Gentle Shifting Sun Rays -->
          <div v-if="season.name === 'Dry Season'" class="absolute inset-0 overflow-hidden opacity-40">
            <div class="sun-ray ray-1" :class="settings.darkMode ? 'bg-amber-200/10' : 'bg-amber-300/30'"></div>
            <div class="sun-ray ray-2" :class="settings.darkMode ? 'bg-amber-100/5' : 'bg-amber-200/20'"></div>
            <div class="sun-ray ray-3" :class="settings.darkMode ? 'bg-amber-200/10' : 'bg-amber-300/25'"></div>
          </div>

          <!-- Restored loop for Spring, Summer, Autumn, Winter, and Dry Season -->
          <div class="absolute inset-0 opacity-40">
            <div v-for="p in distantParticles" :key="'dist-'+p.id" class="absolute blur-[2px]" :class="season.particleClass" :style="getParticleStyle(p, season.name, false)"></div>
          </div>
          <div class="absolute inset-0 opacity-80">
            <div v-for="p in foregroundParticles" :key="'fore-'+p.id" class="absolute blur-[0.5px]" :class="season.particleClass" :style="getParticleStyle(p, season.name, true)"></div>
          </div>
        </template>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* Sun Rays Animation Styles */
.sun-ray {
  position: absolute;
  top: -50%;
  bottom: -50%;
  width: 45vw;
  transform: rotate(25deg);
  filter: blur(70px);
  pointer-events: none;
}

.ray-1 {
  left: -10%;
  animation: sun-sway 20s ease-in-out infinite alternate;
}

.ray-2 {
  left: 30%;
  animation: sun-sway 26s ease-in-out infinite alternate-reverse;
}

.ray-3 {
  left: 65%;
  animation: sun-sway 22s ease-in-out infinite alternate;
}

@keyframes sun-sway {
  0% {
    transform: rotate(20deg) translateX(-10px) scale(1);
    opacity: 0.5;
  }
  50% {
    transform: rotate(28deg) translateX(20px) scale(1.06);
    opacity: 0.9;
  }
  100% {
    transform: rotate(22deg) translateX(-15px) scale(0.94);
    opacity: 0.4;
  }
}
</style>