# Shared Current multiplayer

Shared Current is a gentle competitive typing mode for 2–5 signed-in travelers.

## Match lengths

Players choose Short Breath (50 words), Steady Breath (100 words), or Deep Exhale (200 words).

- A private-room host chooses the length for everyone invited.
- Public matchmaking only groups players who selected the same word count.
- The exact generated passage is stored in the room so every browser receives identical text.

## Race language

The numeric progress bars were removed. Each participant is represented by a distinct colored firefly moving toward dawn. Finishing order appears only after all remaining players finish. Typed words, WPM, accuracy, and mistakes never leave the player's browser.

## Lifecycle

A disconnected seat remains reserved for 30 seconds. Returning through Home → Multiplayer or the invitation link resumes that seat. After the grace period, rules reject new claims and clients ignore the expired room. Connected clients remove expired records opportunistically.

An active match ends with an ink-mark message when fewer than two connected travelers remain.

## Firebase

Publish database.rules.json under Realtime Database → Rules. These are not Firestore rules. The rules use five fixed seats and do not use numChildren().
