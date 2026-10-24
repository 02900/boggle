# Architecture

## General Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                  │
│                                                      │
│  Next.js 15 + React 19 + TypeScript                 │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │Components│  │  Hooks   │  │  Zustand Stores   │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       └──────────────┴────────────────┘              │
│                      │                               │
│              Socket.IO Client                        │
└──────────────────────┬───────────────────────────────┘
                       │ WebSocket
┌──────────────────────┴───────────────────────────────┐
│                    Server (Node.js)                   │
│                                                      │
│  ┌────────────────┐  ┌───────────────────────────┐   │
│  │ Socket.IO      │  │ BoggleGame                │   │
│  │ Handlers       ├──┤ - Game state              │   │
│  │                │  │ - Word validation          │   │
│  └────────────────┘  │ - Player management        │   │
│                      │ - Dictionary (~60K)         │   │
│                      └───────────────────────────┘   │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │scoreboard.json│  │player-streaks│                  │
│  │  (top 50)    │  │   .json      │                  │
│  └──────────────┘  └──────────────┘                  │
└──────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js | 15.4.4 |
| UI | React | 19.1.1 |
| Typing | TypeScript | 5.8.3 |
| State | Zustand | 5.0.6 |
| Styles | Tailwind CSS | 4.1.11 |
| Communication | Socket.IO | 4.8.1 |
| Testing | Vitest + jsdom | 4.1.0 |
| Runtime | Node.js | 22+ |

## Data Flow

### Word Submission (example)

1. User selects cells on `GameBoard` (mouse or keyboard)
2. `useGameLogic` builds the path and the word
3. If client-side validation is active, `ClientWordValidator` validates locally
4. `useSocket.submitWord()` emits `submit-word` with `{ word, path, rotationVersion }`
5. Server receives in `socketHandlers` -> calls `game.submitWord()`
6. `BoggleGame` validates: dictionary + path + adjacency + rotation version
7. Server emits `word-result` to the player and `game-state` to everyone
8. Client updates stores and shows visual feedback (green/red highlight)

### Game Start

1. Any player emits `start-game`
2. Server generates board with 16 dice, emits `dice-rolling`
3. Client shows `DiceRollingAnimation` for 8 seconds
4. Server emits `game-started` with the game state
5. A 3-minute timer starts on the server, emitting `timer-update` every second

## Feature Flags

| Flag | Default | Description |
|------|---------|------------|
| `clientSideValidation` | `true` | Validates words locally before sending to the server. Improves UX with immediate feedback. Re-validated server-side when the game ends. |
| `eliminateCommonWords` | `true` | When the game ends, eliminates words found by 2+ players. |

## Games and Routing

Games are played in **rooms**, so any number of Boggle and Scrabble games run at once.
`game/rooms/RoomManager.ts` (created in `server.ts`) owns them: each room has a 4-character
code (no 0/O/1/I), one game instance (`BoggleGame` or `ScrabbleGame`, both extending
`game/shared/WordGame.ts`) and a Socket.IO room `"<game>:<code>"`. The game's `io` is
`io.to(thatRoom)`, so everything it emits (clocks, turns, game end) stays in the room, and the
handlers broadcast with `io.to(room)` / `socket.to(room)` — never server-wide.

Flow (`socket/socketHandlers.ts`): a client connects with `?game=boggle|scrabble` and lands in
that game's **lobby** (`"<game>:lobby"`): `list-rooms` returns the open rooms and subscribes to
`rooms-updated`; `create-room` / `join-room { code }` put the socket in a room, and only then are
the game's handlers registered (one room per socket; switching rooms is a new connection).
Rooms with nobody connected are deleted after 10 minutes (`ROOM_IDLE_TTL_MS`). Invite links:
`/<game>?sala=CODE`.

The dictionary (~640k words) is parsed once per word-length rule and shared by all games.
Each game has its own leaderboard file (`scoreboard.json`, `scoreboard-scrabble.json`), shared
by all its rooms.

### Scrabble

- Turn-based, 2–4 players per room. Route: `/scrabble` (invite: `/scrabble?sala=CODE`).
- The server is authoritative: racks are private (sent per player in `game-state`), tiles are
  rebuilt from the server rack, and moves are validated by `game/scrabble/moveEvaluation.ts`
  (pure rules also used by the client to preview the score).
- Sessions are persisted to `data/scrabble-sessions/<roomCode>.json` after each turn, so players
  can rejoin after a reload (30s grace period) or a server restart (the room is recreated from
  the file with the same code).
- Protocol and lifecycle: [scrabble/socket-events.md](./scrabble/socket-events.md).
