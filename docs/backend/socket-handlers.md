# Socket Events

File: `socket/socketHandlers.js`

Bidirectional communication protocol between client and server via Socket.IO.

## Client -> Server Events

| Event | Payload | Description |
|-------|---------|------------|
| `join-game` | `playerName: string` | Join the game. If the name is empty, a random one is assigned. |
| `start-game` | -- | Start a new game. Any player can do this. |
| `submit-word` | `{ word, path, rotationVersion }` | Submit a found word. `rotationVersion` prevents race conditions with rotations. |
| `reset-game` | -- | Reset the game to `waiting` state. |
| `rotate-board` | -- | Rotate the board 90 degrees (subject to 30s cooldown). |
| `get-scoreboard` | -- | Request the historical leaderboard of the socket's game (Boggle or Scrabble). |
| `get-max-score` | -- | Request all possible words for the current board. |
| `toggle-eliminate-common-words` | `enabled: boolean` | Enable/disable common word elimination. |
| `toggle-client-side-validation` | `enabled: boolean` | Enable/disable client-side validation. |

## Server -> Client Events

| Event | Payload | Target | Description |
|-------|---------|--------|------------|
| `game-state` | `GameState` | all | Complete game state (sent after each change). |
| `join-confirmed` | `{ playerId, playerName }` | sender | Join confirmation with the final assigned name. |
| `player-joined` | `{ playerId, playerName }` | broadcast | Notifies other players. |
| `player-left` | `playerId: string` | broadcast | Player disconnected. |
| `dice-rolling` | `DiceRoll[]` | all | Dice info for animation (when starting a game). |
| `game-started` | `GameState` | all | Game state after dice animation. |
| `timer-update` | `timeLeft: number` | all | Seconds remaining (every second). |
| `game-ended` | `GameState` | all | Final game state. |
| `word-result` | `WordResult` | sender | Validation result (only in server validation mode). |
| `player-scored` | `{ playerId, word, points }` | broadcast | Another player found a word. |
| `board-rotated` | `{ board, cooldownTime, rotationVersion }` | all | Rotated board with new version. |
| `rotation-error` | `{ message }` | sender | Error when rotating (cooldown active or game not started). |
| `scoreboard-data` | `ScoreEntry[]` | sender | Historical top 50 of the socket's game. |
| `max-score-data` | `MaxScoreData` | sender | All possible words for the board. |
| `eliminate-common-words-changed` | `{ enabled, eliminateCommonWords }` | all | Configuration change. |
| `client-side-validation-changed` | `{ enabled }` | all | Feature flag change. |
| `words-revalidated` | `{ totalWordsRemoved, affectedPlayers, summary }` | all | Revalidation result at the end of the game. |

## Rooms and Lobby (both games)

File: `socket/socketHandlers.ts`. Every broadcast in the tables above goes **to the player's
room only** (`io.to(room)` / `socket.to(room)`); nothing is sent server-wide.

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `list-rooms` | C→S | -- | Join this game's lobby; answered with `rooms-list`, then live `rooms-updated`. |
| `create-room` | C→S | `{ playerName }` | New room (random 4-char code); the creator joins it. Empty name = random. |
| `join-room` | C→S | `{ code, playerName }` | Join by code (case-insensitive). |
| `get-scoreboard` | C→S | -- | Works from the lobby too; returns the socket's game leaderboard. |
| `rooms-list` / `rooms-updated` | S→C | `RoomSummary[]` | `{ code, hostName, playerCount, maxPlayers, status, joinable }`, newest first. |
| `join-confirmed` | S→C | `{ playerId, playerName, roomCode }` | In the room; the client puts `?sala=CODE` in the URL. |
| `join-failed` | S→C | `{ reason }` | Unknown room, game started/full (Scrabble), or already in a room. |

## Connection Flow

```
Client connects (?game=boggle)
  -> list-rooms                    (lobby)
  <- rooms-list([...]), later rooms-updated([...])
  -> create-room({ playerName })   or join-room({ code, playerName })
  <- game-state(current state)
  <- join-confirmed({ playerId, playerName, roomCode })
  <- eliminate-common-words-changed(current config)
  -> room: player-joined, game-state

Client disconnects
  -> disconnect
  -> room: player-left, game-state
  -> player marked as disconnected in history
  -> nobody left connected: the room is deleted 10 min later

Client reconnects (network drop)
  -> new socket in the lobby; the client re-sends join-room with its room code
```

## Scrabble

Files: `socket/shared/sharedHandlers.ts` (`joinPlayer`; Scrabble adds a `canJoin` admission
check → `join-failed`) and `socket/scrabble/scrabbleHandlers.ts` (`setupScrabbleHandlers`,
`rejoinScrabble`). `rejoin-game { gameId: roomCode }` is a lobby event.

Scrabble sockets connect with `?game=scrabble`. Full event reference (turns, presence, grace
period, reconnection): [../scrabble/socket-events.md](../scrabble/socket-events.md).
