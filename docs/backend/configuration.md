# Configuration

## Game Constants

File: `config/constants.js`

| Constant | Value | Description |
|----------|-------|------------|
| `TIME_LIMIT` | 188s | 3 minutes of gameplay + 8 seconds of dice animation |
| `ROTATION_COOLDOWN` | 30000ms | Minimum time between board rotations |
| `DEBUG_MODE` | `true` | Enables detailed socket event logs in the console |
| `SCOREBOARD_FILE` | `scoreboard.json` | Leaderboard persistence file |

## Boggle Dice

File: `game/gameConfig.js`

16 authentic dice configured for Spanish. Each die has 6 faces:

```
Die  1: A  E  O  S  N  R
Die  2: A  E  I  O  U  L
Die  3: D  E  R  L  A  S
Die  4: N  C  I  O  E  T
Die  5: B  U  M  A  R  O
Die  6: QU E  I  T  A  S    <- digraph QU
Die  7: G  L  E  A  N  O
Die  8: CH A  R  E  I  S    <- digraph CH
Die  9: P  O  L  A  S  U
Die 10: V  E  R  A  I  D
Die 11: M  E  N  T  O  A
Die 12: Z  A  QU U  E  N    <- digraph QU
Die 13: H  O  S  T  I  A
Die 14: F  A  L  D  E  I
Die 15: LL A  O  R  I  S    <- digraph LL
Die 16: Ñ  C  E  A  N  O    <- letter Ñ
```

Digraphs (QU, CH, LL) occupy a single cell on the board.

## Scoring

File: `game/gameConfig.js` - function `calculateWordPoints(word)`

| Word Length | Points |
|-------------|--------|
| 3 letters | 1 |
| 4 letters | 1 |
| 5 letters | 2 |
| 6 letters | 3 |
| 7 letters | 5 |
| 8+ letters | 11 |

## Persistence

- **Scoreboard**: `scoreboard.json` at the root. Top 50 scores with name, score, date, and player count.
- **Win Streaks**: `data/player-streaks.json`. Win streaks per player in 6-hour windows. Automatically cleaned up upon expiration.
