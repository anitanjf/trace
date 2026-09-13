import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [styles, app, home, settings, inkButton, settingsChoice, typingBoard, completionStats] = await Promise.all([
  readFile(new URL('../src/style.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/App.vue', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/Home.vue', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/Settings.vue', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ui/InkButton.vue', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ui/SettingsChoice.vue', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/TypingBoard.vue', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CompletionStats.vue', import.meta.url), 'utf8')
])

const requiredTokens = [
  '--trace-paper',
  '--trace-paper-raised',
  '--trace-panel',
  '--trace-text-primary',
  '--trace-text-secondary',
  '--trace-text-muted',
  '--trace-border',
  '--trace-focus',
  '--trace-season-ink',
  '--trace-season-contrast',
  '--trace-season-accent',
  '--trace-space-4',
  '--trace-control-height'
]

for (const token of requiredTokens) {
  assert.match(styles, new RegExp(token), `Missing shared token: ${token}`)
}

assert.match(app, /:style="themeStyle"/)
assert.doesNotMatch(app, /#b7791f/i)
assert.match(inkButton, /hover:not\(:disabled\)/)
assert.match(inkButton, /:active:not\(:disabled\)/)
assert.match(inkButton, /:disabled/)
assert.match(inkButton, /data-selected/)
assert.match(inkButton, /aria-pressed/)
assert.match(settingsChoice, /update:modelValue/)
assert.match(home, /components\/ui\/InkButton/)
assert.match(home, /components\/ui\/InkInfoButton/)
assert.doesNotMatch(home, /ZenLoader/)
assert.match(app, /IntroSplash/)
assert.match(app, /introFinished/)
assert.doesNotMatch(home, />Online<\/span>/)
assert.doesNotMatch(home, /Explore Trace/)
assert.doesNotMatch(home, /stats\.lifetimePassages/)
assert.match(settings, /components\/ui\/SettingsChoice/)
assert.match(settings, /components\/ui\/InkButton/)
assert.match(typingBoard, /\['one', 'two', 'three'\]\.map/)
assert.match(typingBoard, /const soloFireflyColor = computed/)
assert.match(typingBoard, /color-mix\(in srgb, var\(--trace-season-ink\)/)
assert.match(typingBoard, /solo-flight-light/)
assert.match(typingBoard, /overflow-y-auto no-scrollbar/)
assert.match(completionStats, /ui\/InkButton/)
assert.doesNotMatch(completionStats, /Preserved in Archive|#DFBE73/i)

console.log('Trace visual token and control checks passed.')
