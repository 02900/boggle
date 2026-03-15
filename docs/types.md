# TypeScript Interfaces

File: `src/interfaces/game.ts`

Type definitions shared across frontend components, hooks, and stores.

## Main Types

### Player

```ts
interface Player {
  id: string;
  name: string;
  score: number;
  wordsFound: string[];
  eliminatedWords?: string[];
  isConnected?: boolean;
  joinedAt?: number;
  disconnectedAt?: number;
}
```

### GameState

Complete game state received from the server.

```ts
interface GameState {
  board: string[][];                        // 4x4 board
  players: Player[];                        // Active players
  gameState: "waiting" | "playing" | "finished";
  timeLeft: number;                         // Seconds remaining
  diceRolls?: DiceRoll[];                   // Dice info (for animation)
  allParticipants?: Player[];               // All participants (including disconnected)
  playerStreaks?: Record<string, number>;    // Win streaks by name
  rotationVersion: number;                  // Board version (increments with rotation)
  clientSideValidation?: boolean;           // Feature flag
}
```

### DiceRoll

Information about a die for the rolling animation.

```ts
interface DiceRoll {
  diceNumber: number;                       // Die index (0-15)
  position: { row: number; col: number };   // Position on the board
  faces: string[];                          // 6 faces of the die
  rolledFace: number;                       // Index of the face that came up
  letter: string;                           // Resulting letter
}
```

### WordResult

Result of a word validation.

```ts
interface WordResult {
  valid: boolean;
  reason?: string;      // Rejection reason (if not valid)
  points?: number;      // Points awarded (if valid)
  word?: string;        // Normalized word
}
```

## Event Types

### GameEvents (Server -> Client)

```ts
interface GameEvents {
  "game-state": (state: GameState) => void;
  "game-started": (state: GameState) => void;
  "dice-rolling": (diceRolls: DiceRoll[]) => void;
  "timer-update": (timeLeft: number) => void;
  "game-ended": (state: GameState) => void;
  "word-result": (result: WordResult) => void;
  "player-joined": (data: { playerName: string; playerId: string }) => void;
  "player-left": (playerId: string) => void;
  "player-scored": (data: { playerId: string; word: string; points: number }) => void;
  "game-reset": (state: GameState) => void;
  "eliminate-common-words-changed": (data: { enabled: boolean; eliminateCommonWords: boolean }) => void;
  "client-side-validation-changed": (data: { enabled: boolean }) => void;
  "words-revalidated": (data: { totalWordsRemoved: number; affectedPlayers: number; summary: string }) => void;
  "join-confirmed": (data: { playerName: string; playerId: string }) => void;
}
```

### ClientEvents (Client -> Server)

```ts
interface ClientEvents {
  "join-game": (playerName: string) => void;
  "start-game": () => void;
  "submit-word": (data: { word: string; path: [number, number][]; rotationVersion: number }) => void;
  "reset-game": () => void;
  "toggle-eliminate-common-words": (enabled: boolean) => void;
  "toggle-client-side-validation": (enabled: boolean) => void;
}
```

## Auxiliary Types

```ts
type GameStatus = "waiting" | "playing" | "finished";

interface BoardCell {
  letter: string;
  row: number;
  col: number;
  isSelected: boolean;
}

interface WordPath {
  cells: [number, number][];
  word: string;
}
```
