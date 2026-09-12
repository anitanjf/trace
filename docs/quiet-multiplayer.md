# Shared Current multiplayer

Shared Current replaces the original two-person Quiet Room prototype.

## Experience

- Private rooms support 2–5 signed-in travelers. The host invites by code and starts the passage.
- Public matchmaking places travelers into the oldest open lobby. A 12-second calm countdown begins at two players and the lobby remains open up to five.
- Every traveler uses the real Trace TypingBoard with the same passage.
- Only anonymous seat name, presence, percentage, and completion are synchronized. Typed text, mistakes, WPM, and accuracy remain private.
- An active match continues while at least two players remain. If only one remains, everyone sees an ink-mark ending message.

## Free-plan lifecycle

Realtime Database presence marks a traveler disconnected even after a crash or dropped connection. A room reserves that seat for 30 seconds.

The creator can return through Home → Multiplayer or the invitation URL during this grace period. After 30 seconds:

- security rules reject new seat claims;
- the UI treats the room as nonexistent;
- public matchmaking ignores it;
- any connected client removes the expired record.

If every browser is offline, physical deletion waits for the next client cleanup. Logical expiration still prevents the room from being joined.

## Required Firebase setup

1. Enable a sign-in provider (Google is already used by Trace).
2. Set the regional Realtime Database URL in the production environment.
3. Publish database.rules.json in Realtime Database → Rules.
4. Do not paste these rules into Firestore.

The rules use five fixed seats and do not use numChildren().
