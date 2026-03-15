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
| `get-scoreboard` | -- | Request the historical leaderboard. |
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
| `scoreboard-data` | `ScoreEntry[]` | sender | Historical top 50. |
| `max-score-data` | `MaxScoreData` | sender | All possible words for the board. |
| `eliminate-common-words-changed` | `{ enabled, eliminateCommonWords }` | all | Configuration change. |
| `client-side-validation-changed` | `{ enabled }` | all | Feature flag change. |
| `words-revalidated` | `{ totalWordsRemoved, affectedPlayers, summary }` | all | Revalidation result at the end of the game. |

## Connection Flow

```
Client connects
  -> connection (server registers socket)
  -> join-game("Juan")
  <- join-confirmed({ playerId: "abc", playerName: "Juan" })
  <- game-state(current state)
  <- eliminate-common-words-changed(current config)
  -> broadcast: player-joined to others

Client disconnects
  -> disconnect
  -> broadcast: player-left to others
  -> player marked as disconnected in history
```
