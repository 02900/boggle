# Scrabble — Protocolo de eventos socket

Tipos en `src/interfaces/scrabble.ts` (`ScrabbleClientEvents`, `ScrabbleGameEvents`).
Handlers en `socket/scrabble/scrabbleHandlers.ts`; los eventos de ciclo de turno los emite
directamente `game/scrabble/ScrabbleGame.ts` vía `this.io`.

## Cliente → Server

| Evento | Payload | Notas |
|---|---|---|
| `join-game` | `playerName` | Compartido con Boggle (`socket/shared`). |
| `rejoin-game` | `{ playerName, gameId }` | El cliente lo emite solo en `connect` si hay sesión en `localStorage`. |
| `start-game` | — | Requiere ≥ 2 jugadores. |
| `place-tiles` | `{ placements: TilePlacement[] }` | Colocación tentativa; el server quita las fichas del atril. |
| `recall-tiles` | — | Devuelve las tentativas al atril. |
| `submit-turn` | — | Valida colocación + diccionario. |
| `pass-turn` | — | |
| `exchange-tiles` | `{ tileIds }` | Requiere bolsa ≥ fichas a cambiar. |
| `reset-game` | — | Vuelve a `waiting`, limpia sesión y timers de gracia. |

## Server → Cliente

### Estado

| Evento | Payload | Destino | Cuándo |
|---|---|---|---|
| `game-state` | `ScrabbleGameState` (público) o `ScrabblePlayerGameState` (+ `rack`, `tentativePlacements`) | broadcast / socket | Tras cualquier acción. El privado es la **fuente de verdad** del atril y las tentativas del jugador, y se envía también cuando `submit-turn`/`place-tiles` fallan. |
| `game-started` | `ScrabbleGameState & { gameId }` | todos | El cliente guarda `{gameId, playerName}` para reconectar. |
| `start-failed` | `{ reason }` | socket | |
| `game-ended` | `GameEndedEvent` = estado + `reason` + `finalAdjustments[]` | todos | `reason`: `passes` (6 pases seguidos), `bag-empty`, `abandon`. |
| `game-reset` | `ScrabbleGameState` | todos | |
| `turn-timer-update` | `number` (segundos) | todos | Cada segundo. |

### Ciclo de turno

| Evento | Payload | Cuándo |
|---|---|---|
| `word-result` | `{ valid, reason?, points?, word? }` | Solo al que envió. Éxitos se anuncian con `turn-played`; el cliente solo muestra los rechazos. |
| `turn-played` | `TurnPlayedEvent { playerId, playerName, type, words?, score?, exchangedCount? }` | Cada vez que termina un turno. `type`: `place`, `pass`, `exchange`, `timeout` (se agotó el tiempo), `disconnect` (pase forzado al expirar la gracia). |
| `turn-changed` | `TurnChangedEvent { previousPlayerId, currentPlayerId, currentPlayerName, reason }` | Después de `turn-played`, salvo que la jugada termine la partida (entonces va `game-ended`). |

### Presencia

| Evento | Payload | Cuándo |
|---|---|---|
| `join-confirmed` | `{ playerId, playerName }` | Al propio socket tras `join-game`. |
| `player-joined` | `{ playerId, playerName }` | Jugador **nuevo** (no reconexión). |
| `player-disconnected` | `{ playerId, playerName, graceSeconds }` | Se desconectó durante la partida; sigue en la lista con `isConnected: false` durante `SCRABBLE_GRACE_PERIOD` (30 s). |
| `player-reconnected` | `{ playerId, playerName }` | Volvió dentro de la gracia. Nuevo `playerId`; el cliente actualiza el id por nombre. |
| `player-left` | `playerId` | Se fue en `waiting`, o expiró la gracia. |
| `rejoin-success` | `ScrabblePlayerGameState & { gameId }` | Al socket que reconecta. |
| `rejoin-failed` | `{ reason }` | El cliente borra la sesión guardada. |

## Reconexión

1. `game-started` incluye `gameId` → el cliente persiste `scrabble-session` en `localStorage`.
2. En cada `connect` del socket (carga inicial o reconexión de red) el cliente emite `rejoin-game` si hay sesión.
3. El server aplica **"la conexión más nueva gana"**: si el socket viejo aún figura conectado
   (el `disconnect` no llegó todavía), lo expulsa y remapea al nuevo id. El `disconnect` tardío
   de un socket ya remapeado se ignora.
4. Si el jugador no vuelve en 30 s: pase forzado (`turn-played` tipo `disconnect`) si era su turno,
   `player-left`, y sus fichas vuelven a la bolsa.
