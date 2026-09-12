<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fallbackQuotes } from '../utils/constants'
import { currentUser, settings } from '../store'
import { calculatePassageProgress, isPassageComplete, normalizeRoomCode, ROOM_CODE_LENGTH } from '../utils/quietRoomProtocol'
import { useQuietRoom } from '../composables/useQuietRoom'
import InkButton from '../components/ui/InkButton.vue'
import AuthModal from '../components/AuthModal.vue'

const router = useRouter()
const route = useRoute()
const joinCode = ref('')
const typedText = ref('')
const presenceVisible = ref(true)
const joinError = ref('')
const copyState = ref('Copy invitation')
const passageIndex = ref(0)
const showAuth = ref(false)
const pendingAction = ref(null)

const {
  roomCode,
  partner,
  partnerPresent,
  latencyTone,
  connectionState,
  roomError,
  isBusy,
  createRoom: createOnlineRoom,
  joinRoom,
  leaveRoom,
  publishProgress
} = useQuietRoom()

const passage = computed(() => fallbackQuotes[passageIndex.value % fallbackQuotes.length] || fallbackQuotes[0])
const progress = computed(() => calculatePassageProgress(typedText.value, passage.value.text))
const complete = computed(() => isPassageComplete(typedText.value, passage.value.text))
const bothComplete = computed(() => complete.value && partnerPresent.value && partner.value?.complete)
const visibleError = computed(() => joinError.value || roomError.value)

watch([progress, complete], ([nextProgress, nextComplete]) => {
  if (roomCode.value) publishProgress(nextProgress, nextComplete)
})

const describeJoinFailure = result => ({
  invalid: `Enter the full ${ROOM_CODE_LENGTH}-character invitation.`,
  missing: 'That invitation could not be found.',
  expired: 'That room has already returned to stillness.',
  full: 'This room already holds two travelers.',
  collision: 'The room could not be formed. Please try once more.',
  auth: 'Sign in to enter a private online room.'
}[result?.reason] || result?.message || 'The quiet room could not be opened.')

const finishEntry = result => {
  if (!result?.ok) {
    joinError.value = describeJoinFailure(result)
    return
  }
  passageIndex.value = result.passageIndex
  typedText.value = ''
  joinCode.value = result.code
  router.replace({ query: { room: result.code } })
}

const enterRoom = async code => {
  joinError.value = ''
  const normalized = normalizeRoomCode(code)
  if (normalized.length !== ROOM_CODE_LENGTH) {
    joinError.value = `Enter the full ${ROOM_CODE_LENGTH}-character invitation.`
    return
  }
  if (!currentUser.value) {
    pendingAction.value = { type: 'join', code: normalized }
    showAuth.value = true
    return
  }
  finishEntry(await joinRoom(normalized))
}

const createRoom = async () => {
  joinError.value = ''
  if (!currentUser.value) {
    pendingAction.value = { type: 'create' }
    showAuth.value = true
    return
  }
  const nextPassage = Math.floor(Math.random() * fallbackQuotes.length)
  finishEntry(await createOnlineRoom(nextPassage))
}

const leave = async () => {
  await leaveRoom()
  typedText.value = ''
  joinCode.value = ''
  router.replace({ query: {} })
}

const copyInvitation = async () => {
  try {
    const invitation = new URL(router.resolve({ name: 'QuietMultiplayer', query: { room: roomCode.value } }).href, window.location.origin).href
    await navigator.clipboard.writeText(invitation)
    copyState.value = 'Invitation copied'
  } catch {
    copyState.value = `Room code: ${roomCode.value}`
  }
  window.setTimeout(() => { copyState.value = 'Copy invitation' }, 2200)
}

onMounted(() => {
  const requestedRoom = normalizeRoomCode(route.query.room)
  if (requestedRoom.length === ROOM_CODE_LENGTH) void enterRoom(requestedRoom)
})

watch(currentUser, async user => {
  if (!user || !pendingAction.value) return
  const action = pendingAction.value
  pendingAction.value = null
  showAuth.value = false
  if (action.type === 'create') await createRoom()
  else await enterRoom(action.code)
})
</script>

