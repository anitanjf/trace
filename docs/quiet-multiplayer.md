# Shared Current multiplayer

Shared Current is a gentle competitive typing mode for 2–5 signed-in travelers.

## Match lengths

Players choose Short Breath (50 words), Steady Breath (100 words), or Deep Exhale (200 words).

- A private-room host chooses the length for everyone invited.
- Public matchmaking only groups players who selected the same word count.
- The exact generated passage is stored in the room so every browser receives identical text.

## Race language

The numeric progress bars were removed. Each participant is represented by a distinct colored firefly moving toward dawn. Finishing order appears only after all remaining players finish. The room shares progress and match metrics (WPM, accuracy, elapsed time and mistakes), but not the typed passage input itself.

## Lifecycle

A disconnected seat remains reserved for 30 seconds. Returning through Home → Multiplayer or the invitation link resumes that seat. After the grace period, rules reject new claims and clients ignore the expired room. Connected clients remove expired records opportunistically.

An active match ends with an ink-mark message when fewer than two connected travelers remain.

## Firebase

Publish database.rules.json under Realtime Database → Rules. These are not Firestore rules. The rules use five fixed seats and do not use numChildren().

## Leaderboards

The home menu links to three boards: 50, 100 and 200 words. Each signed-in traveler can place one personal best per length; only completed rooms with at least 90% accuracy qualify. The board ranks recorded WPM, breaking ties by accuracy and time. Public board entries include only a room reference, seat, score and timestamp; the UI creates a stable anonymous trail name from the Firebase UID without reading the player's private profile. Only authenticated users can read the top 100 entries per length. No existing match can be backfilled after its room expires.

The new `multiplayerLeaderboard` section in `database.rules.json` must be published to **Realtime Database → Rules** before new entries can be submitted. The rules restrict entries to the player's own best result from an ended room and index WPM. As the underlying match timing and keystrokes are still written by the clients, this is not an anti-cheat system; a trusted server would be necessary for authoritative competitive rankings.
