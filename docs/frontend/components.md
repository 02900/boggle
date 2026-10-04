# Components

Frontend React components. Located in `src/components/`.

## Component Tree

```
BoggleGameMain (orchestrator)
├── JoinGameForm            (join form)
├── DiceRollingAnimation    (dice animation)
├── ViewDesktop / ViewMobile (responsive layouts)
│   ├── GameBoard           (interactive 4x4 board)
│   ├── GameControls        (buttons: start, reset, rotate)
│   ├── PlayersList         (list of connected players)
│   ├── FoundWords          (words found by the player)
│   ├── DictionaryStatus    (dictionary loading indicator)
│   └── ClientValidationToggle (local validation toggle)
├── Scoreboard              (modal: historical leaderboard)
├── GameInstructions        (modal: how to play)
├── GameSettings            (modal: settings)
└── MaxScoreModal           (modal: possible words)
```

## Main Components

### BoggleGameMain

`src/components/BoggleGameMain/index.tsx`

Main orchestrator. Decides which view to show based on state:
- If not joined -> `JoinGameForm`
- If dice are rolling -> `DiceRollingAnimation`
- If joined -> `ViewDesktop` or `ViewMobile` based on viewport

Has its own store (`boogle-game-main.store.ts`) and hook (`use-boggle-game-main.tsx`).

### GameBoard

`src/components/GameBoard.tsx`

Interactive 4x4 board. Supports:
- Mouse selection (click + drag)
- Keyboard selection
- Success highlights (green), error highlights (red), and skip highlights (yellow)
- Visualization of selected cells with connection lines

### DiceRollingAnimation

`src/components/DiceRollingAnimation.tsx`

Dice rolling animation in 4 steps (rows of 4 dice). Shows each die spinning and revealing its final letter. Total duration ~8 seconds.

### GameControls

`src/components/GameControls.tsx`

Game action buttons:
- **Start/Reset game**
- **Rotate board** (with cooldown indicator)
- **Settings** (opens modal)
- **Instructions** (opens modal)
- **Scoreboard** (opens modal)
- **Possible words** (opens modal)

### PlayersList

`src/components/PlayersList.tsx`

Player list with:
- Name and score
- Connection indicator
- Win streak (if applicable)
- Current player highlighting

### FoundWords

`src/components/FoundWords.tsx`

List of words found by the current player with points. Eliminated (common) words appear crossed out.

### JoinGameForm

`src/components/JoinGameForm.tsx`

Form to enter the player name. Includes a button to generate a random name. Saves the name in localStorage.

### Modals

- **Scoreboard** (`Scoreboard.tsx`) - Top 50 historical scores
- **GameInstructions** (`GameInstructions.tsx`) - Rules and how to play
- **GameSettings** (`GameSettings.tsx`) - Settings (common word elimination, local validation)
- **MaxScoreModal** (`MaxScoreModal.tsx`) - All possible words for the current board with maximum score

### Component Utilities

- **ClientOnly** (`ClientOnly.tsx`) - Wrapper that renders only on the client (avoids hydration errors)
- **DictionaryStatus** (`DictionaryStatus.tsx`) - Dictionary loading status indicator
- **ClientValidationToggle** (`ClientValidationToggle.tsx`) - Toggle to enable/disable local validation

## Scrabble

Located in `src/components/scrabble/`; base UI primitives (`Button`, `Card`, `Badge`, `Modal`,
`Timer`) in `src/components/ui/`.

```
ScrabbleGameMain (screen router + Toaster)
├── JoinForm                 (name, rules, scoreboard, "← Juegos")
├── ScrabbleLobby            (waiting room, 2–4 players, start, scoreboard)
├── ScrabbleScoreboard       (modal: Scrabble's top 50, filter by table size)
└── ScrabbleTable            (game screen; desktop two columns, mobile sticky rack)
    ├── LeaveGameButton      ("← Juegos"; confirms before abandoning mid-game)
    ├── TurnIndicator        (whose turn + Timer, negative in overtime)
    ├── ConnectionBanner     (own reconnection / others' grace countdown)
    ├── PlayerPanel          (scores, rack sizes, bag count)
    ├── ScrabbleBoard        (15×15, coordinates, keyboard play, BlankTileModal)
    ├── TileRack             (rack order, drag to reorder, shuffle)
    ├── ScrabbleControls     (score preview, confirm/recall/exchange/pass, skip in overtime)
    ├── MoveHistory
    └── GameOverModal        (podium, adjustments, time per player)
```

- **ScrabbleBoard** renders memoized `BoardCell`s with narrow store selectors, so the turn
  timer doesn't re-render the 225 cells. Roving tabindex: Tab lands on one cell, arrows move,
  typing a letter places that rack tile and advances, Backspace takes it back
  (`src/utils/board-keyboard.ts`). Clicking a tentative tile recalls it.
- **ScrabbleControls** previews formed words and points with `evaluateMove` (same rules as the
  server, no dictionary check).

Component tests live in `src/components/scrabble/__tests__/` (Testing Library; socket actions
are mocked through `useScrabbleSocket`).
