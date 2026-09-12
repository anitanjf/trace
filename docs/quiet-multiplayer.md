# Quiet Multiplayer

## Experience

Quiet Multiplayer is an invite-only online room for two signed-in travelers. Both people receive the same passage and type independently. Nobody is ranked or declared first.

The shared realtime payload contains only:

- a temporary random client identifier;
- a private ownership claim used only by database rules;
- progress from 0–100;
- completion state;
- join and heartbeat timestamps; and
- a schema version.

Typed text, individual keystrokes, display names, email addresses, WPM, accuracy, mistakes, chat, files, and reactions are never written to the room.

## Lifecycle

1. The creator signs in and opens an eight-character invitation.
2. The room stores a passage index and expires four hours after creation.
3. One invited, signed-in person may join using the code or invitation URL.
4. Each traveler atomically claims one of two fixed anonymous slots, so the database structure itself enforces room capacity without counting children in rules.
5. A private claim lets each traveler update only their own public presence slot without exposing their account identity to the other participant.
6. Each client registers `onDisconnect` removal for both records before joining.
7. Progress writes are throttled, while a heartbeat keeps presence current. A slot without a fresh heartbeat for 24 seconds may be reclaimed.
8. A remaining traveler may continue alone through a disconnect.
9. Expired rooms become unreadable and unwritable under the database rules.

## Firebase setup

Add `VITE_FIREBASE_DATABASE_URL` alongside the existing Firebase environment values. Create a Realtime Database in the same Firebase project, then review and release `database.rules.json` through the normal Firebase change process.

The repository's `firebase.json` describes database rules only. It does not configure hosting or deploy the application.

## Security limits

- Authentication is required for room reads and writes.
- Invitation codes use an alphabet that avoids ambiguous characters.
- Two fixed room slots enforce capacity; Realtime Database rules validate expiry, ownership, payload shape, and payload ranges.
- Client UIDs are not rendered in the interface.
- There is no public room directory or matchmaking.

Expired metadata is access-denied but remains stored until a trusted cleanup job removes it. Before a broad public release, add server-side join rate limiting and scheduled deletion of expired room metadata.
