<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fallbackQuotes, seasons } from '../utils/constants'
import { currentUser, settings, stats, recordMultiplayerMatch } from '../store'
import { publishLeaderboardResult } from '../services/leaderboard'
import { playMatchCue } from '../composables/useAudio'
import { countryFlag } from '../utils/countries'
import {
  buildSharedPassage,
  MAX_PLAYERS,
  MATCH_RITUAL_MS,
  MIN_PLAYERS,
  ROOM_CODE_LENGTH,
  WORD_COUNTS,
  normalizeRoomCode
} from '../utils/quietRoomProtocol'
import { useQuietRoom } from '../composables/useQuietRoom'
import InkButton from '../components/ui/InkButton.vue'
import AuthModal from '../components/AuthModal.vue'
import TypingBoard from '../components/TypingBoard.vue'

const router = useRouter()
const route = useRoute()
const joinCode = ref('')
const joinError = ref('')
const copyState = ref('Copy invitation')
const passageIndex = ref(0)
const selectedWordCount = ref(50)
const showAuth = ref(false)
const pendingAction = ref(null)
const countdown = ref(0)
const matchNow = ref(Date.now())
const rematchWordCount = ref(50)
const personalBest = ref(false)
const lastCueStage = ref('')
let countdownTimer = null
let matchClockTimer = null

const {
  roomCode,
  room,
  players,
  localPlayer,
  connectedPlayers,
  localSeat,
  isHost,
  isLobby,
  isPlaying,
  hasEnded,
  canStart,
  roomError,
  isBusy,
  serverOffset,
  createRoom: createOnlineRoom,
  createRematch,
  joinRoom,
  joinPublicRoom,
  resumeRoom,
  startMatch,
  leaveRoom,
  suspendRoom,
  publishProgress
} = useQuietRoom()

const passage = computed(() => {
  if (room.value?.meta?.passageText) {
    return {
      text: room.value.meta.passageText,
      author: room.value.meta.passageAuthor || 'A Shared Breath'
    }
  }
  return fallbackQuotes[passageIndex.value % fallbackQuotes.length] || fallbackQuotes[0]
})
const visibleError = computed(() => joinError.value || roomError.value)
const lobbyCount = computed(() => connectedPlayers.value.length)
const isPrivate = computed(() => room.value?.meta?.type === 'private')
const roomWordCount = computed(() => Number(room.value?.meta?.wordCount) || selectedWordCount.value)
const forfeits = computed(() => room.value?.meta?.forfeits || {})
const localForfeit = computed(() => forfeits.value[localSeat.value] || null)
const idleRemaining = computed(() => Math.max(0, 30 - Math.floor(
  (matchNow.value + serverOffset.value - Math.max(Number(room.value?.meta?.startedAt || 0) + MATCH_RITUAL_MS, Number(localPlayer.value?.lastActiveAt || 0))) / 1000
)))
const ritualElapsed = computed(() => room.value?.meta?.startedAt
  ? matchNow.value + serverOffset.value - Number(room.value.meta.startedAt)
  : 0)
const ritualActive = computed(() => isPlaying.value && ritualElapsed.value < MATCH_RITUAL_MS)
const ritualStage = computed(() => ritualElapsed.value < 1100
  ? 'Settle'
  : ritualElapsed.value < 2300 ? 'Breathe' : 'Begin')
const finishers = computed(() => [...players.value].sort((a, b) => {
  if (Boolean(forfeits.value[a.seat]) !== Boolean(forfeits.value[b.seat])) return forfeits.value[a.seat] ? 1 : -1
  if (a.complete !== b.complete) return a.complete ? -1 : 1
  if (a.complete && b.complete) return Number(a.finishedAt || Infinity) - Number(b.finishedAt || Infinity)
  return Number(b.progress || 0) - Number(a.progress || 0)
}))

const fireflyColors = {
  one: '#F2B8C6',
  two: '#A8D5BA',
  three: '#F3D28A',
  four: '#9CC7E8',
  five: '#C6AFE5'
}

