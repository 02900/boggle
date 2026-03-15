# Plan: Multi-game support — Boggle + Scrabble

## Context

The project currently only supports Boggle. We want to extend it so users can choose between Boggle and classic turn-based Scrabble from a landing page. Both games use the Spanish dictionary. **Scrabble games must be resumable** — players can disconnect and reconnect to an ongoing game in a later session, preserving the full game state. This is a large feature, broken into phases.

---

## Phase 1: Multi-game architecture + routing

Refactor to support multiple game types without breaking existing Boggle functionality.

### 1.1 Routing (Next.js App Router)

- `/` — Landing page: game selector (Boggle or Scrabble)
- `/boggle` — Boggle game (move existing `page.tsx` content here)
- `/scrabble` — Scrabble game (new)

**Files:**
- `src/app/page.tsx` — Rewrite as landing page with two game cards
- `src/app/boggle/page.tsx` — New, renders `<BoggleGameMain />`
- `src/app/scrabble/page.tsx` — New, renders `<ScrabbleGameMain />`
- `src/app/layout.tsx` — Keep as-is (shared layout)

### 1.2 Backend: Base game class

Extract shared logic from `BoggleGame.js` into a base class.

**New file: `game/WordGame.js`** — Base class with:
- Player management (addPlayer, removePlayer, getRandomName)
- Game lifecycle (state machine: waiting → playing → finished)
- Timer management (configurable time limit)
- Dictionary loading and word lookup
- Common word elimination
- Score persistence (scoreboard)
- Streak tracking
- io/socket reference management
- Feature flags (eliminateCommonWords, clientSideValidation)
- `getGameState()` — abstract, implemented by subclasses

**Refactor: `game/BoggleGame.js`** — Extends `WordGame`:
- Keep only: board generation (dice), rotation, path validation, `findAllPossibleWords()`
- Inherit: player management, timers, dictionary, scoring, etc.

**New file: `game/ScrabbleGame.js`** — Extends `WordGame`:
- Scrabble-specific logic (see Phase 2)

### 1.3 Backend: Multi-game server

**Refactor: `server.js`**
- Create one game instance per type: `{ boggle: new BoggleGame(), scrabble: new ScrabbleGame() }`
- Socket connection includes game type (via query param or namespace)
- Route socket events to the correct game instance

**Refactor: `socket/socketHandlers.js`**
- Accept game type parameter
- Route events to the appropriate game instance
- Shared events (join, disconnect, scoreboard) work the same
- Game-specific events (rotate-board for Boggle, place-tiles for Scrabble) dispatched accordingly

### 1.4 Shared frontend interfaces

**Refactor: `src/interfaces/game.ts`**
- Add `GameType = "boggle" | "scrabble"` type
- Add Scrabble-specific interfaces (see Phase 2)
- Keep existing Boggle interfaces as-is

---

## Phase 2: Scrabble game implementation

### 2.1 Scrabble game config

**New file: `game/scrabbleConfig.js`**

**Board**: 15x15 grid with multiplier squares:
- TW (Triple Word): 8 squares
- DW (Double Word): 17 squares (including center star)
- TL (Triple Letter): 12 squares
- DL (Double Letter): 24 squares

**Spanish tile distribution (100 tiles):**

| Letter | Count | Points |
|--------|-------|--------|
| A | 12 | 1 |
| E | 12 | 1 |
| O | 9 | 1 |
| I | 6 | 1 |
| S | 6 | 1 |
| N | 5 | 1 |
| R | 5 | 1 |
| L | 4 | 1 |
| U | 5 | 1 |
| T | 4 | 1 |
| D | 5 | 2 |
| G | 2 | 2 |
| C | 4 | 3 |
| B | 2 | 3 |
| M | 2 | 3 |
| P | 2 | 3 |
| H | 2 | 4 |
| F | 1 | 4 |
| V | 1 | 4 |
| Y | 1 | 4 |
| Q | 1 | 5 |
| J | 1 | 8 |
| Ñ | 1 | 8 |
| X | 1 | 8 |
| Z | 1 | 10 |
| Blank | 2 | 0 |

### 2.2 Scrabble backend: `game/ScrabbleGame.js`

