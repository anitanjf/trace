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

The home menu links to 50, 100 and 200-word boards. Only completed, non-forfeited matches with at least 80% clarity qualify. Each player retains one fastest match per length. Higher WPM wins; equal WPM uses higher clarity, then shorter elapsed time. A slower match never replaces a faster qualifying result. The top 100 can be sorted by WPM or clarity, both taken from that same saved match.

Players show their account name or their chosen privacy alias. Country defaults to unset and is displayed with a flag only when chosen in Profile. Identity changes refresh existing entries without changing scores.

Publish the updated `database.rules.json` to **Realtime Database → Rules**. Rules validate scores against a completed room, prevent slower replacements, allow identity-only updates, and index WPM and clarity. Match submission requires its room to still exist. Client-written match metrics are not an authoritative anti-cheat system.
