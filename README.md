# Trace

**Leave your mark gently.**

Trace is a mindful typing space for seasonal reflection, quiet focus, and progress without pressure. There is no failing, no ticking clock, and no leaderboard to outrun—only words, breath, and another chance to begin.

## The experience

- **Meditation:** Practice seasonal passages at your own pace.
- **Daily Reflection:** Return to one shared passage each day.
- **Flow State:** Choose a 50, 100, or 200-word punctuation-free practice.
- **Seasonal atmosphere:** Let visuals and optional natural ambience follow the real season or choose one yourself.
- **Quiet sound:** Layer optional lo-fi music, keystrokes, and interface sounds.
- **Personal archive:** Preserve passages, search by phrase or author, and type them again.
- **Meaningful progress:** Review clarity, pace, consistency, and earned enlightenments without competitive pressure.
- **Reading comfort:** Adjust typography, text size, spacing, alignment, motion, and appearance.
- **Cloud sync:** Keep signed-in progress and preferences with Firebase.
- **Quiet Multiplayer:** Invite one signed-in person into an expiring online room and share only anonymous presence and passage progress.

## Daily Reflection policy

Daily Reflection follows the device's local calendar date. It becomes available again at the next local midnight, uses the same local `YYYY-MM-DD` key as Archive activity, and awards daily credit only once for that date—even after reload, retry, sync, or a timezone change. Passage selection is stable for each date and cached for reloads; bundled passages provide a defined fallback when the remote collection is unavailable.

## Product identity

Trace uses a custom ink-mark favicon, route-aware browser metadata, install metadata, and social-sharing artwork. The interface shares one six-season palette across Home, Preferences, Profile, About, and Archive.

## Technology

- Vue 3 and Vue Router
- Vite
- Tailwind CSS
- Firebase Authentication, Firestore, and Realtime Database
- Custom SVG filters, seasonal particles, and Web Audio soundscapes

## Run locally

1. Clone the repository.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and add the Firebase web app values, including the Realtime Database URL.
4. Run `npm run dev`.
5. Use `npm run build` for a production build.

Quiet Multiplayer also requires the reviewed Realtime Database rules in `database.rules.json`. The repository does not deploy them automatically.
