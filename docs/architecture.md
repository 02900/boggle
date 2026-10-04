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

The server hosts one instance per game in a `GameRegistry` (`server.ts`): `BoggleGame` and
`ScrabbleGame`, both extending `game/shared/WordGame.ts` (players, names, dictionary). A client
picks its game with the Socket.IO query `?game=boggle|scrabble`; `socket/socketHandlers.ts`
wires the shared handlers (`join-game`, scoreboard) plus the game-specific ones. Each game
has its own leaderboard file (`scoreboard.json`, `scoreboard-scrabble.json`).

### Scrabble

- Turn-based, 2–4 players, one shared table (`default-scrabble`). Routes: `/scrabble`.
- The server is authoritative: racks are private (sent per player in `game-state`), tiles are
  rebuilt from the server rack, and moves are validated by `game/scrabble/moveEvaluation.ts`
  (pure rules also used by the client to preview the score).
- Sessions are persisted to `data/scrabble-sessions/<gameId>.json` after each turn, so players
  can rejoin after a reload (30s grace period) or a server restart.
- Protocol and lifecycle: [scrabble/socket-events.md](./scrabble/socket-events.md).
