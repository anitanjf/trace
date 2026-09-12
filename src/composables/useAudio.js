import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { settings } from '../store'
import { getRealWorldSeason } from '../utils/helpers'

let audioContext = null
let seasonalLayer = null
let lofiLayer = null
let audioUnlocked = false
let routeAllowsBackgroundAudio = false
let practicePaused = false

const clamp = value => Math.min(1, Math.max(0, Number(value) || 0))
const audioRoutes = new Set(['/settings', '/meditation', '/daily', '/flow'])

const getAudioContext = () => {
  if (audioContext || typeof window === 'undefined') return audioContext
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  audioContext = new AudioContextClass({ latencyHint: 'interactive' })
  return audioContext
}

const createNoiseBuffer = (context, color = 'white', seconds = 16) => {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate)
  const channel = buffer.getChannelData(0)
  let brown = 0
  let pink0 = 0
  let pink1 = 0

  for (let index = 0; index < channel.length; index++) {
    const white = Math.random() * 2 - 1
    if (color === 'brown') {
      brown = (brown + 0.02 * white) / 1.02
      channel[index] = brown * 3.2
    } else if (color === 'pink') {
      pink0 = 0.997 * pink0 + 0.029 * white
      pink1 = 0.985 * pink1 + 0.032 * white
      channel[index] = (pink0 + pink1 + white * 0.12) * 0.35
    } else {
      channel[index] = white
    }
  }
  return buffer
}

const fadeAndStop = (layer, fadeSeconds = 0.18) => {
  if (!layer || !audioContext) return
  if (layer.timer) clearInterval(layer.timer)
  const now = audioContext.currentTime
  layer.output.gain.cancelScheduledValues(now)
  layer.output.gain.setValueAtTime(Math.max(layer.output.gain.value, 0.0001), now)
  layer.output.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds)
  for (const source of layer.sources) {
    try { source.stop(now + fadeSeconds + 0.03) } catch {}
  }
}

const stopSeasonal = () => {
  if (!seasonalLayer) return
  const layer = seasonalLayer
  seasonalLayer = null
  fadeAndStop(layer)
}

const stopLofi = () => {
  if (!lofiLayer) return
  const layer = lofiLayer
  lofiLayer = null
  fadeAndStop(layer)
}

const activeSeasonIndex = () =>
  settings.value.themeMode === 'locked'
    ? Number(settings.value.lockedSeason || 0)
    : getRealWorldSeason()

const seasonProfiles = [
  { name: 'spring', color: 'pink', type: 'bandpass', frequency: 1250, q: 0.35, level: 0.12, drift: 0.055 },
  { name: 'summer', color: 'white', type: 'bandpass', frequency: 3900, q: 1.2, level: 0.07, drift: 0.11 },
  { name: 'autumn', color: 'pink', type: 'lowpass', frequency: 1050, q: 0.45, level: 0.13, drift: 0.075 },
  { name: 'winter', color: 'white', type: 'highpass', frequency: 1450, q: 0.3, level: 0.055, drift: 0.035 },
  { name: 'dry-season', color: 'brown', type: 'lowpass', frequency: 680, q: 0.25, level: 0.12, drift: 0.045 },
  { name: 'wet-season', color: 'white', type: 'bandpass', frequency: 2550, q: 0.5, level: 0.18, drift: 0.16 }
]

const seasonalLevel = profile => Math.max(clamp(settings.value.ambientVolume) * profile.level, 0.0001)

const startSeasonal = () => {
  const context = getAudioContext()
  const profile = seasonProfiles[activeSeasonIndex()] || seasonProfiles[0]
  if (!context || !audioUnlocked || !routeAllowsBackgroundAudio || practicePaused || document.hidden || !settings.value.seasonalAmbience) return

  stopSeasonal()
  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const output = context.createGain()
  const drift = context.createOscillator()
  const driftDepth = context.createGain()

  source.buffer = createNoiseBuffer(context, profile.color)
  source.loop = true
  filter.type = profile.type
  filter.frequency.value = profile.frequency
  filter.Q.value = profile.q

  const level = seasonalLevel(profile)
  output.gain.setValueAtTime(0.0001, context.currentTime)
  output.gain.exponentialRampToValueAtTime(level, context.currentTime + 0.5)
  drift.type = 'sine'
  drift.frequency.value = profile.drift
  driftDepth.gain.value = level * 0.18

  source.connect(filter)
  filter.connect(output)
  drift.connect(driftDepth)
  driftDepth.connect(output.gain)
  output.connect(context.destination)

  source.start()
  drift.start()
  seasonalLayer = { sources: [source, drift], output, profile: profile.name }
}

