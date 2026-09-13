<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import ZenLoader from './ZenLoader.vue'

const props = defineProps({ reducedMotion: { type: Boolean, default: false } })
const emit = defineEmits(['finish'])
const finished = ref(false)
let finishTimer

function finish() {
  if (finished.value) return
  finished.value = true
  emit('finish')
}

onMounted(() => {
  finishTimer = window.setTimeout(finish, props.reducedMotion ? 100 : 4400)
})
onUnmounted(() => window.clearTimeout(finishTimer))

const letters = ['T', 'R', 'A', 'C', 'E']
</script>

<template>
  <section class="trace-intro absolute inset-0 z-50 flex items-center justify-center px-6"
           :class="{ 'trace-intro--still': reducedMotion, 'trace-intro--finished': finished }"
           aria-label="Welcome to Trace">
    <div class="trace-intro__content w-full max-w-lg text-center">
      <div class="trace-intro__note">
        <p class="trace-intro__eyebrow font-ui-sans uppercase">A note from Trace</p>
        <p class="trace-intro__verse font-ui-serif italic">Even the smallest mark can begin a quiet journey.</p>
      </div>

      <div class="trace-intro__path" aria-hidden="true">
        <div class="trace-intro__traveler">
          <ZenLoader compact :show-thought="false" text="" />
        </div>
      </div>

      <div class="trace-intro__wordmark" aria-label="TRACE">
        <div class="trace-intro__letters font-ui-serif" aria-hidden="true">
          <span v-for="(letter, index) in letters" :key="index" class="trace-intro__letter" :style="{ '--letter': index }">{{ letter }}</span>
        </div>
        <span class="trace-intro__brush" aria-hidden="true"></span>
        <p class="trace-intro__tagline font-ui-sans uppercase">A little stillness in every word</p>
      </div>
    </div>
    <button v-if="!finished" type="button" class="trace-intro__skip font-ui-sans uppercase" @click="finish">Enter now <span aria-hidden="true">→</span></button>
  </section>
</template>

<style scoped>
.trace-intro { background: var(--trace-paper); color: var(--trace-text-primary); overflow: hidden; }
.trace-intro__content { transform: translateY(-4vh); }
.trace-intro__note { animation: intro-note 2.5s ease both; }
.trace-intro__eyebrow { font-size: .65rem; letter-spacing: .32em; opacity: .65; }
.trace-intro__verse { max-width: 27rem; margin: 1.3rem auto 0; font-size: clamp(1.1rem, 3vw, 1.55rem); line-height: 1.55; }
.trace-intro__path { position: relative; height: 9rem; max-width: 20rem; margin: 1.5rem auto 0; }
.trace-intro__traveler { position: absolute; top: 0; left: calc(50% - 2.5rem); animation: intro-roll 2.7s cubic-bezier(.37,.01,.63,.99) both; }
.trace-intro__traveler :deep(.animate-float) { animation: none; }
.trace-intro__traveler :deep(.zen-loader--compact) { animation: none; }
.trace-intro__wordmark { position: absolute; inset: 50% 1.5rem auto; text-align: center; transform: translateY(-53%); pointer-events: none; }
.trace-intro__letters { display: flex; justify-content: center; gap: .06em; font-size: clamp(3.4rem, 13vw, 6.5rem); font-weight: 700; line-height: 1.2; letter-spacing: .15em; padding-left: .15em; }
.trace-intro__letter { display: inline-block; clip-path: inset(0 100% 0 0); animation: intro-write .47s cubic-bezier(.2,.7,.28,1) calc(2.55s + var(--letter) * .25s) forwards; }
.trace-intro__brush { position: absolute; top: 24%; left: 12%; width: .35rem; height: 1rem; transform: rotate(-35deg); border-radius: 50%; background: var(--trace-season-accent); opacity: 0; animation: intro-brush 1.7s ease-in-out 2.5s both; }
.trace-intro__tagline { margin-top: 1.25rem; font-size: .63rem; letter-spacing: .31em; opacity: 0; animation: intro-tagline .7s ease 3.9s forwards; }
.trace-intro__skip { position: absolute; right: max(1.5rem, 5vw); bottom: max(2rem, 6vh); min-height: 44px; padding: .65rem 1rem; font-size: .65rem; letter-spacing: .18em; color: var(--trace-text-primary); opacity: .7; }
.trace-intro__skip:hover { opacity: 1; }
.trace-intro--finished .trace-intro__note, .trace-intro--finished .trace-intro__path { visibility: hidden; }
.trace-intro--finished .trace-intro__letter { clip-path: inset(0); }
.trace-intro--finished .trace-intro__tagline { opacity: .8; }
.trace-intro--still .trace-intro__note, .trace-intro--still .trace-intro__path, .trace-intro--still .trace-intro__brush { display: none; }
.trace-intro--still .trace-intro__letter { clip-path: inset(0); }
.trace-intro--still .trace-intro__tagline { opacity: .8; }
@keyframes intro-note { 0% { opacity: 0; transform: translateY(9px); } 22%, 74% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-7px); } }
@keyframes intro-roll { 0% { opacity: 0; transform: translateX(-110px) rotate(-95deg); filter: blur(3px); } 18% { opacity: 1; filter: blur(0); } 68% { opacity: 1; transform: translateX(110px) rotate(200deg); filter: blur(0); } 100% { opacity: 0; transform: translateX(135px) rotate(260deg) scale(.65); filter: blur(9px); } }
@keyframes intro-write { to { clip-path: inset(0); } }
@keyframes intro-brush { 0% { left: 12%; opacity: 0; } 12% { opacity: .7; } 90% { opacity: .7; } 100% { left: 88%; opacity: 0; } }
@keyframes intro-tagline { to { opacity: .8; } }
@media (prefers-reduced-motion: reduce) { .trace-intro *, .trace-intro *::before, .trace-intro *::after { animation: none !important; } }
</style>