const winner = computed(() => finishers.value.find(player => !forfeits.value[player.seat]) || null)
const raceWhisper = computed(() => {
  if (!isPlaying.value || ritualActive.value || !localPlayer.value || localPlayer.value.complete) return ''
  const active = players.value.filter(player => !forfeits.value[player.seat])
  if (active.length < 2) return 'Keep your light with the line.'
  const sorted = [...active].sort((a, b) => Number(b.progress || 0) - Number(a.progress || 0))
  const place = sorted.findIndex(player => player.seat === localSeat.value)
  const leaderGap = Number(sorted[0]?.progress || 0) - Number(localPlayer.value.progress || 0)
  const nearest = active
    .filter(player => player.seat !== localSeat.value)
    .map(player => Math.abs(Number(player.progress || 0) - Number(localPlayer.value.progress || 0)))
    .sort((a, b) => a - b)[0]
  if (place === 0 && leaderGap === 0) return 'Your light is nearest the dawn.'
  if (nearest <= 3) return 'Another light moves beside yours.'
  if (leaderGap <= 10) return 'The leading glow is only a breath ahead.'
  return 'Follow the page; distant lights may meet again.'
})
const resultMilestones = computed(() => {
  const player = localPlayer.value
  if (!player || !player.complete || localForfeit.value) return []
  const notes = []
  if (personalBest.value) notes.push('A new personal current')
  if (Number(player.accuracy) === 100) notes.push('A perfectly clear passage')
  if (winner.value?.seat === localSeat.value) notes.push('First light to shore')
  if (Number(player.mistakes) > 0 && Number(player.accuracy) >= 90) notes.push('Found calm after a stumble')
  return notes.slice(0, 3)
})
const publishedLeaderboardRooms = new Set()
watch([hasEnded, localPlayer], ([ended, player]) => {
  if (!ended || !player || !roomCode.value || !currentUser.value) return
  const ranked = finishers.value
  const priorBest = Math.max(0, ...Object.entries(stats.value.multiplayerMatches || {})
    .filter(([code, match]) => code !== roomCode.value && Number(match.wordCount) === roomWordCount.value && match.finished)
    .map(([, match]) => Number(match.wpm) || 0))
  personalBest.value = Boolean(player.complete && !forfeits.value[player.seat] && Number(player.wpm) > priorBest)
  recordMultiplayerMatch({
    roomCode: roomCode.value,
    wordCount: roomWordCount.value,
    playedAt: Number(room.value?.meta?.endedAt) || Date.now(),
    placement: ranked.findIndex(entry => entry.seat === localSeat.value) + 1,
    players: ranked.length,
    finished: player.complete && !forfeits.value[player.seat],
    won: winner.value?.seat === player.seat && !forfeits.value[player.seat],
    dnf: Boolean(forfeits.value[player.seat]),
    wpm: player.wpm,
    accuracy: player.accuracy,
    elapsedMs: player.elapsedMs
  })
  if (!publishedLeaderboardRooms.has(roomCode.value)) {
    publishedLeaderboardRooms.add(roomCode.value)
    void publishLeaderboardResult(room.value, roomCode.value, { ...player, seat: localSeat.value })
      .catch(() => { joinError.value = 'Your result is saved in your profile, but could not join the leaderboard. Publish the updated Realtime Database rules, then check the recent result on the leaderboard.' })
  }
}, { immediate: true })
const playerInitials = name => String(name || 'Traveler').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
const matchTime = elapsedMs => {
  if (!Number.isFinite(Number(elapsedMs)) || Number(elapsedMs) <= 0) return '—'
  const seconds = Math.round(Number(elapsedMs) / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

watch([() => room.value?.meta?.startsAt, serverOffset], ([startsAt]) => {
  clearInterval(countdownTimer)
  if (!startsAt) {
    countdown.value = 0
    return
  }
  const update = () => { countdown.value = Math.max(0, Math.ceil((Number(startsAt) - Date.now() - serverOffset.value) / 1000)) }
  update()
  countdownTimer = setInterval(update, 250)
})

watch([ritualActive, ritualStage], ([active, stage]) => {
  if (!active || lastCueStage.value === stage) return
  lastCueStage.value = stage
  playMatchCue(stage === 'Begin' ? 'begin' : 'settle')
})
watch(() => localPlayer.value?.complete, (complete, previous) => {
  if (complete && !previous) playMatchCue('finish')
})
watch(hasEnded, (ended, previous) => {
  if (ended && !previous) playMatchCue('results')
})
watch(lobbyCount, (count, previous) => {
  if (isLobby.value && Number.isFinite(previous) && count > previous) playMatchCue('arrival')
})

const describeFailure = result => ({
  invalid: 'Enter the full ' + ROOM_CODE_LENGTH + '-character invitation.',
  missing: 'That invitation could not be found.',
  expired: 'That room has returned to stillness.',
  full: 'Five travelers already share this passage.',
  started: 'That passage has already begun.',
  collision: 'The room could not be formed. Please try once more.',
  auth: 'Sign in to enter multiplayer.',
  'public-matchmaking': 'Public gatherings are found through matchmaking. Choose Find public room instead.',
  forfeited: 'Your light has left this passage. Gather again in a new room.',
  ended: 'This passage has already come to rest. Gather again in a new room.'
}[result?.reason] || result?.message || 'The room could not be opened.')

const finishEntry = result => {
  if (!result?.ok) {
    if (result?.reason !== 'none') joinError.value = describeFailure(result)
    return
  }
  passageIndex.value = result.passageIndex
  selectedWordCount.value = Number(room.value?.meta?.wordCount) || selectedWordCount.value
  rematchWordCount.value = selectedWordCount.value
  joinCode.value = room.value?.meta?.type === 'private' ? result.code : ''
  router.replace({ query: room.value?.meta?.type === 'private' ? { room: result.code } : {} })
}

const withAuth = action => {
  if (currentUser.value) return false
  pendingAction.value = action
  showAuth.value = true
  return true
}

const passageOptions = (wordCount = selectedWordCount.value) => {
  const seed = Math.floor(Math.random() * 10_000)
  const generated = buildSharedPassage(fallbackQuotes, wordCount, seed)
  return {
    wordCount,
    passageText: generated.text,
    passageAuthor: generated.author
  }
}

const openRematch = async () => {
  joinError.value = ''
  const count = Number(rematchWordCount.value) || roomWordCount.value
  const result = await createRematch(Math.floor(Math.random() * fallbackQuotes.length), passageOptions(count))
  finishEntry(result)
}

const joinRematch = async () => {
  const code = room.value?.meta?.rematch?.code
  if (!code) return
  await leaveRoom()
  finishEntry(await joinRoom(code))
}

const findAnother = async () => {
  const count = roomWordCount.value
  await leaveRoom()
  selectedWordCount.value = count
  await findPublic()
}

const enterRoom = async code => {
  joinError.value = ''
  const normalized = normalizeRoomCode(code)
  if (normalized.length !== ROOM_CODE_LENGTH) {
    joinError.value = 'Enter the full ' + ROOM_CODE_LENGTH + '-character invitation.'
    return
  }
  if (withAuth({ type: 'join', code: normalized })) return
  finishEntry(await joinRoom(normalized))
}

const createPrivate = async () => {
  joinError.value = ''
  if (withAuth({ type: 'private' })) return
  finishEntry(await createOnlineRoom(Math.floor(Math.random() * fallbackQuotes.length), 'private', passageOptions()))
}

const findPublic = async () => {
  joinError.value = ''
  if (withAuth({ type: 'public' })) return
  finishEntry(await joinPublicRoom(Math.floor(Math.random() * fallbackQuotes.length), passageOptions()))
}

const returnHome = async () => {
  if (roomCode.value) await suspendRoom()
  router.push('/')
}

const leave = async () => {
  await leaveRoom()
  joinCode.value = ''
  router.replace({ query: {} })
}

const copyInvitation = async () => {
  try {
    const href = router.resolve({ name: 'QuietMultiplayer', query: { room: roomCode.value } }).href
    await navigator.clipboard.writeText(new URL(href, window.location.origin).href)
    copyState.value = 'Invitation copied'
  } catch {
    copyState.value = 'Code: ' + roomCode.value
  }
  window.setTimeout(() => { copyState.value = 'Copy invitation' }, 2200)
}

onMounted(async () => {
  matchClockTimer = setInterval(() => { matchNow.value = Date.now() }, 100)
  const requested = normalizeRoomCode(route.query.room)
  if (requested.length === ROOM_CODE_LENGTH) await enterRoom(requested)
  else if (currentUser.value) finishEntry(await resumeRoom())
})

onBeforeUnmount(() => {
  clearInterval(countdownTimer)
  clearInterval(matchClockTimer)
})

watch(currentUser, async user => {
  if (!user) return
  if (pendingAction.value) {
    const action = pendingAction.value
    pendingAction.value = null
    showAuth.value = false
    if (action.type === 'private') await createPrivate()
    else if (action.type === 'public') await findPublic()
    else await enterRoom(action.code)
  } else if (!roomCode.value && !route.query.room) {
    finishEntry(await resumeRoom())
  }
})
</script>

<template>
  <main class="relative z-10 w-full min-h-[100dvh] px-5 py-7 sm:px-8 sm:py-10 font-ui-sans overflow-y-auto" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">
    <div class="mx-auto w-full max-w-6xl">
      <header class="flex items-start justify-between gap-5 mb-8 sm:mb-10">
        <div>
          <h1 class="text-3xl sm:text-4xl tracking-[0.2em] uppercase font-light font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">Shared Passage</h1>
          <p class="mt-3 text-[10px] tracking-[0.08em] opacity-65">A quiet race across the same page.</p>
        </div>
        <InkButton v-if="!roomCode" variant="soft" compact class="uppercase tracking-[0.16em] text-[10px]" @click="returnHome">Return home</InkButton>
      </header>

      <section v-if="!roomCode" class="mx-auto max-w-3xl">
        <div class="relative isolate px-6 py-8 sm:px-10 sm:py-11 text-center mb-6">
          <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-[0.25]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
          <p class="font-ui-serif text-xl sm:text-2xl leading-relaxed mb-3">Move together. Arrive in your own rhythm.</p>
          <p class="mx-auto max-w-xl text-xs leading-relaxed opacity-70">Choose the length of your shared breath. Each colored firefly shows a traveler’s place without turning the practice into pressure.</p>
        </div>

        <fieldset class="mb-6">
          <legend class="w-full text-center text-[9px] uppercase tracking-[0.24em] opacity-55 mb-4">Choose a shared breath</legend>
          <div class="grid grid-cols-3 gap-3">
            <button v-for="count in WORD_COUNTS" :key="count" type="button" class="relative isolate min-h-16 px-3 transition-transform hover:scale-[1.01]" :aria-pressed="selectedWordCount === count" @click="selectedWordCount = count">
              <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-2xl transition-opacity" :class="selectedWordCount === count ? 'opacity-30' : 'opacity-[0.1]'" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
              <span class="block font-ui-serif text-base">{{ count }}</span>
              <span class="block mt-1 text-[8px] uppercase tracking-[0.14em] opacity-50">{{ count === 50 ? 'Short breath' : count === 100 ? 'Steady breath' : 'Deep exhale' }}</span>
            </button>
          </div>
        </fieldset>

        <div class="grid sm:grid-cols-2 gap-4 mb-6">
          <article class="relative isolate px-6 py-7 min-h-48 flex flex-col">
            <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-2xl opacity-[0.18]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            <p class="text-[9px] uppercase tracking-[0.22em] opacity-55 mb-3">Private room</p>
            <h2 class="font-ui-serif text-xl mb-2">Invite your circle</h2>
            <p class="text-xs leading-relaxed opacity-65 mb-6">Create a {{ selectedWordCount }}-word room, invite up to four people, and begin when at least two are present.</p>
            <InkButton variant="primary" block class="mt-auto uppercase tracking-[0.14em] text-[10px]" :disabled="isBusy" @click="createPrivate">{{ isBusy ? 'Opening…' : 'Create private room' }}</InkButton>
          </article>

          <article class="relative isolate px-6 py-7 min-h-48 flex flex-col">
            <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-2xl opacity-[0.12]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            <p class="text-[9px] uppercase tracking-[0.22em] opacity-55 mb-3">Public room</p>
            <h2 class="font-ui-serif text-xl mb-2">Join the gathering light</h2>
            <p class="text-xs leading-relaxed opacity-65 mb-6">Join others who chose {{ selectedWordCount }} words. After the second arrival, the lobby stays open for 30 seconds, up to five players.</p>
            <InkButton variant="soft" block class="mt-auto uppercase tracking-[0.14em] text-[10px]" :disabled="isBusy" @click="findPublic">{{ isBusy ? 'Listening…' : 'Find public room' }}</InkButton>
          </article>
        </div>

        <div class="relative isolate px-5 py-5 sm:px-7">
          <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-2xl opacity-[0.1]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
          <div class="flex items-stretch gap-2">
            <label class="sr-only" for="multiplayer-code">Invitation code</label>
            <input id="multiplayer-code" v-model="joinCode" :maxlength="ROOM_CODE_LENGTH" autocomplete="off" placeholder="INVITATION CODE" class="min-w-0 flex-1 min-h-11 px-4 bg-transparent border-b text-center uppercase tracking-[0.22em] text-sm placeholder:opacity-40" :style="{ borderColor: 'var(--trace-border)', color: 'var(--trace-text-primary)' }" @keydown.enter="enterRoom(joinCode)" />
            <InkButton variant="ghost" compact class="uppercase tracking-[0.12em] text-[10px]" :disabled="isBusy" @click="enterRoom(joinCode)">Join</InkButton>
          </div>
        </div>
        <p v-if="visibleError" role="alert" class="mt-4 text-center text-xs">{{ visibleError }}</p>
      </section>

      <section v-else>
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <p class="text-[8px] uppercase tracking-[0.22em] opacity-50">{{ isPrivate ? 'Private invitation' : 'Public gathering' }} · {{ roomWordCount }} words</p>
            <p v-if="isPrivate" class="mt-1 text-lg tracking-[0.3em] font-ui-serif">{{ roomCode }}</p>
            <p v-else class="mt-1 text-xs opacity-65">Found through the gathering, not an invitation.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <InkButton v-if="isPrivate && isLobby" variant="ghost" compact class="uppercase tracking-[0.12em] text-[9px]" @click="copyInvitation">{{ copyState }}</InkButton>
            <InkButton v-if="!hasEnded" variant="soft" compact class="room-leave-button uppercase tracking-[0.12em] text-[9px]" @click="leave">Leave room</InkButton>
          </div>
        </div>
        <p v-if="visibleError" role="alert" class="mb-5 text-xs">{{ visibleError }}</p>

        <div v-if="isLobby" class="grid lg:grid-cols-[minmax(0,1fr)_18rem] gap-4 sm:gap-6 items-stretch">
          <div class="relative isolate px-6 py-8 sm:px-10 sm:py-10 flex flex-col justify-between min-h-[18rem]">
            <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-[0.18]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            <div>
              <p class="text-[9px] uppercase tracking-[0.24em] opacity-60 mb-5">{{ isPrivate ? 'Invitation only' : roomWordCount + ' words · open gathering' }}</p>
              <h2 class="font-ui-serif text-2xl sm:text-3xl leading-snug mb-3">{{ lobbyCount < MIN_PLAYERS ? 'A place for one more' : isPrivate ? 'Your circle is here' : 'The page opens soon' }}</h2>
              <p class="text-xs leading-relaxed opacity-70 max-w-lg">{{ isPrivate ? 'Share your invitation. Your circle can begin with two to five people.' : lobbyCount < MIN_PLAYERS ? 'The 30-second gathering begins when a second traveler joins.' : 'Others may join this same passage until the 30 seconds are over, up to five in all.' }}</p>
            </div>
            <div class="mt-8 flex flex-wrap items-end gap-x-8 gap-y-4">
              <template v-if="!isPrivate && countdown > 0">
                <div class="flex items-baseline gap-2" role="timer" aria-label="Seconds until the passage begins">
                  <span class="font-ui-serif text-5xl tabular-nums leading-none">{{ countdown }}</span>
                  <span class="text-[9px] uppercase tracking-[0.16em] opacity-60">seconds</span>
                </div>
                <p class="text-[10px] opacity-65">{{ lobbyCount }}/{{ MAX_PLAYERS }} places filled · gathering stays open</p>
              </template>
              <InkButton v-else-if="isPrivate && isHost" variant="primary" :disabled="!canStart" class="uppercase tracking-[0.14em] text-[10px]" @click="startMatch">{{ canStart ? 'Begin shared passage' : 'Waiting for one more' }}</InkButton>
              <span v-else class="text-[10px] uppercase tracking-[0.14em] opacity-65">{{ isPrivate ? 'Your host will begin when ready' : 'Listening for another traveler' }}</span>
            </div>
          </div>

          <aside class="relative isolate px-6 py-7 sm:px-7 sm:py-8">
            <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-2xl opacity-[0.11]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            <p class="text-[9px] uppercase tracking-[0.2em] opacity-60 mb-5">Here together · {{ lobbyCount }}/{{ MAX_PLAYERS }}</p>
            <ol class="space-y-2">
              <li v-for="index in MAX_PLAYERS" :key="index" class="flex items-center justify-between gap-3 min-h-10 text-xs" :class="players[index - 1] ? 'traveler-arrival' : 'opacity-45'">
                <template v-if="players[index - 1]">
                  <span class="flex min-w-0 items-center gap-3 font-ui-serif tracking-wide"><i class="shrink-0 w-2 h-2 rounded-full firefly-idle" :style="{ color: fireflyColors[players[index - 1].seat], backgroundColor: fireflyColors[players[index - 1].seat] }"></i><span class="min-w-0 truncate" :title="players[index - 1].name">{{ players[index - 1].name }}</span> <small v-if="players[index - 1].seat === localSeat" class="opacity-60">you</small></span>
                  <span class="shrink-0 text-[8px] uppercase tracking-[0.1em] opacity-55">{{ players[index - 1].connected === false ? 'Returning' : 'Here' }}</span>
                </template>
                <template v-else><span class="flex items-center gap-3"><i class="w-2 h-2 rounded-full border border-current opacity-50"></i> Open place</span></template>
              </li>
            </ol>
          </aside>
        </div>

        <div v-else-if="isPlaying">
          <p v-if="!ritualActive && !localPlayer?.complete && !localForfeit && room?.meta?.startedAt" class="mb-2 text-center text-[10px] uppercase tracking-[0.14em] opacity-60" role="timer">{{ idleRemaining }}s until your light rests without a keystroke</p>
          <p v-if="raceWhisper" class="mb-4 text-center font-ui-serif text-sm opacity-70" role="status">{{ raceWhisper }}</p>
          <p v-if="Object.keys(forfeits).length" class="mb-4 text-center text-[10px] tracking-wide opacity-70" role="status">{{ Object.keys(forfeits).length }} {{ Object.keys(forfeits).length === 1 ? 'traveler has' : 'travelers have' }} left the passage · the current continues while two lights remain.</p>
          <section class="relative isolate min-h-[31rem] flex items-center justify-center px-2 py-7 sm:px-5">
            <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-[0.1]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            <div v-if="ritualActive" class="match-ritual text-center px-6 py-12" role="status" aria-live="polite">
              <div class="ritual-orbit mx-auto mb-8" aria-hidden="true"><i v-for="player in players" :key="player.seat" :style="{ '--ritual-color': fireflyColors[player.seat] }"></i></div>
              <p class="text-[9px] uppercase tracking-[0.3em] opacity-55 mb-5">The page grows quiet</p>
              <Transition name="ritual-word" mode="out-in"><h2 :key="ritualStage" class="font-ui-serif text-4xl sm:text-5xl tracking-[0.16em]">{{ ritualStage }}</h2></Transition>
            </div>
            <div v-else-if="localPlayer?.complete" class="text-center px-6 py-12" role="status" aria-live="polite">
              <p class="text-[9px] uppercase tracking-[0.25em] opacity-60 mb-5">Your light has reached the shore</p>
              <span class="mx-auto mb-7 block w-5 h-5 rounded-full firefly-idle" :style="{ color: fireflyColors[localSeat], backgroundColor: fireflyColors[localSeat] }"></span>
              <h2 class="font-ui-serif text-2xl sm:text-3xl mb-4">Rest here while the others finish.</h2>
              <p class="text-xs opacity-65">Your passage is complete · {{ players.filter(player => player.complete && !forfeits[player.seat]).length }} of {{ players.filter(player => !forfeits[player.seat]).length }} lights have arrived.</p>
              <p class="mt-4 text-[10px] uppercase tracking-[0.16em] opacity-55">{{ localPlayer.wpm }} WPM · {{ localPlayer.accuracy }}% clarity · {{ localPlayer.mistakes || 0 }} tangled keys</p>
            </div>
            <TypingBoard
              v-else-if="!localForfeit"
              :quote="passage"
              :season-name="seasons[settings.lockedSeason]?.name || 'Shared Passage'"
              :passage-number="roomWordCount"
              game-mode="multiplayer"
              :multiplayer-players="players"
              :local-seat="localSeat"
              @progress="publishProgress"
            />
          </section>
        </div>

        <div v-else-if="hasEnded" class="relative isolate mx-auto max-w-4xl px-6 sm:px-10 py-11 text-center">
          <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-[0.23]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
          <p class="text-[9px] uppercase tracking-[0.25em] opacity-55 mb-4">The page is complete</p>
          <h2 class="font-ui-serif text-2xl sm:text-3xl mb-3">{{ winner ? winner.name + ' reached the shore first.' : 'The passage rests here.' }}</h2>
          <p class="text-xs opacity-60">{{ roomWordCount }} words · Every traveler followed the same passage in their own time.</p>
          <div v-if="resultMilestones.length" class="mt-5 flex flex-wrap justify-center gap-2" aria-label="Milestones from this match">
            <span v-for="note in resultMilestones" :key="note" class="rounded-full border px-3 py-1 text-[9px] uppercase tracking-[0.12em]" :style="{ borderColor: 'var(--trace-border)' }">{{ note }}</span>
          </div>
          <ol class="my-9 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end" aria-label="First three travelers">
            <li v-for="(player, index) in finishers.slice(0, 3)" :key="player.seat" class="relative isolate flex flex-col items-center gap-2 px-4 py-7" :class="index === 0 ? 'sm:py-10' : ''">
              <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-2xl" :style="{ backgroundColor: 'var(--trace-season-ink)', opacity: index === 0 ? .25 : .12, filter: 'url(#ink-blot)' }"></span>
              <span class="text-[9px] uppercase tracking-[0.24em] opacity-55">{{ index === 0 ? 'First light' : index === 1 ? 'Second light' : 'Third light' }}</span>
              <span class="grid place-items-center w-14 h-14 overflow-hidden rounded-full font-ui-serif text-lg" :style="{ backgroundColor: fireflyColors[player.seat] + '33', boxShadow: `0 0 22px ${fireflyColors[player.seat]}55` }" aria-hidden="true"><img v-if="player.avatarUrl" :src="player.avatarUrl" alt="" class="w-full h-full object-cover" referrerpolicy="no-referrer" /><template v-else>{{ playerInitials(player.name) }}</template></span>
              <strong class="font-ui-serif font-normal text-base truncate max-w-full" :title="player.name">{{ player.name }} <small v-if="player.seat === localSeat" class="opacity-60">(you)</small></strong>
              <span v-if="player.countryCode" class="text-base" :title="player.countryCode">{{ countryFlag(player.countryCode) }}</span>
              <span class="text-[9px] uppercase tracking-[0.14em] opacity-60">{{ forfeits[player.seat] ? 'DNF · ' + forfeits[player.seat].reason : player.complete ? 'Finished' : 'Last light standing' }}</span>
              <span class="mt-2 font-ui-serif text-xl tabular-nums">{{ player.keystrokes ? player.wpm : '—' }} <small class="text-[9px] font-ui-sans uppercase tracking-widest opacity-60">WPM</small></span>
              <span class="text-[10px] opacity-70 tabular-nums">{{ player.keystrokes ? player.accuracy + '% clarity · ' + (player.mistakes || 0) + ' mistakes' : 'No typing recorded' }}</span>
              <span class="text-[10px] opacity-60 tabular-nums">{{ matchTime(player.elapsedMs) }}</span>
            </li>
          </ol>
          <ol v-if="finishers.length > 3" class="mx-auto max-w-sm mb-8 space-y-3 text-left" start="4" aria-label="Other travelers">
            <li v-for="(player, index) in finishers.slice(3)" :key="player.seat" class="flex flex-wrap gap-x-3 gap-y-1 text-xs"><span>{{ index + 4 }}.</span><span class="flex-1">{{ player.name }}</span><span class="opacity-60">{{ forfeits[player.seat] ? 'DNF' : player.complete ? 'Finished' : 'Still here' }} · {{ player.keystrokes ? player.wpm + ' WPM · ' + player.accuracy + '%' : 'No typing recorded' }} · {{ matchTime(player.elapsedMs) }}</span></li>
          </ol>
          <div v-if="isPrivate && isHost" class="mx-auto mb-7 max-w-md">
            <p class="mb-3 text-[9px] uppercase tracking-[0.2em] opacity-55">Open another page</p>
            <div class="grid grid-cols-3 gap-2 mb-4">
              <button v-for="count in WORD_COUNTS" :key="count" type="button" class="min-h-10 rounded-full border text-[10px] tracking-widest transition-opacity" :class="rematchWordCount === count ? 'opacity-100' : 'opacity-45'" :style="{ borderColor: 'var(--trace-border)' }" @click="rematchWordCount = count">{{ count }} words</button>
            </div>
            <InkButton variant="primary" :disabled="isBusy" @click="openRematch">{{ isBusy ? 'Opening…' : 'Host a rematch' }}</InkButton>
          </div>
          <div v-else-if="isPrivate && room?.meta?.rematch?.code" class="mb-7">
            <p class="font-ui-serif text-lg mb-3">A new page is gathering.</p>
            <InkButton variant="primary" @click="joinRematch">Join {{ room.meta.rematch.wordCount }}-word rematch</InkButton>
          </div>
          <div class="flex flex-wrap justify-center gap-3">
            <InkButton v-if="!isPrivate" variant="primary" :disabled="isBusy" @click="findAnother">Find another match</InkButton>
            <InkButton variant="soft" @click="leave">Leave results</InkButton>
          </div>
        </div>
      </section>
    </div>

    <div v-if="localForfeit" class="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/45 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ended-title">
      <div class="relative isolate w-full max-w-md px-8 py-10 text-center" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
        <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-95" :style="{ backgroundColor: 'var(--trace-season-soft)', filter: 'url(#ink-blot)' }"></span>
        <p class="text-[9px] uppercase tracking-[0.25em] opacity-55 mb-4">Your light has rested · DNF</p>
        <h2 id="ended-title" class="font-ui-serif text-2xl leading-relaxed mb-4">{{ localForfeit.reason === 'idle' ? 'The page waited thirty quiet seconds, then let your light drift away.' : 'The thread of your connection loosened, and your light left this passage.' }}</h2>
        <p class="text-xs leading-relaxed opacity-65 mb-8">You have been disconnected from this match. The other travelers may continue; another page awaits you.</p>
        <InkButton variant="primary" @click="leave">Back to multiplayer</InkButton>
      </div>
    </div>

    <AuthModal v-if="showAuth" @close="showAuth = false; pendingAction = null" />
  </main>
</template>

<style scoped>
:deep(.room-leave-button.trace-ink-button::before) { opacity: .26; }
:deep(.room-leave-button.trace-ink-button:hover::before) { opacity: .42; }
.firefly-idle { box-shadow: 0 0 .45rem currentColor; animation: multiplayer-pulse 2.8s ease-in-out infinite; }
.traveler-arrival { animation: traveler-arrival .7s cubic-bezier(.16, 1, .3, 1) both; }
.ritual-orbit { position: relative; width: 7rem; height: 3rem; }
.ritual-orbit i { position: absolute; left: 50%; top: 50%; width: .38rem; height: .38rem; border-radius: 50%; color: var(--ritual-color); background: currentColor; box-shadow: 0 0 .65rem .2rem currentColor; animation: ritual-drift 2.8s ease-in-out infinite; }
.ritual-orbit i:nth-child(2) { animation-delay: -.7s; }
.ritual-orbit i:nth-child(3) { animation-delay: -1.4s; }
.ritual-orbit i:nth-child(4) { animation-delay: -2.1s; }
.ritual-orbit i:nth-child(5) { animation-delay: -2.6s; }
.ritual-word-enter-active, .ritual-word-leave-active { transition: opacity .3s ease, transform .3s ease, filter .3s ease; }
.ritual-word-enter-from { opacity: 0; transform: translateY(.5rem); filter: blur(5px); }
.ritual-word-leave-to { opacity: 0; transform: translateY(-.45rem); filter: blur(5px); }
@keyframes multiplayer-pulse {
  0%, 100% { opacity: .35; transform: scale(.85); }
  50% { opacity: .95; transform: scale(1.15); }
}
@keyframes traveler-arrival { from { opacity: 0; transform: translateY(.5rem); filter: blur(5px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes ritual-drift { 0%, 100% { transform: translate(-3rem, .4rem) scale(.75); opacity: .45; } 50% { transform: translate(2.7rem, -.6rem) scale(1.15); opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .firefly-idle, .traveler-arrival, .ritual-orbit i { transition: none; animation: none; }
}
</style>