<template>
  <main class="relative z-10 w-full min-h-[100dvh] px-5 py-8 sm:px-8 sm:py-10 font-ui-sans overflow-y-auto" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">
    <div class="mx-auto w-full max-w-4xl">
      <header class="flex items-start justify-between gap-5 mb-10">
        <div>
          <p class="text-[9px] uppercase tracking-[0.34em] opacity-55 mb-2">Two currents, one passage</p>
          <h1 class="text-3xl sm:text-4xl tracking-[0.22em] uppercase font-light font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">Quiet Room</h1>
          <p class="mt-3 text-[9px] uppercase tracking-[0.16em] opacity-55">Private online room · two travelers</p>
        </div>
        <InkButton variant="ghost" compact class="uppercase tracking-[0.16em] text-[10px]" @click="router.push('/')">Return</InkButton>
      </header>

      <section v-if="!roomCode" class="relative isolate mx-auto max-w-xl px-6 py-9 sm:px-10 sm:py-12 text-center">
        <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-[0.34]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
        <p class="font-ui-serif text-xl sm:text-2xl leading-relaxed mb-3">Share the page, not the pace.</p>
        <p class="text-xs leading-relaxed opacity-70 mb-3">Create a room and send its private invitation to one person. You will receive the same passage while moving at your own pace.</p>
        <p class="text-[10px] leading-relaxed opacity-55 mb-8">Sign-in protects the room. Names, typed words, mistakes, WPM, and accuracy never cross the water.</p>
        <InkButton variant="primary" block class="uppercase tracking-[0.16em] text-[10px] mb-7" :disabled="isBusy" @click="createRoom">{{ isBusy ? 'Opening room…' : 'Create quiet room' }}</InkButton>
        <div class="flex items-stretch gap-2">
          <label class="sr-only" for="quiet-room-code">Invitation code</label>
          <input
            id="quiet-room-code"
            v-model="joinCode"
            :maxlength="ROOM_CODE_LENGTH"
            autocomplete="off"
            inputmode="text"
            placeholder="ROOM CODE"
            class="min-w-0 flex-1 min-h-11 px-4 bg-transparent border-b text-center uppercase tracking-[0.28em] font-ui-sans placeholder:opacity-40"
            :style="{ borderColor: 'var(--trace-border)', color: 'var(--trace-text-primary)' }"
            @keydown.enter="enterRoom(joinCode)"
          />
          <InkButton variant="soft" compact class="uppercase tracking-[0.12em] text-[10px]" :disabled="isBusy" @click="enterRoom(joinCode)">{{ isBusy ? 'Joining…' : 'Join' }}</InkButton>
        </div>
        <p v-if="visibleError" role="alert" class="mt-4 text-xs">{{ visibleError }}</p>
      </section>

      <section v-else aria-label="Quiet multiplayer room">
        <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p class="text-[8px] uppercase tracking-[0.22em] opacity-50">Invitation</p>
            <p class="mt-1 text-lg tracking-[0.3em] font-ui-serif">{{ roomCode }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <InkButton variant="ghost" compact class="uppercase tracking-[0.12em] text-[9px]" @click="copyInvitation">{{ copyState }}</InkButton>
            <InkButton variant="ghost" compact class="uppercase tracking-[0.12em] text-[9px]" @click="presenceVisible = !presenceVisible" :pressed="presenceVisible">
              {{ presenceVisible ? 'Hide presence' : 'Show presence' }}
            </InkButton>
            <InkButton variant="ghost" compact class="uppercase tracking-[0.12em] text-[9px]" @click="leave">Leave</InkButton>
          </div>
        </div>
        <p v-if="visibleError" role="alert" class="mb-5 text-xs">{{ visibleError }}</p>

        <div class="grid md:grid-cols-[minmax(0,1fr)_15rem] gap-6">
          <div class="relative isolate px-6 py-8 sm:px-10 sm:py-10">
            <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-[0.28]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
            <blockquote class="font-ui-serif text-xl sm:text-2xl leading-relaxed tracking-wide" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">“{{ passage.text }}”</blockquote>
            <p class="mt-4 text-[9px] uppercase tracking-[0.18em] opacity-55">— {{ passage.author }}</p>

            <label for="quiet-typing" class="block mt-9 mb-3 text-[9px] uppercase tracking-[0.2em] opacity-60">Your private typing space</label>
            <textarea
              id="quiet-typing"
              v-model="typedText"
              :disabled="complete"
              :placeholder="partnerPresent ? 'Begin when your breath settles…' : 'You may begin while the room waits…'"
              rows="5"
              class="w-full resize-none bg-transparent p-4 text-base leading-loose border focus:outline-none disabled:opacity-70"
              :style="{ borderColor: 'var(--trace-border)', color: 'var(--trace-text-primary)', borderRadius: 'var(--trace-radius-control)' }"
            ></textarea>
            <div class="flex justify-between mt-3 text-[9px] uppercase tracking-[0.15em] opacity-60">
              <span>{{ complete ? 'Your mark is still' : 'Your progress' }}</span>
              <span>{{ progress }}%</span>
            </div>
          </div>

          <aside class="flex flex-col gap-4" aria-label="Room presence">
            <div class="relative isolate px-5 py-6">
              <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-2xl opacity-[0.16]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
              <p class="text-[9px] uppercase tracking-[0.2em] opacity-55 mb-4">Shared presence</p>
              <template v-if="presenceVisible">
                <p class="font-ui-serif text-lg">{{ partnerPresent ? 'A fellow traveler is here' : 'Waiting beside the water' }}</p>
                <div v-if="partnerPresent" class="mt-5">
                  <div class="h-1.5 rounded-full overflow-hidden" :style="{ backgroundColor: 'var(--trace-border)' }">
                    <span class="block h-full transition-[width] duration-700" :style="{ width: `${partner.progress}%`, backgroundColor: 'var(--trace-season-accent)' }"></span>
                  </div>
                  <p class="mt-3 text-[9px] uppercase tracking-[0.13em] opacity-60">{{ partner.complete ? 'Their mark is still' : `${partner.progress}% · moving quietly` }}</p>
                </div>
              </template>
              <p v-else class="text-xs leading-relaxed opacity-60">Presence is hidden. The other traveler can continue without being watched.</p>
            </div>

            <div class="px-2 py-2 text-[9px] uppercase tracking-[0.13em] opacity-55">
              <p>Status · {{ connectionState === 'together' ? 'Together' : connectionState === 'reconnecting' ? 'Returning' : 'Waiting' }}</p>
              <p class="mt-2">Signal · {{ latencyTone }}</p>
              <p class="mt-4 normal-case tracking-normal leading-relaxed">No chat, rankings, WPM, accuracy, or typed text is shared.</p>
            </div>
          </aside>
        </div>

        <div v-if="bothComplete" role="status" class="mt-8 text-center">
          <p class="font-ui-serif text-2xl">Two marks, neither ahead.</p>
          <p class="mt-2 text-xs opacity-65">The passage is complete. Let the room become quiet again.</p>
        </div>
      </section>
    </div>
  </main>
  <AuthModal v-if="showAuth" @close="showAuth = false; pendingAction = null" />
</template>
