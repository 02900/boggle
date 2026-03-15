# Zustand Stores

Global frontend state managed with Zustand 5. Each store is independent and accessed directly without providers.

## Summary

| Store | File | Purpose |
|-------|------|---------|
| `useGameLogicStore` | `src/stores/game-logic.store.ts` | Current word, selected path, found words |
| `useSocketsStore` | `src/stores/sockets.store.ts` | Socket connection, dice animation, flags |
| `useBoggleGameMainStore` | `src/components/BoggleGameMain/boogle-game-main.store.ts` | Game state, rotation, highlights, current player |
| `useScoreboardStore` | `src/stores/scoreboard.store.ts` | Historical leaderboard |
| `useMaxScoreStore` | `src/stores/max-score.store.ts` | Possible words for the current board |
| `useModalStore` | `src/stores/modal.store.ts` | Modal visibility |
| `useViewportStore` | `src/stores/viewport.store.ts` | Mobile/desktop detection |
| `lastSubmittedRefGlobal` | `src/stores/last-submitted-ref.store.ts` | Last submitted word (synchronous global ref) |

## Details

### useGameLogicStore

Manages the state of user interaction when selecting cells and forming words.

| State | Type | Default |
|-------|------|---------|
| `currentWord` | `string` | `""` |
| `selectedPath` | `[number, number][]` | `[]` |
| `isSelecting` | `boolean` | `false` |
| `foundWords` | `string[]` | `[]` |
| `message` | `string` | `""` |

### useSocketsStore

Socket connection state and configuration flags.

| State | Type | Default |
|-------|------|---------|
| `socket` | `Socket \| null` | `null` |
| `isConnected` | `boolean` | `false` |
| `diceRolling` | `DiceRoll[] \| null` | `null` |
| `eliminateCommonWords` | `boolean` | `true` |

### useBoggleGameMainStore

Main game store. Contains the state received from the server and UI states.

| State | Type | Default |
|-------|------|---------|
| `gameState` | `GameState` | `{ board: [], players: [], gameState: "waiting", timeLeft: 180, ... }` |
| `rotationCooldown` | `number` | `0` |
| `rotationMessage` | `string` | `""` |
| `highlightedPath` | `[number, number][]` | `[]` |
| `highlightedErrorPath` | `[number, number][]` | `[]` |
| `highlightedSkipPath` | `[number, number][]` | `[]` |
| `currentPlayerId` | `string \| null` | `null` |
| `isJoined` | `boolean` | `false` |

### useScoreboardStore

| State | Type | Default |
|-------|------|---------|
| `scoreboard` | `ScoreEntry[]` | `[]` |
| `isLoading` | `boolean` | `false` |

Method `requestScoreboard()` emits the socket event and sets `isLoading: true`.

### useMaxScoreStore

| State | Type | Default |
|-------|------|---------|
| `maxScoreData` | `MaxScoreData \| null` | `null` |
| `isLoading` | `boolean` | `false` |

Methods: `requestMaxScore()` (emits event), `resetMaxScore()` (clears data).

### useModalStore

| State | Type | Default |
|-------|------|---------|
| `modalType` | `ModalType \| null` | `null` |

Enum `ModalType`: `None`, `Settings`, `Instructions`, `MaxScore`.

### useViewportStore

| State | Type | Default |
|-------|------|---------|
| `isMobile` | `boolean` | `false` |

### lastSubmittedRefGlobal

Not a Zustand store. It is a module with synchronous get/set to avoid race conditions with asynchronous state updates. Stores `{ path, word }` of the last submitted word.

## Setter Pattern

All stores (except the simplest ones) support both direct values and updater functions:

```ts
// Direct value
setCurrentWord("hello");

// Updater function
setCurrentWord((prev) => prev + "o");
```
