<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fallbackQuotes, SEASONS } from '../utils/constants'
import { currentUser, settings } from '../store'
import { MAX_PLAYERS, MIN_PLAYERS, ROOM_CODE_LENGTH, normalizeRoomCode } from '../utils/quietRoomProtocol'
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
const showAuth = ref(false)
const pendingAction = ref(null)
const showEndedModal = ref(false)

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
  connectionState,
  createRoom: createOnlineRoom,
  joinRoom,
  joinPublicRoom,
  resumeRoom,
  startMatch,
  leaveRoom,
  suspendRoom,
  publishProgress
} = useQuietRoom()

const passage = computed(() => fallbackQuotes[passageIndex.value % fallbackQuotes.length] || fallbackQuotes[0])
const visibleError = computed(() => joinError.value || roomError.value)
const lobbyCount = computed(() => connectedPlayers.value.length)
const isPrivate = computed(() => room.value?.meta?.type === 'private')
const countdown = ref(0)
let countdownTimer = null

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
  joinCode.value = result.code
  router.replace({ query: { room: result.code } })
}

const withAuth = action => {
  if (currentUser.value) return false
  pendingAction.value = action
  showAuth.value = true
  return true
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
  finishEntry(await createOnlineRoom(Math.floor(Math.random() * fallbackQuotes.length), 'private'))
}

