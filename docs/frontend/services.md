# Services

## DictionaryService

File: `src/services/dictionaryService.ts`

Singleton service that loads and manages the word dictionary for client-side validation.

### Loading Strategy

Loading follows a priority chain:

```
1. Cache (localStorage)  ->  success? use it
2. Remote (/diccionario-espanol.txt)  ->  success? save to cache and use it
3. Fallback (100+ hardcoded words)  ->  always available
```

### localStorage Cache

- **Key**: `boggle-dictionary-cache` (words serialized as JSON)
- **Version**: `boggle-dictionary-version` (currently `1.0.0`)
- **Timestamp**: `boggle-dictionary-cache-timestamp`
- **Expiration**: 24 hours
- **Invalidation**: version change or time expiration

### Remote Loading with Retry

- URL: `/diccionario-espanol.txt`
- 3 attempts with incremental backoff (`1s * attempt`)
- Filters out words shorter than 3 characters
- Converts everything to lowercase

### Fallback Dictionary

100+ common Spanish words hardcoded to guarantee basic functionality if remote loading fails.

### Public API

| Method | Return | Description |
|--------|--------|------------|
| `loadDictionary()` | `Promise<DictionaryLoadResult>` | Loads the dictionary (cache -> remote -> fallback) |
| `hasWord(word)` | `boolean` | Checks if a word exists |
| `isReady()` | `boolean` | Whether the dictionary has finished loading |
| `isLoadingDictionary()` | `boolean` | Whether it is currently loading |
| `getDictionarySize()` | `number` | Number of loaded words |
| `getStats()` | `object` | Complete statistics |
| `forceReload()` | `Promise<DictionaryLoadResult>` | Clears cache and reloads |

### DictionaryLoadResult

```ts
{
  success: boolean;
  wordsLoaded: number;
  source: 'remote' | 'fallback' | 'cache';
  loadTime: number;
  error?: string;
}
```

### Notes

- In server-side rendering (`typeof window === 'undefined'`), only the fallback is used
- The loading promise is deduplicated: multiple concurrent calls to `loadDictionary()` share the same promise
