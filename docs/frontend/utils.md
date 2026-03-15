# Utilities

Frontend helper functions.

## gameUtils

File: `src/utils/gameUtils.ts`

Pure functions for game logic.

| Function | Signature | Description |
|----------|-----------|------------|
| `calculateWordScore` | `(word: string) => number` | Points by word length (1, 2, 3, 5, 11) |
| `formatTime` | `(seconds: number) => string` | Formats seconds to `M:SS` |
| `areAdjacent` | `(cell1, cell2) => boolean` | Checks adjacency (horizontal, vertical, diagonal) |
| `isValidPath` | `(path, board, word) => boolean` | Validates complete path: adjacency, no repetition, correct letters |
| `generateRandomPlayerName` | `() => string` | Generates a name like `SwiftFox42` |
| `getGameStatusEmoji` | `(status) => string` | Emoji by game status |
| `getBoardDifficulty` | `(board) => 'Easy' \| 'Medium' \| 'Hard'` | Difficulty based on vowel ratio |

## ClientWordValidator

File: `src/utils/clientWordValidator.ts`

Class that replicates server validation on the client for immediate feedback. Uses `DictionaryService` internally.

### Validation (`validateWord`)

Validates in this order:
1. Minimum length (3 letters)
2. Word not duplicated (vs `playerWords`)
3. Valid path on 4x4 board (adjacency, no repetition, bounds)
4. Word in dictionary (if the dictionary is loaded)

If the dictionary is not loaded, the word is assumed valid and delegated to the server.

### API

| Method | Return | Description |
|--------|--------|------------|
| `validateWord(board, word, path, playerWords)` | `ClientWordValidationResult` | Full validation |
| `isReady()` | `boolean` | Whether the dictionary is ready |
| `getDictionarySize()` | `number` | Words in dictionary |
| `getStats()` | `object` | Validator and dictionary statistics |
| `forceReload()` | `Promise<DictionaryLoadResult>` | Reloads the dictionary |
| `waitForLoad()` | `Promise<DictionaryLoadResult>` | Waits for loading to finish |

### ClientWordValidationResult

```ts
{
  valid: boolean;
  reason?: string;
  points?: number;
  word?: string;
  isClientValidation: true;  // Distinguishes from server validation
}
```

## socket-emitter

File: `src/utils/socket-emitter.ts`

Centralized socket event emitter that accesses the store directly (without hooks). Used by stores that need to emit events outside of React components.

- `socketEmitter.emitGetScoreboard()` - Requests leaderboard
- `socketEmitter.emitGetMaxScore()` - Requests possible words

## compose-classes

File: `src/utils/compose-classes.ts`

Utility for composing CSS classes by filtering out falsy values:

```ts
composeClasses("foo", condition && "bar", null, "baz")
// => "foo bar baz" or "foo baz"
```
