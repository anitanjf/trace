import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { settings } from '../store'

let audioContext = null
let ambientNodes = null
let audioUnlocked = false
let routeAllowsAudio = false
let practicePaused = false

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value) || 0))

const getAudioContext = () => {
  if (audioContext || typeof window === 'undefined') return audioContext
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  audioContext = new AudioContextClass()
  return audioContext
}

const stopAmbient = (fadeSeconds = 0.12) => {
  if (!ambientNodes || !audioContext) return
  const { source, gain } = ambientNodes
  ambientNodes = null
  const now = audioContext.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds)
  try { source.stop(now + fadeSeconds + 0.02) } catch {}
}

const createNoiseBuffer = (context, mode) => {
  const duration = 12
  const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate)
  const channel = buffer.getChannelData(0)
  let brown = 0

  for (let index = 0; index < channel.length; index++) {
    const white = Math.random() * 2 - 1
    if (mode === 'room') {
      brown = (brown + 0.02 * white) / 1.02
      channel[index] = brown * 3.2
    } else {
      channel[index] = white
    }
  }
  return buffer
}

const ambientLevel = () => {
  const volume = clamp(settings.value.ambientVolume)
  return volume * (settings.value.ambienceMode === 'rain' ? 0.16 : 0.1)
}

const startAmbient = () => {
  const context = getAudioContext()
  const mode = settings.value.ambienceMode
  if (!context || !audioUnlocked || !routeAllowsAudio || practicePaused || document.hidden || mode === 'off') return

  stopAmbient()
  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()

  source.buffer = createNoiseBuffer(context, mode)
  source.loop = true
  filter.type = mode === 'rain' ? 'bandpass' : 'lowpass'
  filter.frequency.value = mode === 'rain' ? 2400 : 520
  filter.Q.value = mode === 'rain' ? 0.55 : 0.35

  source.connect(filter)
  filter.connect(gain)
  gain.connect(context.destination)

  const now = context.currentTime
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(Math.max(ambientLevel(), 0.0001), now + 0.35)
  source.start()
  ambientNodes = { source, gain, mode }
}

const syncAmbient = () => {
  const mode = settings.value.ambienceMode
  const shouldPlay = audioUnlocked && routeAllowsAudio && !practicePaused && !document.hidden &&
    mode !== 'off' && clamp(settings.value.ambientVolume) > 0

  if (!shouldPlay) {
    stopAmbient()
    return
  }

  if (!ambientNodes || ambientNodes.mode !== mode) {
    startAmbient()
    return
  }

  const now = audioContext.currentTime
  ambientNodes.gain.gain.cancelScheduledValues(now)
  ambientNodes.gain.gain.setTargetAtTime(Math.max(ambientLevel(), 0.0001), now, 0.05)
}

const unlockAudio = async () => {
  const context = getAudioContext()
  if (!context) return
  try {
    if (context.state === 'suspended') await context.resume()
    audioUnlocked = context.state === 'running'
    if (audioUnlocked) syncAmbient()
  } catch {
    audioUnlocked = false
  }
}

export const setPracticeAudioPaused = (paused) => {
  practicePaused = Boolean(paused)
  syncAmbient()
}

export const playKeystrokeSound = ({ mistake = false, backspace = false } = {}) => {
  if (!settings.value.keystrokeSound || clamp(settings.value.keystrokeVolume) <= 0) return
  const context = getAudioContext()
  if (!context || !audioUnlocked || context.state !== 'running' || document.hidden || practicePaused) return

  const duration = backspace ? 0.04 : 0.025
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < data.length; index++) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / data.length)
  }

  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  filter.type = 'bandpass'
  filter.frequency.value = backspace ? 900 : mistake ? 1250 : 1900 + Math.random() * 350
  filter.Q.value = 0.8

  const now = context.currentTime
  const level = Math.max(clamp(settings.value.keystrokeVolume) * (mistake ? 0.075 : 0.055), 0.0001)
  gain.gain.setValueAtTime(level, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(context.destination)
  source.start(now)
  source.stop(now + duration)
}

export const useAppAudio = () => {
  const route = useRoute()
  const audioRoutes = new Set(['/settings', '/meditation', '/daily', '/flow'])

  const updateRoute = () => {
    routeAllowsAudio = audioRoutes.has(route.path)
    syncAmbient()
  }

  const handleVisibility = async () => {
    const context = getAudioContext()
    if (!context) return
    if (document.hidden) {
      stopAmbient()
      if (context.state === 'running') await context.suspend()
      return
    }
    if (audioUnlocked && context.state === 'suspended') await context.resume()
    syncAmbient()
  }

  onMounted(() => {
    window.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true })
    window.addEventListener('keydown', unlockAudio, { capture: true })
    document.addEventListener('visibilitychange', handleVisibility)
  })

  watch(() => route.path, updateRoute, { immediate: true })
  watch(
    () => [settings.value.ambienceMode, settings.value.ambientVolume],
    syncAmbient,
    { immediate: true }
  )

  onBeforeUnmount(() => {
    window.removeEventListener('pointerdown', unlockAudio, { capture: true })
    window.removeEventListener('keydown', unlockAudio, { capture: true })
    document.removeEventListener('visibilitychange', handleVisibility)
    stopAmbient(0.02)
  })
}