const findPublic = async () => {
  joinError.value = ''
  if (withAuth({ type: 'public' })) return
  finishEntry(await joinPublicRoom(Math.floor(Math.random() * fallbackQuotes.length)))
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

const playerTone = player => {
  if (player.complete) return 'Mark placed'
  if (player.connected === false) return 'Returning…'
  if (player.progress > 0) return 'Moving gently'
  return 'Ready'
}

const handleComplete = stats => {
  publishProgress({ progress: 100, complete: true })
  return stats
}

onMounted(async () => {
  const requested = normalizeRoomCode(route.query.room)
  if (requested.length === ROOM_CODE_LENGTH) {
    await enterRoom(requested)
  } else if (currentUser.value) {
    finishEntry(await resumeRoom())
  }
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
          <p class="text-[9px] uppercase tracking-[0.34em] opacity-55 mb-2">Many currents · one passage</p>
          <h1 class="text-3xl sm:text-4xl tracking-[0.2em] uppercase font-light font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">Shared Current</h1>
          <p class="mt-3 text-[9px] uppercase tracking-[0.16em] opacity-55">A gentle typing match · two to five travelers</p>
        </div>
        <InkButton variant="ghost" compact class="uppercase tracking-[0.16em] text-[10px]" @click="returnHome">Return</InkButton>
      </header>

      <section v-if="!roomCode" class="mx-auto max-w-3xl">
        <div class="relative isolate px-6 py-8 sm:px-10 sm:py-11 text-center mb-6">
          <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-[0.28]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
          <p class="font-ui-serif text-xl sm:text-2xl leading-relaxed mb-3">Move together. Arrive in your own rhythm.</p>
          <p class="mx-auto max-w-xl text-xs leading-relaxed opacity-70">Everyone receives the same passage. The room shares only gentle progress and finishing order—never typed words, mistakes, accuracy, or WPM.</p>
        </div>

        <div class="grid sm:grid-cols-2 gap-4 mb-6">
          <article class="relative isolate px-6 py-7 min-h-48 flex flex-col">
            <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-2xl opacity-[0.18]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            <p class="text-[9px] uppercase tracking-[0.22em] opacity-55 mb-3">Private room</p>
            <h2 class="font-ui-serif text-xl mb-2">Invite your circle</h2>
            <p class="text-xs leading-relaxed opacity-65 mb-6">Create a room, invite up to four people, and begin when at least two are present.</p>
            <InkButton variant="primary" block class="mt-auto uppercase tracking-[0.14em] text-[10px]" :disabled="isBusy" @click="createPrivate">{{ isBusy ? 'Opening…' : 'Create private room' }}</InkButton>
          </article>

          <article class="relative isolate px-6 py-7 min-h-48 flex flex-col">
            <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-2xl opacity-[0.12]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            <p class="text-[9px] uppercase tracking-[0.22em] opacity-55 mb-3">Public room</p>
            <h2 class="font-ui-serif text-xl mb-2">Join the gathering current</h2>
            <p class="text-xs leading-relaxed opacity-65 mb-6">Enter the oldest open room. A calm countdown begins with two travelers and welcomes up to five.</p>
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
            <p class="text-[8px] uppercase tracking-[0.22em] opacity-50">{{ isPrivate ? 'Private invitation' : 'Public gathering' }}</p>
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
            <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-[0.25]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            <p class="text-[9px] uppercase tracking-[0.24em] opacity-55 mb-4">{{ isPrivate ? 'Private lobby' : 'Public matchmaking' }}</p>
            <h2 class="font-ui-serif text-2xl sm:text-3xl leading-relaxed mb-3">{{ lobbyCount < MIN_PLAYERS ? 'Waiting beside the water' : 'The passage is ready' }}</h2>
            <p class="text-xs leading-relaxed opacity-65 max-w-xl">
              {{ isPrivate ? 'Invite travelers with the code above. The host may begin once two or more are present.' : (countdown ? 'The shared passage opens in ' + countdown + '…' : 'The room will begin gently once another traveler arrives.') }}
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
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
                  <span class="font-ui-serif tracking-wide">{{ players[index - 1].name }} <small v-if="players[index - 1].seat === localSeat" class="opacity-50">(you)</small></span>
                  <span class="text-[8px] uppercase tracking-[0.12em] opacity-45">{{ playerTone(players[index - 1]) }}</span>
                </template>
                <template v-else>
                  <span class="opacity-30">An open place</span><span class="w-2 h-2 rounded-full opacity-20" :style="{ backgroundColor: 'var(--trace-season-ink)' }"></span>
                </template>
              </li>
            </ol>
          </aside>
        </div>

        <div v-else-if="isPlaying" class="grid xl:grid-cols-[minmax(0,1fr)_18rem] gap-5 items-start">
          <section class="relative isolate min-h-[31rem] flex items-center justify-center px-2 py-7 sm:px-5">
            <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-[0.12]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            <TypingBoard :quote="passage" :season-name="SEASONS[settings.lockedSeason]?.name || 'Shared Current'" :passage-number="passageIndex + 1" game-mode="multiplayer" @progress="publishProgress" @passage-complete="handleComplete" />
          </section>

          <aside class="relative isolate px-5 py-6">
            <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-2xl opacity-[0.16]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            <p class="text-[9px] uppercase tracking-[0.2em] opacity-55 mb-5">Shared current</p>
            <ol class="space-y-5">
              <li v-for="player in players" :key="player.seat">
                <div class="flex justify-between gap-3 text-[10px] mb-2">
                  <span class="font-ui-serif tracking-wide">{{ player.name }} <small v-if="player.seat === localSeat" class="opacity-50">(you)</small></span>
                  <span class="opacity-55">{{ Math.round(player.progress || 0) }}%</span>
                </div>
                <div class="h-[3px] overflow-hidden rounded-full" :style="{ backgroundColor: 'var(--trace-border)' }">
                  <div class="h-full transition-[width] duration-500" :style="{ width: (player.progress || 0) + '%', backgroundColor: 'var(--trace-season-ink)' }"></div>
                </div>
                <p class="mt-2 text-[8px] uppercase tracking-[0.13em] opacity-40">{{ playerTone(player) }}</p>
              </li>
            </ol>
            <p class="mt-7 text-[9px] leading-relaxed opacity-45">Progress is shared. Your words, speed, accuracy, and mistakes remain private.</p>
          </aside>
        </div>

        <div v-else-if="hasEnded && room?.meta?.endedReason === 'complete'" class="relative isolate mx-auto max-w-2xl px-7 py-12 text-center">
          <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-[0.25]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
          <p class="text-[9px] uppercase tracking-[0.25em] opacity-55 mb-4">Passage complete</p>
          <h2 class="font-ui-serif text-2xl sm:text-3xl mb-3">Many marks, one quiet page.</h2>
          <p class="text-xs opacity-65 mb-8">The order is remembered only for this moment. The practice belongs equally to every traveler.</p>
          <InkButton variant="primary" @click="leave">Return to the gathering</InkButton>
        </div>
      </section>
    </div>

    <div v-if="showEndedModal" class="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/45 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ended-title">
      <div class="relative isolate w-full max-w-md px-8 py-10 text-center" :class="settings.darkMode ? 'text-stone-200' : 'text-stone-800'">
        <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-95" :style="{ backgroundColor: 'var(--trace-season-soft)', filter: 'url(#ink-blot)' }"></span>
        <p class="text-[9px] uppercase tracking-[0.25em] opacity-55 mb-4">The current has changed</p>
        <h2 id="ended-title" class="font-ui-serif text-2xl leading-relaxed mb-4">One traveler left the river. The shared passage returns to stillness.</h2>
        <p class="text-xs leading-relaxed opacity-65 mb-8">No progress was lost from your own practice. Gather again when the water is ready.</p>
        <InkButton variant="primary" @click="leave">Return to multiplayer</InkButton>
      </div>
    </div>

    <AuthModal :show="showAuth" @close="showAuth = false; pendingAction = null" />
  </main>
</template>