**State:**
- `board`: 15x15 grid (each cell: `{ letter, points, multiplier, placedBy }` or `null`)
- `tileBag`: Array of remaining tiles
- `playerRacks`: `Map<playerId, tile[]>` — 7 tiles per player
- `currentTurnPlayerId`: Who's turn it is
- `turnTimeLimit`: Seconds per turn (e.g., 120s)
- `turnTimer`: Timer for current turn
- `consecutivePasses`: Track for end-game condition
- `placedTilesThisTurn`: Tiles placed during current turn (before confirmation)
- `gameId`: Unique game identifier for persistence/reconnection
- `playerNameToId`: `Map<playerName, socketId>` — maps stable player names to current socket IDs (updated on reconnect)

**Methods:**
- `startGame()` — Fill all racks from bag, set first player's turn, persist initial state
- `placeTiles(playerId, tiles[])` — Place tiles on board (tentative, before submit)
- `submitTurn(playerId)` — Validate placement, score, draw new tiles, next turn, persist state
- `recallTiles(playerId)` — Remove tentatively placed tiles back to rack
- `exchangeTiles(playerId, tileIndices[])` — Swap tiles with bag, skip turn, persist state
- `passTurn(playerId)` — Pass without playing, persist state
- `validatePlacement(tiles[])`:
  1. All tiles in same row or same column
  2. Tiles connected (no gaps)
  3. At least one tile touches existing tile (or center on first turn)
  4. All formed words (horizontal + vertical) exist in dictionary