const lofiTracks = {
  'tea-house': {
    step: 4.4,
    wave: 'triangle',
    chords: [[220, 261.63, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 329.63]]
  },
  'moonlit-cafe': {
    step: 4.8,
    wave: 'sine',
    chords: [[164.81, 196, 246.94], [146.83, 185, 220], [130.81, 164.81, 207.65], [146.83, 174.61, 220]]
  },
  'temple-garden': {
    step: 5.2,
    wave: 'sine',
    chords: [[196, 246.94, 293.66], [220, 261.63, 329.63], [174.61, 220, 293.66], [196, 246.94, 329.63]]
  }
}

const scheduleLofiChord = layer => {
  if (!audioContext || layer !== lofiLayer) return
  const chord = layer.track.chords[layer.chordIndex % layer.track.chords.length]
  layer.chordIndex += 1
  const now = audioContext.currentTime
  const duration = layer.track.step + 0.35

  chord.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator()
    const voice = audioContext.createGain()
    const tone = audioContext.createBiquadFilter()
    oscillator.type = layer.track.wave
    oscillator.frequency.value = frequency / (index === 0 ? 2 : 1)
    oscillator.detune.value = (Math.random() - 0.5) * 5
    tone.type = 'lowpass'
    tone.frequency.value = 1250
    voice.gain.setValueAtTime(0.0001, now)
    voice.gain.exponentialRampToValueAtTime(0.07 / chord.length, now + 0.5)
    voice.gain.setValueAtTime(0.07 / chord.length, now + duration - 0.8)
    voice.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(tone)
    tone.connect(voice)
    voice.connect(layer.output)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.02)
  })
}

const lofiLevel = () => Math.max(clamp(settings.value.lofiVolume) * 0.42, 0.0001)

const startLofi = () => {
  const context = getAudioContext()
  const trackName = settings.value.lofiTrack
  const track = lofiTracks[trackName]
  if (!context || !track || !audioUnlocked || !routeAllowsBackgroundAudio || practicePaused || document.hidden) return

  stopLofi()
  const output = context.createGain()
  const crackle = context.createBufferSource()
  const crackleFilter = context.createBiquadFilter()
  const crackleGain = context.createGain()
  output.gain.setValueAtTime(0.0001, context.currentTime)
  output.gain.exponentialRampToValueAtTime(lofiLevel(), context.currentTime + 0.6)
  output.connect(context.destination)

  crackle.buffer = createNoiseBuffer(context, 'pink', 12)
  crackle.loop = true
  crackleFilter.type = 'highpass'
  crackleFilter.frequency.value = 2600
  crackleGain.gain.value = 0.012
  crackle.connect(crackleFilter)
  crackleFilter.connect(crackleGain)
  crackleGain.connect(output)
  crackle.start()

  lofiLayer = { sources: [crackle], output, track, trackName, chordIndex: 0, timer: null }
  scheduleLofiChord(lofiLayer)
  lofiLayer.timer = setInterval(() => scheduleLofiChord(lofiLayer), track.step * 1000)
}

const backgroundAudioAllowed = () =>
  audioUnlocked && routeAllowsBackgroundAudio && !practicePaused && !document.hidden

const syncBackgroundAudio = () => {
  const seasonProfile = seasonProfiles[activeSeasonIndex()] || seasonProfiles[0]
  const playSeason = backgroundAudioAllowed() && settings.value.seasonalAmbience && clamp(settings.value.ambientVolume) > 0
  if (!playSeason) stopSeasonal()
  else if (!seasonalLayer || seasonalLayer.profile !== seasonProfile.name) startSeasonal()
  else seasonalLayer.output.gain.setTargetAtTime(seasonalLevel(seasonProfile), audioContext.currentTime, 0.08)

  const trackName = settings.value.lofiTrack
  const playLofi = backgroundAudioAllowed() && trackName !== 'off' && clamp(settings.value.lofiVolume) > 0
  if (!playLofi) stopLofi()
  else if (!lofiLayer || lofiLayer.trackName !== trackName) startLofi()
  else lofiLayer.output.gain.setTargetAtTime(lofiLevel(), audioContext.currentTime, 0.08)
}

