<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fallbackQuotes } from '../utils/constants'
import { settings } from '../store'
import { createRoomCode, calculatePassageProgress, isPassageComplete, normalizeRoomCode } from '../utils/quietRoomProtocol'
import { useQuietRoom } from '../composables/useQuietRoom'
import InkButton from '../components/ui/InkButton.vue'

const router = useRouter()
const route = useRoute()
const joinCode = ref('')
const typedText = ref('')
const presenceVisible = ref(true)
const joinError = ref('')
const copyState = ref('Copy invitation')

const {
  roomCode,
  partner,
  partnerPresent,
  latencyMs,
  latencyTone,
  connectionState,
  joinRoom,
  leaveRoom,
  publishProgress
} = useQuietRoom()

const passage = computed(() => {
  const seed = roomCode.value
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0)
  return fallbackQuotes[seed % fallbackQuotes.length] || fallbackQuotes[0]
})
const progress = computed(() => calculatePassageProgress(typedText.value, passage.value.text))
const complete = computed(() => isPassageComplete(typedText.value, passage.value.text))
const bothComplete = computed(() => complete.value && partnerPresent.value && partner.value?.complete)

watch([progress, complete], ([nextProgress, nextComplete]) => {
  if (roomCode.value) publishProgress(nextProgress, nextComplete)
})

const enterRoom = code => {
  joinError.value = ''
  const normalized = normalizeRoomCode(code)
  if (normalized.length !== 6) {
    joinError.value = 'Enter the full six-character invitation.'
    return
  }
  if (!joinRoom(normalized)) {
    joinError.value = 'This browser cannot open a local quiet room.'
    return
  }
  typedText.value = ''
  joinCode.value = normalized
  router.replace({ query: { ...route.query, room: normalized } })
}

const createRoom = () => enterRoom(createRoomCode())
const leave = () => {
  leaveRoom()
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
  if (requestedRoom.length === 6) enterRoom(requestedRoom)
})
</script>

<template>
  <main class="relative z-10 w-full min-h-[100dvh] px-5 py-8 sm:px-8 sm:py-10 font-ui-sans overflow-y-auto" :class="settings.darkMode ? 'text-stone-300' : 'text-stone-800'">
    <div class="mx-auto w-full max-w-4xl">
      <header class="flex items-start justify-between gap-5 mb-10">
        <div>
          <p class="text-[9px] uppercase tracking-[0.34em] opacity-55 mb-2">Two currents, one passage</p>
          <h1 class="text-3xl sm:text-4xl tracking-[0.22em] uppercase font-light font-ui-serif" :class="settings.darkMode ? 'text-stone-100' : 'text-stone-900'">Quiet Room</h1>
          <p class="mt-3 text-[9px] uppercase tracking-[0.16em] opacity-55">Local two-tab prototype · no cloud room</p>
        </div>
        <InkButton variant="ghost" compact class="uppercase tracking-[0.16em] text-[10px]" @click="router.push('/')">Return</InkButton>
      </header>

      <section v-if="!roomCode" class="relative isolate mx-auto max-w-xl px-6 py-9 sm:px-10 sm:py-12 text-center">
        <span aria-hidden="true" class="absolute inset-0 -z-10 rounded-3xl opacity-[0.34]" :style="{ backgroundColor: 'var(--trace-season-ink)', filter: 'url(#ink-blot)' }"></span>
        <p class="font-ui-serif text-xl sm:text-2xl leading-relaxed mb-3">Share the page, not the pace.</p>
        <p class="text-xs leading-relaxed opacity-70 mb-8">Open a room in this browser, then use its invitation in a second tab. Trace shares only anonymous presence and progress—not what either person types.</p>
        <InkButton variant="primary" block class="uppercase tracking-[0.16em] text-[10px] mb-7" @click="createRoom">Create quiet room</InkButton>
        <div class="flex items-stretch gap-2">
          <label class="sr-only" for="quiet-room-code">Invitation code</label>
          <input
            id="quiet-room-code"
            v-model="joinCode"
            maxlength="6"
            autocomplete="off"
            inputmode="text"
            placeholder="ROOM CODE"
            class="min-w-0 flex-1 min-h-11 px-4 bg-transparent border-b text-center uppercase tracking-[0.28em] font-ui-sans placeholder:opacity-40"
            :style="{ borderColor: 'var(--trace-border)', color: 'var(--trace-text-primary)' }"
            @keydown.enter="enterRoom(joinCode)"
          />
          <InkButton variant="soft" compact class="uppercase tracking-[0.12em] text-[10px]" @click="enterRoom(joinCode)">Join</InkButton>
        </div>
        <p v-if="joinError" role="alert" class="mt-4 text-xs">{{ joinError }}</p>
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
              <p>Status · {{ connectionState === 'together' ? 'Together' : 'Waiting' }}</p>
              <p class="mt-2">Distance · {{ latencyTone }}<span v-if="latencyMs !== null"> · {{ latencyMs }}ms</span></p>
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
</template>
