# Game Engine

File: `game/BoggleGame.js`

Main class that handles all game logic. A single instance is shared across all connections.

## Lifecycle

```
waiting ──[start-game]──> playing ──[timer=0]──> finished ──[reset-game]──> waiting
```

- **waiting**: Players join. Anyone can start the game.
- **playing**: 188-second timer (3 min + 8s animation). Players submit words.
- **finished**: Final scores are calculated, common words are eliminated (if enabled), and the scoreboard is updated.

## Board Generation

16 authentic Boggle dice configured for Spanish are used (see [configuration](./configuration.md)). The process:

1. The 16 dice are randomly shuffled
2. Each die is "rolled" -- a random face is chosen
3. The dice are placed on a 4x4 grid
4. Complete information for each die (faces, position, result) is returned for the animation

## Word Validation

`submitWord(playerId, word, path, rotationVersion)` validates in this order:

1. The game is in `playing` state
2. The `rotationVersion` matches the current board version (or is found in history)
3. The word has 3+ letters
4. The word was not previously found by the player
5. Each cell in the path is adjacent to the previous one (including diagonals)
6. No cells are repeated in the path
7. The letters in the path match the word
8. The word exists in the dictionary (~60,000 Spanish words)

## Scoring

| Length | Points |
|--------|--------|
| 3-4 letters | 1 |
| 5 letters | 2 |
| 6 letters | 3 |
| 7 letters | 5 |
| 8+ letters | 11 |

## Board Rotation

- Rotates 90 degrees clockwise
- 30-second cooldown between rotations
- Each rotation increments `rotationVersion`
- A history of the last 5 board versions is kept to handle words submitted during a rotation (race condition)

## Common Word Elimination

When the game ends, if `eliminateCommonWords` is enabled:

1. All found words are grouped by player
2. Words found by 2+ players are marked as eliminated
3. Scores are recalculated
4. Eliminated words appear crossed out in the UI

## Finding All Possible Words (DFS)

`findAllPossibleWords()` traverses the board with DFS to find all valid words:

1. Starts from each cell on the board
2. Recursively explores all unvisited adjacent cells
3. At each step, checks if the current prefix can lead to a valid word
4. Collects all found words with their path and score

## Player Management

- Players are identified by `socket.id`
- On disconnect, they are marked as disconnected but kept in history
- If a player reconnects with the same name, they are merged with their history
- Random names are assigned if none is provided

## Dictionary

- Loaded from `file-2017.txt` at server startup
- ~60,000 Spanish words
- Filtered: only words with 3+ letters, no numbers, no problematic accents
- Converted to lowercase for case-insensitive comparison

## ScrabbleGame

File: `game/scrabble/ScrabbleGame.ts` (rules shared with the client in `game/scrabble/moveEvaluation.ts`,
board/tiles/scoring in `game/scrabble/scrabbleConfig.ts`).

```
waiting ──[start-game, 2–4 players]──> playing ──[game over]──> finished ──[reset-game]──> waiting
```

- **Start**: random turn order, fresh 100-tile Spanish bag (CH, LL, RR, Ñ, 2 blanks), 7 tiles each.
  New players can't join a started game (`canJoin()`).
- **Turn**: the player places tiles tentatively (`placeTiles`, taken from the server rack), then
  `submitTurn` checks placement (one line, contiguous, center on the first move, connected
  afterwards), finds main + cross words, checks the dictionary (2+ letters) and scores
  (premiums only under new tiles, +50 bingo). Or `passTurn` / `exchangeTiles` (bag ≥ 7).
- **Clock**: 2 minutes per turn that keeps running negative; another player can `skipTurn` once
  it's ≤ 0 (a forced pass). Time used and overtime are tracked per player.
- **Game over**: 6 consecutive passes, bag empty + a player out of tiles, or abandon (< 2 players
  left). Remaining tile values are subtracted (scores may go negative) and given to whoever went out.
- **Persistence**: `serialize` / `deserialize` for rejoin and server restarts; `reconnectPlayer`
  remaps a player to a new socket id.

Lifecycle events (`turn-played`, `turn-changed`, `game-ended`) are emitted by the class itself.
