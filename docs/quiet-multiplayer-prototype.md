# Quiet Multiplayer Prototype

## Purpose

Test whether a shared typing presence can make Trace feel companionable without turning practice into competition. This prototype is intentionally local-only: two tabs in the same browser profile communicate through `BroadcastChannel`. It does not connect remote people or write room activity to Firebase.

## Interaction

1. A traveler creates a six-character invitation code.
2. A second tab joins with that code.
3. Both receive the same short passage and type it independently.
4. Each traveler may hide the other person's presence mark at any time.
5. The shared state contains only anonymous presence, progress percentage, completion state, and latency.
6. When one traveler finishes, their mark becomes still; nobody is declared first or fastest.
7. When both finish, the room displays a shared closing message and offers a quiet return home.
8. Leaving broadcasts a final presence update. Reopening the same room URL rejoins with a new temporary page identity.

## Privacy and access policy

- Rooms are invite-only; no public directory, discovery, or matchmaking.
- Display names, account profiles, typed text, individual keystrokes, WPM, accuracy, and mistakes are never shared.
- The prototype stores no room transcript or multiplayer history.
- A production version must validate room membership on the server, use expiring unguessable invitations, cap rooms at two people, and delete ephemeral room state shortly after both people leave.
- Blocking and reporting must be available before remote strangers can meet. Reports should contain only room identifiers and server events, never passage input.
- Presence is optional and can be hidden without leaving the session.

## Disconnect and rejoin

- A heartbeat is sent every two seconds.
- A peer is considered away after seven seconds without a heartbeat.
- Rejoining the room restores presence but not the typed passage, which remains local to the tab.
- The remaining traveler can continue alone and is never blocked by a disconnect.

## Abuse controls required before production

- Two-person room limit enforced by the server.
- Expiring invitations with rate-limited joins.
- Block, report, and leave actions reachable by keyboard.
- No free-form chat, custom display names, file sharing, reactions, or user-supplied passages in the first release.
- Server-side event limits and automatic room expiry.

## Prototype assessment

The prototype exposes round-trip latency as calm language: **Near** below 120 ms, **Gentle delay** below 300 ms, and **Distant** at 300 ms or above. Exact milliseconds are available only in the room details.

Evaluate with two people for at least five passages:

- Did the presence mark feel supportive or distracting?
- Did either traveler feel rushed by progress visibility?
- Was hiding presence easy to discover?
- Did disconnect/rejoin interrupt the remaining traveler?
- Did latency change the perceived calmness?

Do not expand the prototype until the majority of sessions feel calmer with presence than without it.
