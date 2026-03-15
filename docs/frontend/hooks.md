# Custom Hooks

React hooks that encapsulate reusable game logic.

## Summary

| Hook | File | Purpose |
|------|------|---------|
| `useSocket` | `src/hooks/useSocket.ts` | Socket connection, event emission, audio, vibration |
| `useGameLogic` | `src/hooks/useGameLogic.ts` | Cell selection (mouse/keyboard), word construction |
| `useSocketListeners` | `src/hooks/use-socket-listeners.ts` | Setup for all socket event listeners |
| `useClientWordValidation` | `src/hooks/useClientWordValidation.ts` | Local validation with server fallback |
| `useHighlightManager` | `src/hooks/use-highlight-manager.ts` | Board highlight animations |
| `useMobileListener` | `src/hooks/use-mobile-listener.ts` | Mobile viewport detection (768px) |
| `useClientValidationPersistence` | `src/hooks/useClientValidationPersistence.ts` | Validation preference persistence in localStorage |

## Details

### useSocket

Returns functions for interacting with the server and sensory feedback.

**Game functions:**
- `connectSocket()` - Initiates Socket.IO connection
- `joinGame(playerName)` - Emits `join-game`
- `startGame()` - Emits `start-game`
- `submitWord(word, path)` - Emits `submit-word` with the current `rotationVersion`
- `resetGame()` - Emits `reset-game`
- `rotateBoard()` - Emits `rotate-board`
- `clearDiceRolling()` - Clears dice animation state

**Feedback:**
- `triggerVibration()` - Haptic vibration on mobile (200ms)
- `playSuccessSound()` - Valid word sound (`/move-self.mp3`)
- `playErrorSound()` - Error sound (`/illegal.mp3`)
- `playSkipSound()` - Duplicate word sound (`/skip.mp3`)

**Flags:**
- `toggleEliminateCommonWords(enabled)` - Elimination toggle
- `toggleClientSideValidation(enabled)` - Local validation toggle

### useGameLogic

User interaction logic with the board.

**Selection functions:**
- `handleCellMouseDown(row, col)` - Starts selection via mouse/touch
- `handleCellMouseEnter(row, col)` - Continues selection while dragging
- `handleMouseUp()` - Ends selection and submits word
- `isCellSelected(row, col)` - Checks if a cell is in the current path
- `resetSelection()` - Clears current selection

**Keyboard functions:**
- `handleKeyboardInput(letter)` - Adds letter via keyboard by finding an available adjacent cell
- `handleKeyboardSubmit()` - Submits the word formed by keyboard
- `handleKeyboardBackspace()` - Removes the last letter

**Other:**
- `addFoundWord(word)` - Adds word to the found words list
- `resetFoundWords()` - Clears the found words list
- `countAvailableNeighbors(row, col)` - Counts available neighbors for a cell

### useSocketListeners

Instantiated once. Registers listeners for all server events:

- `game-state` -> updates `gameState` in store
- `join-confirmed` -> saves `currentPlayerId`, marks `isJoined`
- `game-started` -> clears found words, clears dice
- `word-result` -> shows highlight and message, plays sound
- `player-scored` -> shows skip highlight on the path
- `timer-update` -> updates `timeLeft`
- `game-ended` -> end-of-game handling
- `board-rotated` -> updates board and cooldown
- `dice-rolling` -> starts dice animation
- Automatic reconnection with timeout and retry

### useClientWordValidation

Wrapper over `ClientWordValidator` that integrates with the stores.

**Returns:**
- `submitWordWithClientValidation(word, path)` - Validates locally and emits to server
- `validateWordPreview(word, path)` - Validation preview without submitting
- `isClientValidationEnabled` - Whether local validation is active
- `isValidatorReady` - Whether the dictionary is loaded
- `dictionarySize` - Number of words in the dictionary

### useHighlightManager

Manages board highlight animations with auto-cleanup.

- `showHighlight(path, type)` - Shows highlight of type `success`, `error`, or `skip`
- `clearAllHighlights()` - Clears all active highlights
- Highlights auto-clear after a timeout

### useMobileListener

Registers a `resize` listener that updates `useViewportStore.isMobile` based on a 768px breakpoint.

### useClientValidationPersistence

Persists the client-side validation preference in `localStorage`. On mount, restores the saved preference and emits the toggle to the server.
