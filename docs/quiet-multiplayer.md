# Shared Current multiplayer

Shared Current is a gentle competitive typing mode for 2–5 signed-in travelers.

## Match lengths

Players choose Short Breath (50 words), Steady Breath (100 words), or Deep Exhale (200 words).

- A private-room host chooses the length for everyone invited.
- Public matchmaking only groups players who selected the same word count.
- Public search reports whether it is listening, has opened a new page, has found nearby lights, or is nearing the synchronized start.
- The exact generated passage is stored in the room so every browser receives identical text.

## Race language

The numeric progress bars were removed. Each participant is represented by a distinct colored firefly moving toward dawn. Finishing order appears only after all remaining players finish. The room shares progress and match metrics (WPM, accuracy, elapsed time and mistakes), but not the typed passage input itself.

Every match opens with a synchronized Settle → Breathe → Begin ritual. A light hovers quietly before typing, lengthens its curved trail as pace rises, flutters briefly after a mistake, and settles into a pulse at the finish. Only lights on the local reader's current line are visible, while short poetic cues describe nearby or distant positions without a progress bar.

Before the ritual, every browser preloads its fonts, measures the shared board, and marks that board ready. The room begins as soon as every active board is ready, with an eight-second fallback so one slow device cannot hold the room indefinitely. Remote fireflies predict a short distance between network samples and ease back to authoritative progress, which hides ordinary Realtime Database jitter without changing the recorded race result. Camera movement is line-anchored and remeasured through the full transition so lights remain attached to their words.

## Lifecycle

A disconnected seat remains reserved for 30 seconds. Returning through Home → Multiplayer or the invitation link resumes that seat. After the grace period, rules reject new claims and clients ignore the expired room. Connected clients remove expired records opportunistically.

During that grace period the local page shows a poetic reconnect countdown. The disconnected light dims for every traveler and returns to full glow when presence is restored.

An active match ends with an ink-mark message when fewer than two connected travelers remain.

Completed results remain readable until each traveler leaves. They include WPM, clarity, time, mistakes, flags or public avatars when shared, and quiet personal milestones. A private host can propose a new 50, 100, or 200-word passage from the result screen. Each traveler answers independently, the host sees every ready/waiting state, and the next private room can open after at least two lights are ready. The completed room keeps a rematch pointer so ready travelers can choose when to follow. Public players can return directly to matchmaking for the same length.

The local result also compares WPM, clarity, and elapsed time with earlier completed matches at the same word length. These comparisons remain private profile feedback and do not alter public ranking.

Match arrivals, starts, finishes, and results use the existing **Interface & match cues** preference. They stay silent when that preference is off.

## Firebase

Publish database.rules.json under Realtime Database → Rules. These are not Firestore rules. The rules use five fixed seats and do not use numChildren().

## Leaderboards

The home menu links to 50, 100 and 200-word boards. Only completed, non-forfeited matches with at least 80% clarity qualify. Each player retains one fastest match per length. Higher WPM wins; equal WPM uses higher clarity, then shorter elapsed time. A slower match never replaces a faster qualifying result. The top 100 can be sorted by WPM or clarity, both taken from that same saved match.

Players show their account name or their chosen privacy alias. Country defaults to unset and is displayed with a flag only when chosen in Profile. Identity changes refresh existing entries without changing scores.

Publish the updated `database.rules.json` to **Realtime Database → Rules**. Rules validate scores against a completed room, prevent slower replacements, allow identity-only updates, and index WPM and clarity. Match submission requires its room to still exist. Client-written match metrics are not an authoritative anti-cheat system.
