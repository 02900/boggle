# Scrabble — Protocolo de eventos socket

Tipos en `src/interfaces/scrabble.ts` (`ScrabbleClientEvents`, `ScrabbleGameEvents`).
Handlers en `socket/scrabble/scrabbleHandlers.ts`; los eventos de ciclo de turno los emite
directamente `game/scrabble/ScrabbleGame.ts` vía `this.io`.

## Cliente → Server

| Evento | Payload | Notas |
|---|---|---|
| `join-game` | `playerName` | Compartido con Boggle (`socket/shared`). Scrabble lo rechaza con `join-failed` si la partida ya empezó o hay 4 jugadores. |
| `rejoin-game` | `{ playerName, gameId }` | El cliente lo emite solo en `connect` si hay sesión en `localStorage`. |
| `start-game` | — | Requiere ≥ 2 jugadores. Mezcla el orden de turnos. |
| `place-tiles` | `{ placements: TilePlacement[] }` | Colocación tentativa; el server quita las fichas del atril. Solo se usan `tile.id`, la posición y `tile.assignedLetter` (obligatorio para comodines); letra y valor salen del atril del server. |
| `recall-tiles` | — | Devuelve las tentativas al atril. |
| `recall-tile` | `{ tileId }` | Devuelve **una** ficha tentativa (click en el tablero). |
| `submit-turn` | — | Valida colocación + diccionario. |
| `pass-turn` | — | |
| `exchange-tiles` | `{ tileIds }` | Requiere ≥ 1 ficha y bolsa con ≥ 7 fichas. |
| `skip-turn` | — | Otro jugador salta el turno actual; solo con el reloj en ≤ 0. Pase forzado (`turn-played` tipo `timeout` con `skippedByName`). Si se rechaza, responde `word-result` inválido. |
| `reset-game` | — | Vuelve a `waiting`, limpia sesión y timers de gracia. |
| `leave-game` | — | Salir a propósito ("← Juegos"): se quita al jugador ya, sin período de gracia. En partida pasa el turno o termina por `abandon`. |

## Server → Cliente

### Estado

| Evento | Payload | Destino | Cuándo |
|---|---|---|---|
| `game-state` | `ScrabbleGameState` (público) o `ScrabblePlayerGameState` (+ `rack`, `tentativePlacements`) | broadcast / socket | Tras cualquier acción. El privado es la **fuente de verdad** del atril y las tentativas del jugador, y se envía también cuando `submit-turn`/`place-tiles` fallan. |
| `game-started` | `ScrabbleGameState & { gameId }` | todos | El cliente guarda `{gameId, playerName}` para reconectar. |
| `start-failed` | `{ reason }` | socket | |
| `game-ended` | `GameEndedEvent` = estado + `reason` + `finalAdjustments[]` | todos | `reason`: `passes` (6 pases seguidos), `bag-empty`, `abandon` (quedan < 2 jugadores; sin ajuste de fichas). Los puntajes finales pueden ser negativos. |
| `game-reset` | `ScrabbleGameState` | todos | |
| `turn-timer-update` | `number` (segundos) | todos | Cada segundo. **Sigue en negativo** al agotarse el tiempo: el turno no se pasa solo. |

### Ciclo de turno

| Evento | Payload | Cuándo |
|---|---|---|
| `word-result` | `{ valid, reason?, points?, word? }` | Solo al que envió. Éxitos se anuncian con `turn-played`; el cliente solo muestra los rechazos. |
| `turn-played` | `TurnPlayedEvent { playerId, playerName, type, words?, score?, exchangedCount? }` | Cada vez que termina un turno. `type`: `place`, `pass`, `exchange`, `timeout` (otro jugador lo saltó con el reloj agotado; trae `skippedByName`), `disconnect` (pase forzado al expirar la gracia). |
| `turn-changed` | `TurnChangedEvent { previousPlayerId, currentPlayerId, currentPlayerName, reason }` | Después de `turn-played`, salvo que la jugada termine la partida (entonces va `game-ended`). Al iniciar se emite una vez con `reason: "start"` y `previousPlayerId: null` (antes de `game-started`). |

### Presencia

| Evento | Payload | Cuándo |
|---|---|---|
| `join-confirmed` | `{ playerId, playerName }` | Al propio socket tras `join-game`. |
| `join-failed` | `{ reason }` | Al propio socket cuando `join-game` se rechaza. |
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
   `player-left`, y sus fichas vuelven a la bolsa. Si solo queda un jugador, la partida termina
   con `game-ended` (`abandon`) y no se emite `player-left`.
5. Si el server se reinició, el primer rejoin restaura la partida desde disco y reanuda el timer del turno.

## Tiempo por jugador

Cada `ScrabblePlayer` en `game-state`/`game-ended` trae `timeUsed` (segundos de turnos terminados,
incluido el tiempo extra) y `overtime` (segundos pasados del límite). Se acumulan al terminar cada
turno (jugada, pase, cambio, salto o pase por desconexión), se persisten en la sesión y se reinician
al empezar una partida. El modal de resultados los muestra por jugador.

