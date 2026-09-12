<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fallbackQuotes, seasons } from '../utils/constants'
import { currentUser, settings } from '../store'
import {
  buildSharedPassage,
  MAX_PLAYERS,
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
const showEndedModal = ref(false)
const countdown = ref(0)
let countdownTimer = null

const {
  roomCode,
  room,
  players,
  connectedPlayers,
  localSeat,
  isHost,
  isLobby,
  isPlaying,
  hasEnded,
  canStart,
  roomError,
  isBusy,
  createRoom: createOnlineRoom,
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
const finishers = computed(() => [...players.value].sort((a, b) => {
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

watch(hasEnded, ended => {
  if (ended && room.value?.meta?.endedReason === 'traveler-left') showEndedModal.value = true
})

watch(() => room.value?.meta?.startsAt, startsAt => {
  clearInterval(countdownTimer)
  if (!startsAt) {
    countdown.value = 0
    return
  }
  const update = () => { countdown.value = Math.max(0, Math.ceil((Number(startsAt) - Date.now()) / 1000)) }
  update()
  countdownTimer = setInterval(update, 250)
})

const describeFailure = result => ({
  invalid: 'Enter the full ' + ROOM_CODE_LENGTH + '-character invitation.',
  missing: 'That invitation could not be found.',
  expired: 'That room has returned to stillness.',
  full: 'Five travelers already share this passage.',
  started: 'That passage has already begun.',
  collision: 'The room could not be formed. Please try once more.',
  auth: 'Sign in to enter multiplayer.'
}[result?.reason] || result?.message || 'The room could not be opened.')

const finishEntry = result => {
  if (!result?.ok) {
    if (result?.reason !== 'none') joinError.value = describeFailure(result)
    return
  }
  passageIndex.value = result.passageIndex
  selectedWordCount.value = Number(room.value?.meta?.wordCount) || selectedWordCount.value
  joinCode.value = result.code
  router.replace({ query: { room: result.code } })
}

const withAuth = action => {
  if (currentUser.value) return false
  pendingAction.value = action
  showAuth.value = true
  return true
}

const passageOptions = () => {
  const seed = Math.floor(Math.random() * 10_000)
  const generated = buildSharedPassage(fallbackQuotes, selectedWordCount.value, seed)
  return {
    wordCount: selectedWordCount.value,
    passageText: generated.text,
    passageAuthor: generated.author
  }
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
  showEndedModal.value = false
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

const handleComplete = () => {
  publishProgress({ progress: 100, complete: true })
}

const fireflyStyle = player => ({
  left: 'clamp(0.5rem, ' + Math.max(2, Math.min(98, Number(player.progress) || 0)) + '%, calc(100% - 0.5rem))',
  top: (18 + players.value.findIndex(entry => entry.seat === player.seat) * 13) + '%',
  color: fireflyColors[player.seat]
})

onMounted(async () => {
  const requested = normalizeRoomCode(route.query.room)
  if (requested.length === ROOM_CODE_LENGTH) await enterRoom(requested)
  else if (currentUser.value) finishEntry(await resumeRoom())
})

onBeforeUnmount(() => clearInterval(countdownTimer))

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
          <p class="text-[9px] uppercase tracking-[0.34em] opacity-55 mb-2">Many lights · one passage</p>
          <h1 class="text-3xl sm:text-4xl tracking-[0.2em] uppercase font-light font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">Shared Current</h1>
          <p class="mt-3 text-[9px] uppercase tracking-[0.16em] opacity-55">A gentle typing match · two to five travelers</p>
        </div>
        <InkButton variant="ghost" compact class="uppercase tracking-[0.16em] text-[10px]" @click="returnHome">Return</InkButton>
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
            <p class="text-xs leading-relaxed opacity-65 mb-6">Match only with travelers who chose {{ selectedWordCount }} words. The oldest compatible lobby is filled first.</p>
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
            <p class="mt-1 text-lg tracking-[0.3em] font-ui-serif">{{ roomCode }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <InkButton v-if="isPrivate && isLobby" variant="ghost" compact class="uppercase tracking-[0.12em] text-[9px]" @click="copyInvitation">{{ copyState }}</InkButton>
            <InkButton variant="ghost" compact class="uppercase tracking-[0.12em] text-[9px]" @click="leave">Leave</InkButton>
          </div>
        </div>
        <p v-if="visibleError" role="alert" class="mb-5 text-xs">{{ visibleError }}</p>

        <div v-if="isLobby" class="grid lg:grid-cols-[minmax(0,1fr)_19rem] gap-6">
          <div class="relative isolate px-6 py-8 sm:px-10 sm:py-10">
            <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-[0.24]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            <p class="text-[9px] uppercase tracking-[0.24em] opacity-55 mb-4">{{ isPrivate ? 'Private lobby' : roomWordCount + '-word public lobby' }}</p>
            <h2 class="font-ui-serif text-2xl sm:text-3xl leading-relaxed mb-3">{{ lobbyCount < MIN_PLAYERS ? 'Waiting for another light' : 'The passage is ready' }}</h2>
            <p class="text-xs leading-relaxed opacity-65 max-w-xl">{{ isPrivate ? 'Invite travelers with the code above. The host may begin once two or more are present.' : (countdown ? 'The shared passage opens in ' + countdown + '…' : 'A calm countdown begins when another traveler arrives.') }}</p>
            <div class="mt-8">
              <InkButton v-if="isPrivate && isHost" variant="primary" :disabled="!canStart" class="uppercase tracking-[0.14em] text-[10px]" @click="startMatch">{{ canStart ? 'Begin shared passage' : 'Waiting for one more' }}</InkButton>
              <span v-else class="text-[10px] uppercase tracking-[0.16em] opacity-55">{{ isPrivate ? 'The host will begin' : 'Matchmaking remains open to five' }}</span>
            </div>
          </div>

          <aside class="relative isolate px-5 py-6">
            <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-2xl opacity-[0.13]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            <p class="text-[9px] uppercase tracking-[0.2em] opacity-55 mb-5">Travelers · {{ lobbyCount }}/{{ MAX_PLAYERS }}</p>
            <ol class="space-y-3">
              <li v-for="index in MAX_PLAYERS" :key="index" class="flex items-center justify-between gap-3 min-h-8 text-xs">
                <template v-if="players[index - 1]">
                  <span class="flex items-center gap-2 font-ui-serif tracking-wide"><i class="w-2 h-2 rounded-full firefly-idle" :style="{ color: fireflyColors[players[index - 1].seat], backgroundColor: fireflyColors[players[index - 1].seat] }"></i>{{ players[index - 1].name }} <small v-if="players[index - 1].seat === localSeat" class="opacity-50">(you)</small></span>
                  <span class="text-[8px] uppercase tracking-[0.12em] opacity-45">{{ players[index - 1].connected === false ? 'Returning…' : 'Ready' }}</span>
                </template>
                <template v-else><span class="opacity-30">An open place</span></template>
              </li>
            </ol>
          </aside>
        </div>

        <div v-else-if="isPlaying">
          <section class="relative isolate mb-4 px-5 py-5 sm:px-8">
            <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-2xl opacity-[0.11]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            <div class="flex items-center justify-between gap-4 mb-3">
              <p class="text-[8px] uppercase tracking-[0.22em] opacity-50">Firefly passage · {{ roomWordCount }} words</p>
              <p class="text-[8px] uppercase tracking-[0.16em] opacity-40">The light nearest dawn arrives first</p>
            </div>
            <div class="firefly-field" aria-label="Live multiplayer positions">
              <div class="absolute left-3 top-0 bottom-0 w-px opacity-20" :style="{ backgroundColor: 'var(--trace-text-primary)' }"></div>
              <div class="absolute right-3 top-0 bottom-0 w-px opacity-25" :style="{ backgroundColor: 'var(--trace-season-ink)' }"></div>
              <div v-for="player in players" :key="player.seat" class="race-firefly" :style="fireflyStyle(player)" :title="player.name + (player.seat === localSeat ? ' (you)' : '')">
                <span class="race-firefly-glow"></span>
                <span class="race-firefly-core"></span>
                <span class="race-firefly-name">{{ player.name }}<small v-if="player.seat === localSeat"> · you</small></span>
              </div>
            </div>
          </section>

          <section class="relative isolate min-h-[31rem] flex items-center justify-center px-2 py-7 sm:px-5">
            <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-[0.1]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            <TypingBoard :quote="passage" :season-name="seasons[settings.lockedSeason]?.name || 'Shared Current'" :passage-number="roomWordCount" game-mode="multiplayer" @progress="publishProgress" @passage-complete="handleComplete" />
          </section>
        </div>

        <div v-else-if="hasEnded && room?.meta?.endedReason === 'complete'" class="relative isolate mx-auto max-w-2xl px-7 py-12 text-center">
          <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-[0.23]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
          <p class="text-[9px] uppercase tracking-[0.25em] opacity-55 mb-4">All lights have arrived</p>
          <h2 class="font-ui-serif text-2xl sm:text-3xl mb-3">Many marks, one quiet page.</h2>
          <ol class="mx-auto max-w-sm my-8 space-y-3 text-left">
            <li v-for="(player, index) in finishers" :key="player.seat" class="flex items-center gap-3 text-sm">
              <span class="w-6 text-center font-ui-serif opacity-50">{{ index + 1 }}</span>
              <i class="w-2.5 h-2.5 rounded-full firefly-idle" :style="{ color: fireflyColors[player.seat], backgroundColor: fireflyColors[player.seat] }"></i>
              <span class="font-ui-serif">{{ player.name }} <small v-if="player.seat === localSeat" class="opacity-50">(you)</small></span>
            </li>
          </ol>
          <p class="text-xs opacity-60 mb-8">The order belongs only to this moment. The practice remains equal.</p>
          <InkButton variant="primary" @click="leave">Return to multiplayer</InkButton>
        </div>
      </section>
    </div>

    <div v-if="showEndedModal" class="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/45 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ended-title">
      <div class="relative isolate w-full max-w-md px-8 py-10 text-center" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
        <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-95" :style="{ backgroundColor: 'var(--trace-season-soft)', filter: 'url(#ink-blot)' }"></span>
        <p class="text-[9px] uppercase tracking-[0.25em] opacity-55 mb-4">The current has changed</p>
        <h2 id="ended-title" class="font-ui-serif text-2xl leading-relaxed mb-4">One light left the path. The shared passage returns to stillness.</h2>
        <p class="text-xs leading-relaxed opacity-65 mb-8">No progress was lost from your own practice. Gather again when the evening is ready.</p>
        <InkButton variant="primary" @click="leave">Return to multiplayer</InkButton>
      </div>
    </div>

    <AuthModal v-if="showAuth" @close="showAuth = false; pendingAction = null" />
  </main>
</template>

<style scoped>
.firefly-field {
  position: relative;
  height: 8.5rem;
  overflow: hidden;
  border-radius: 1rem;
  background:
    radial-gradient(circle at 78% 45%, color-mix(in srgb, var(--trace-season-ink) 13%, transparent), transparent 28%),
    linear-gradient(90deg, transparent, color-mix(in srgb, var(--trace-season-ink) 7%, transparent));
}
.race-firefly {
  position: absolute;
  width: 0;
  height: 0;
  transition: left 520ms cubic-bezier(.2,.8,.2,1);
}
.race-firefly-core {
  position: absolute;
  width: .48rem;
  height: .48rem;
  left: -.24rem;
  top: -.24rem;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 .35rem .08rem currentColor;
}
.race-firefly-glow {
  position: absolute;
  width: 1.4rem;
  height: 1.4rem;
  left: -.7rem;
  top: -.7rem;
  border-radius: 999px;
  background: currentColor;
  opacity: .16;
  filter: blur(.18rem);
  animation: multiplayer-pulse 2.8s ease-in-out infinite;
}
.race-firefly-name {
  position: absolute;
  left: .65rem;
  top: -.55rem;
  white-space: nowrap;
  font-size: .48rem;
  letter-spacing: .08em;
  opacity: .65;
}
.race-firefly-name small { opacity: .65; }
.firefly-idle { box-shadow: 0 0 .45rem currentColor; animation: multiplayer-pulse 2.8s ease-in-out infinite; }
@keyframes multiplayer-pulse {
  0%, 100% { opacity: .35; transform: scale(.85); }
  50% { opacity: .95; transform: scale(1.15); }
}
@media (prefers-reduced-motion: reduce) {
  .race-firefly, .race-firefly-glow, .firefly-idle { transition: none; animation: none; }
}
</style>