const removeUnlockListeners = () => {
  window.removeEventListener('pointerdown', unlockAudio, { capture: true })
  window.removeEventListener('keydown', unlockAudio, { capture: true })
}

const unlockAudio = async () => {
  const context = getAudioContext()
  if (!context) return
  try {
    if (context.state === 'suspended') await context.resume()
    audioUnlocked = context.state === 'running'
    if (audioUnlocked) {
      removeUnlockListeners()
      syncBackgroundAudio()
    }
  } catch {
    audioUnlocked = false
  }
}

const playTap = ({ frequency, duration, volume, noise = 0 }) => {
  const context = getAudioContext()
  if (!context || !audioUnlocked || context.state !== 'running' || document.hidden) return
  const now = context.currentTime
  const oscillator = context.createOscillator()
  const toneGain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, now)
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(frequency * 0.68, 60), now + duration)
  toneGain.gain.setValueAtTime(Math.max(volume, 0.0001), now)
  toneGain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  oscillator.connect(toneGain)
  toneGain.connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + duration)

  if (noise > 0) {
    const source = context.createBufferSource()
    const noiseGain = context.createGain()
    const filter = context.createBiquadFilter()
    source.buffer = createNoiseBuffer(context, 'white', 0.06)
    filter.type = 'bandpass'
    filter.frequency.value = frequency * 5
    filter.Q.value = 0.7
    noiseGain.gain.setValueAtTime(noise, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.8)
    source.connect(filter)
    filter.connect(noiseGain)
    noiseGain.connect(context.destination)
    source.start(now)
    source.stop(now + duration)
  }
}

export const setPracticeAudioPaused = paused => {
  practicePaused = Boolean(paused)
  syncBackgroundAudio()
}

export const playKeystrokeSound = ({ mistake = false, backspace = false } = {}) => {
  if (!settings.value.keystrokeSound || clamp(settings.value.keystrokeVolume) <= 0 || practicePaused) return
  if (!audioUnlocked) {
    void unlockAudio()
    return
  }
  const volume = clamp(settings.value.keystrokeVolume)
  playTap({
    frequency: backspace ? 145 : mistake ? 175 : 225 + Math.random() * 24,
    duration: backspace ? 0.065 : 0.052,
    volume: volume * 0.12,
    noise: volume * (mistake ? 0.075 : 0.09)
  })
}

const playInterfaceClick = () => {
  if (!settings.value.interfaceSound || clamp(settings.value.interfaceVolume) <= 0) return
  playTap({
    frequency: 310,
    duration: 0.075,
    volume: clamp(settings.value.interfaceVolume) * 0.075,
    noise: clamp(settings.value.interfaceVolume) * 0.025
  })
}

export const useAppAudio = () => {
  const route = useRoute()

  const updateRoute = () => {
    routeAllowsBackgroundAudio = audioRoutes.has(route.path)
    syncBackgroundAudio()
  }

  const handleClick = event => {
    if (event.target.closest?.('button, a, [role="button"]')) playInterfaceClick()
  }

  const handleVisibility = async () => {
    const context = getAudioContext()
    if (!context) return
    if (document.hidden) {
      stopSeasonal()
      stopLofi()
      if (context.state === 'running') await context.suspend()
      return
    }
    if (audioUnlocked && context.state === 'suspended') await context.resume()
    syncBackgroundAudio()
  }

  onMounted(() => {
    if (!audioUnlocked) {
      window.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true })
      window.addEventListener('keydown', unlockAudio, { capture: true })
    }
    document.addEventListener('click', handleClick)
    document.addEventListener('visibilitychange', handleVisibility)
  })

  watch(() => route.path, updateRoute, { immediate: true })
  watch(
    () => [
      settings.value.seasonalAmbience,
      settings.value.ambientVolume,
      settings.value.lofiTrack,
      settings.value.lofiVolume,
      settings.value.themeMode,
      settings.value.lockedSeason
    ],
    syncBackgroundAudio,
    { immediate: true }
  )

  onBeforeUnmount(() => {
    removeUnlockListeners()
    document.removeEventListener('click', handleClick)
    document.removeEventListener('visibilitychange', handleVisibility)
    stopSeasonal()
    stopLofi()
  })
}