- `calculateTurnScore(tiles[])`:
  1. Sum letter values with letter multipliers
  2. Apply word multipliers
  3. Multipliers only apply on first use (the turn they're covered)
  4. 50-point bonus for using all 7 tiles ("bingo")
- `findAllFormedWords(tiles[])` — Find all words formed by the placement (main word + cross words)
- `endGame()` — When bag is empty and a player uses all tiles, or all players pass consecutively. Delete persisted state.
- `getGameState()` — Board, racks (each player sees only theirs), scores, current turn, bag count
- `serialize()` — Returns full game state as a JSON-serializable object for persistence
- `static deserialize(data)` — Reconstructs a ScrabbleGame instance from persisted data
- `reconnectPlayer(playerName, newSocketId)` — Re-maps a player's socket ID, restores their rack, resumes turn if it was theirs

### 2.3 Scrabble socket events

**New client → server events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `place-tile` | `{ tileIndex, row, col }` | Place tile from rack onto board |
| `recall-tiles` | — | Return placed tiles to rack |
| `submit-turn` | — | Confirm tile placement, end turn |
| `exchange-tiles` | `{ tileIndices: number[] }` | Exchange tiles with bag |
| `pass-turn` | — | Pass without playing |
| `assign-blank` | `{ tileIndex, letter }` | Assign letter to blank tile |

**New server → client events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `turn-started` | `{ playerId, timeLeft }` | New turn begins |
| `tiles-placed` | `{ tiles, playerId }` | Tiles placed (broadcast) |
| `tiles-recalled` | `{ playerId }` | Tiles recalled (broadcast) |
| `turn-result` | `{ valid, words[], score, newTiles[] }` | Turn result to player |
| `rack-update` | `{ rack: tile[] }` | Updated rack (private to player) |
| `bag-count` | `{ count }` | Remaining tiles in bag |
| `turn-timeout` | `{ playerId }` | Player's turn timed out (auto-pass) |

### 2.4 Scrabble session persistence & reconnection (essential)

Scrabble games must survive server restarts and player disconnections. Players reconnect by name.

**New file: `utils/gameSessionStore.js`** — Persistence layer:
- `saveGameSession(gameId, serializedState)` — Writes game state to `data/scrabble-sessions/<gameId>.json`
- `loadGameSession(gameId)` — Reads and returns a persisted game state
- `deleteGameSession(gameId)` — Removes a finished/abandoned game
- `listActiveSessions()` — Returns all active (non-finished) sessions with metadata (gameId, players, created, lastUpdated)
- `cleanupStaleSessions(maxAgeHours)` — Removes sessions older than threshold (e.g., 72 hours)

**Persistence triggers** (in `ScrabbleGame`):
- After every state mutation (submitTurn, passTurn, exchangeTiles, player join/leave)
- Call `serialize()` → `saveGameSession()`
- On `endGame()`, delete the session file

**Reconnection flow:**

```
Player opens /scrabble
  → Client sends join-game with { playerName, gameId? }
  → If gameId provided AND session exists:
      1. Server loads session via deserialize()
      2. Maps playerName → new socketId
      3. Sends full game state to reconnected player (including their rack)
      4. Broadcasts player-reconnected to others
      5. If it was this player's turn, resumes/restarts their turn timer
  → If no gameId (or session expired):
      Normal new game flow
```

**Frontend reconnection:**
- On `/scrabble` page load, check `localStorage` for `scrabble-session-{playerName}` containing `{ gameId, playerName }`
- If found, auto-attempt reconnection with that `gameId`
- Show UI: "Reconnecting to game..." or "Game not found, start new"
- On successful join/reconnect, save `{ gameId, playerName }` to localStorage
- On game end, clear localStorage entry

**New socket events for reconnection:**

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `rejoin-game` | client → server | `{ playerName, gameId }` | Attempt to rejoin an existing game |
| `rejoin-success` | server → client | `{ gameState, rack }` | Full state restore on successful rejoin |
| `rejoin-failed` | server → client | `{ reason }` | Session not found or expired |
| `player-reconnected` | server → broadcast | `{ playerName }` | Notify others a player returned |

**Disconnection handling:**
- When a Scrabble player disconnects, do NOT remove them (unlike Boggle)
- Mark as disconnected but keep their rack and score
- If it's their turn, start a grace period timer (e.g., 60s). If they don't reconnect, auto-pass
- Game continues if other players remain connected
- If ALL players disconnect, game stays persisted on disk — anyone can reconnect later

**Data file:** `data/scrabble-sessions/<gameId>.json` containing:
```json
{
  "gameId": "uuid",
  "createdAt": "ISO timestamp",
  "lastUpdatedAt": "ISO timestamp",
  "board": [[...]],
  "tileBag": [...],
  "players": [{ "name": "...", "score": 0, "rack": [...], "wordsFound": [...] }],
  "currentTurnPlayerName": "...",
  "turnTimeLeft": 120,
  "consecutivePasses": 0,
  "gameState": "playing",
  "moveHistory": [{ "playerName": "...", "tiles": [...], "words": [...], "score": 5 }]
}
```

Note: Players are keyed by **name** (not socket ID) in the persisted state, since socket IDs change on reconnection.

### 2.5 Scrabble frontend types (renumbered from old 2.4)

**New in `src/interfaces/game.ts`:**

```ts
interface ScrabbleTile {
  letter: string;
  points: number;
  isBlank: boolean;
  assignedLetter?: string; // For blank tiles
}

interface ScrabbleBoardCell {
  tile: ScrabbleTile | null;
  multiplier: "DL" | "TL" | "DW" | "TW" | null;
  placedBy: string | null;
  isNewThisTurn: boolean;
}

interface ScrabbleGameState {
  board: ScrabbleBoardCell[][];    // 15x15
  players: ScrabblePlayer[];
  gameState: GameStatus;
  currentTurnPlayerId: string | null;
  turnTimeLeft: number;
  bagCount: number;
  consecutivePasses: number;
}

interface ScrabblePlayer extends Player {
  rackSize: number;    // Other players see only count, not letters
  rack?: ScrabbleTile[]; // Only visible to the player themselves
}
```

### 2.6 Scrabble frontend components

**New files:**

| File | Description |
|------|-------------|
| `src/components/ScrabbleGameMain/index.tsx` | Main orchestrator (like BoggleGameMain) |
| `src/components/ScrabbleGameMain/scrabble-game.store.ts` | Zustand store for Scrabble state |
| `src/components/ScrabbleBoard.tsx` | 15x15 board with multiplier squares, tile drop zones |
| `src/components/TileRack.tsx` | Player's 7-tile rack with drag source |
| `src/components/ScrabbleTile.tsx` | Individual tile component (letter + points) |
| `src/components/ScrabbleControls.tsx` | Submit, Recall, Exchange, Pass buttons |
| `src/components/TurnIndicator.tsx` | Shows whose turn it is + timer |
| `src/hooks/useScrabbleGameLogic.ts` | Tile placement, rack management |
| `src/hooks/useScrabbleSocketListeners.ts` | Scrabble-specific socket listeners |

**Reused from Boggle (shared):**
- `JoinGameForm.tsx` — Add `gameType` prop
- `PlayersList.tsx` — Works as-is
- `Scoreboard.tsx` — Works as-is
- `GameInstructions.tsx` — Parameterize by game type
- Stores: `sockets.store.ts`, `viewport.store.ts`, `modal.store.ts`, `scoreboard.store.ts`

### 2.7 Scrabble UI layout

**Desktop:**
```
┌─────────────────────────────────────────────────┐
│  Turn: PlayerName (1:45)    [Pass] [Exchange]   │
├───────────────────────────┬─────────────────────┤
│                           │  Players & Scores   │
│    15x15 Scrabble Board   │  ─────────────────  │
│    (with multipliers)     │  Current turn: →    │
│                           │                     │
├───────────────────────────┤                     │
│  [A₁][E₁][S₁][T₁][O₁][R₁][_₀]  [Submit]    │
│  ^^^^^ Your Rack ^^^^^           [Recall]      │
└─────────────────────────────────────────────────┘
```

**Tile interaction:** Click tile in rack → click cell on board to place. Click placed tile to recall. No drag-and-drop (simpler to implement, works on mobile).

---

## Phase 3: Landing page

### `src/app/page.tsx` — Game selector

Two cards side by side (or stacked on mobile):

```
┌──────────────────┐  ┌──────────────────┐
│                  │  │                  │
│    🎲 BOGGLE     │  │   📝 SCRABBLE    │
│                  │  │                  │
│  Find words on   │  │  Place tiles to  │
│  a 4x4 grid     │  │  build words     │
│                  │  │                  │
│  Real-time       │  │  Turn-based      │
│  multiplayer     │  │  multiplayer     │
│                  │  │                  │
│    [ Play ]      │  │    [ Play ]      │
└──────────────────┘  └──────────────────┘
```

---

## Implementation order

1. **Phase 1.1**: Routing — Create landing page + `/boggle` route (move existing game there)
2. **Phase 1.2-1.3**: Backend refactor — Extract `WordGame` base class, multi-game server
3. **Phase 1.4**: Frontend interfaces for Scrabble types
4. **Phase 2.1**: Scrabble config (board layout, tiles)
5. **Phase 2.2**: ScrabbleGame backend (core game logic)
6. **Phase 2.3**: Scrabble socket events
7. **Phase 2.4**: Session persistence & reconnection (gameSessionStore, serialize/deserialize, rejoin flow)
8. **Phase 2.6-2.7**: Scrabble frontend (components, hooks, store, reconnection UI)
9. **Phase 3**: Landing page polish

## Key files to create

```
game/WordGame.js                              # Base class
game/ScrabbleGame.js                          # Scrabble engine
game/scrabbleConfig.js                        # Board layout, tiles, scoring
utils/gameSessionStore.js                     # Scrabble session persistence
data/scrabble-sessions/                       # Directory for session JSON files
src/app/page.tsx                              # Landing page (rewrite)
src/app/boggle/page.tsx                       # Boggle route
src/app/scrabble/page.tsx                     # Scrabble route
src/components/ScrabbleGameMain/index.tsx      # Orchestrator
src/components/ScrabbleGameMain/scrabble-game.store.ts
src/components/ScrabbleBoard.tsx              # 15x15 board
src/components/TileRack.tsx                   # Player rack
src/components/ScrabbleTile.tsx               # Tile component
src/components/ScrabbleControls.tsx           # Turn actions
src/components/TurnIndicator.tsx              # Turn + timer display
src/hooks/useScrabbleGameLogic.ts             # Placement logic
src/hooks/useScrabbleSocketListeners.ts       # Socket listeners
```

## Key files to modify

```
server.js                                     # Multi-game instances
socket/socketHandlers.js                      # Game-type routing
game/BoggleGame.js                            # Extend WordGame
src/interfaces/game.ts                        # Scrabble types
src/components/JoinGameForm.tsx               # gameType prop
src/components/GameInstructions.tsx            # Game-specific instructions
```

## Verification

1. `pnpm build` — No TypeScript/ESLint errors
2. `pnpm test:run` — Existing Boggle tests still pass
3. Manual: Open `/` → see game selector → click Boggle → full Boggle game works as before
4. Manual: Open `/` → click Scrabble → join → start game → place tiles → submit turn → scoring works
5. Manual: Scrabble turn timer, pass, exchange, end game conditions all work
6. Manual: Mobile layout for both games
7. Manual: Scrabble reconnection — start game, close browser, reopen `/scrabble` → auto-reconnects with full state (board, rack, scores)
8. Manual: Scrabble disconnect during turn — other players see grace period, auto-pass after 60s
9. Verify `data/scrabble-sessions/` files are created during game and deleted after game ends
