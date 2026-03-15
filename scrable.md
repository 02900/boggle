# Plan: Arquitectura multi-juego — Boggle + Scrabble

## Contexto

El proyecto actualmente soporta solo Boggle con toda la logica del servidor ya migrada a TypeScript (301 tests, 21 archivos de test). El objetivo es extender el proyecto para soportar Scrabble ademas de Boggle, con un landing page para seleccionar juego, codigo compartido entre ambos juegos, y codigo especifico aislado en su propio directorio. Cada step debe terminar con tests y build pasando.

**Baseline actual:** 301 tests (133 client + 168 server), `pnpm test:run` + `pnpm run build` pasan.

---

## Estructura de directorios objetivo

```
game/
  shared/
    WordGame.ts                    # Clase base abstracta
    __tests__/
      WordGame.test.ts
      setup.ts                     # Setup compartido (console mocking)
  boggle/
    BoggleGame.ts                  # Extiende WordGame
    boggleConfig.ts                # Dados + scoring Boggle
    __tests__/
      BoggleGame.test.ts
      boggleConfig.test.ts
  scrabble/
    ScrabbleGame.ts                # Extiende WordGame
    scrabbleConfig.ts              # Tablero, fichas, scoring Scrabble
    gameSessionStore.ts            # Persistencia de sesiones
    __tests__/
      ScrabbleGame.test.ts
      scrabbleConfig.test.ts
      gameSessionStore.test.ts

socket/
  socketHandlers.ts                # Orquestador: rutea a handlers por tipo de juego
  shared/
    sharedHandlers.ts              # join-game, disconnect, get-scoreboard
    __tests__/sharedHandlers.test.ts
  boggle/
    boggleHandlers.ts              # rotate-board, submit-word, get-max-score
    __tests__/boggleHandlers.test.ts
  scrabble/
    scrabbleHandlers.ts            # place-tiles, submit-turn, pass-turn, rejoin-game
    __tests__/scrabbleHandlers.test.ts

config/
  constants.ts                     # Compartidos: DEBUG_MODE, SCOREBOARD_FILE
  boggleConstants.ts               # TIME_LIMIT, ROTATION_COOLDOWN
  scrabbleConstants.ts             # TURN_TIME_LIMIT, GRACE_PERIOD, BOARD_SIZE, etc.

utils/                             # Todo compartido (sin cambios)

src/interfaces/
  game.ts                          # Compartidos: Player, GameStatus, WordResult, BaseGameState
  boggle.ts                        # DiceRoll, BoggleGameState, BoggleEvents
  scrabble.ts                      # ScrabbleTile, ScrabbleBoardCell, ScrabbleGameState, ScrabbleEvents
  server.ts                        # TypedServer, PlayerData, StreakData (compartidos)

src/app/
  page.tsx                         # Landing page (selector de juego)
  boggle/page.tsx                  # Juego Boggle
  scrabble/page.tsx                # Juego Scrabble

src/components/
  shared/                          # JoinGameForm, PlayersList, Scoreboard
  boggle/                          # BoggleGameMain/, GameBoard, GameControls, GameInstructions
  scrabble/                        # ScrabbleGameMain/, ScrabbleBoard, TileRack, ScrabbleControls
```

---

## Step 1: Extraer clase base WordGame

**Objetivo:** Extraer logica compartida de `BoggleGame` a una clase abstracta `WordGame`. Cero cambios de comportamiento — los 301 tests existentes deben pasar.

### Logica que se mueve a WordGame

**Propiedades:** `players`, `gameState`, `timeLeft`, `timer`, `updateTimer`, `io`, `words`, `availableNames`, `gameHistory`, `clientSideValidation`

**Metodos concretos:** `setIO()`, `clearTimers()`, `clearInternalTimer()`, `clearUpdateTimer()`, `initializeDictionary()`, `getRandomName()`, `releaseName()`, `addPlayer()`, `removePlayer()`, `resetGame()`, `setClientSideValidation()`, `getClientSideValidation()`

**Metodos abstractos:** `startGame()`, `endGame()`, `getGameState()`

**Constructor:** Acepta `config: { timeLimit: number }` para parametrizar `TIME_LIMIT`.

### Logica que queda en BoggleGame

**Propiedades:** `board`, `lastRotationTime`, `rotationCooldown`, `eliminateCommonWords`, `rotationVersion`, `boardHistory`, `maxBoardHistory`, `lastDiceRolls`

**Metodos:** `generateBoard()`, `rotateBoard()`, `saveBoardToHistory()`, `getBoardByVersion()`, `transformCoordinates()`, `submitWord()`, `isValidPath()`, `validatePathOnBoard()`, `revalidateClientWords()`, `eliminateCommonWordsFromPlayers()`, `findAllPossibleWords()`, `setEliminateCommonWords()`

### Archivos

| Accion | Archivo |
|--------|---------|
| Crear | `game/shared/WordGame.ts` |
| Crear | `game/shared/__tests__/WordGame.test.ts` (~18 tests: constructor, dictionary, addPlayer, removePlayer, getRandomName, releaseName, resetGame, clearTimers, clientSideValidation) |
| Modificar | `game/BoggleGame.ts` — `extends WordGame`, eliminar metodos extraidos, constructor llama `super({ timeLimit: TIME_LIMIT })` |
| Modificar | `vitest.config.ts` — server include cambiar a `game/**/__tests__/**/*.test.ts` |
| Mover | `game/__tests__/setup.ts` → `game/shared/__tests__/setup.ts` |

**Verificacion:** `pnpm test:run && pnpm run build` (301 + ~18 = ~319 tests)

---

## Step 2: Reorganizar directorios de game/

**Objetivo:** Mover BoggleGame y su config a `game/boggle/`. Actualizar imports.

| Origen | Destino |
|--------|---------|
| `game/BoggleGame.ts` | `game/boggle/BoggleGame.ts` |
| `game/gameConfig.ts` | `game/boggle/boggleConfig.ts` |
| `game/__tests__/BoggleGame.test.ts` | `game/boggle/__tests__/BoggleGame.test.ts` |
| `game/__tests__/gameConfig.test.ts` | `game/boggle/__tests__/boggleConfig.test.ts` |

**Imports a actualizar:**
- `game/boggle/BoggleGame.ts` → imports de `../shared/WordGame`, `../../config/constants`, `../../utils/*`, `./boggleConfig`
- `socket/socketHandlers.ts` → `../game/boggle/BoggleGame`
- `server.ts` → `./game/boggle/BoggleGame`
- Todos los test files correspondientes

**Verificacion:** `pnpm test:run && pnpm run build` (~319 tests, +0)

---

## Step 3: Reorganizar socket handlers

**Objetivo:** Separar handlers compartidos de los especificos de Boggle. Crear patron de orquestador.

| Accion | Archivo |
|--------|---------|
| Crear | `socket/shared/sharedHandlers.ts` — `join-game`, `disconnect`, `get-scoreboard`, `toggle-client-side-validation` (usan solo metodos de WordGame) |
| Crear | `socket/boggle/boggleHandlers.ts` — `start-game`, `submit-word`, `reset-game`, `rotate-board`, `get-max-score`, `toggle-eliminate-common-words` |
| Modificar | `socket/socketHandlers.ts` — orquestador que llama a ambos |
| Crear | `socket/shared/__tests__/sharedHandlers.test.ts` (~10 tests) |
| Crear | `socket/boggle/__tests__/boggleHandlers.test.ts` (~16 tests) |
| Mantener | `socket/__tests__/socketHandlers.test.ts` como test de integracion (26 tests existentes) |

**Verificacion:** `pnpm test:run && pnpm run build` (~319 + ~26 = ~345 tests)

---

## Step 4: Reorganizar config e interfaces

**Objetivo:** Separar constantes y tipos por juego. Preparar interfaces para Scrabble.

### Config

| Accion | Archivo |
|--------|---------|
| Crear | `config/boggleConstants.ts` — mover `TIME_LIMIT`, `ROTATION_COOLDOWN` |
| Crear | `config/scrabbleConstants.ts` — `TURN_TIME_LIMIT=120`, `GRACE_PERIOD=30000`, `BOARD_SIZE=15`, `RACK_SIZE=7`, `BINGO_BONUS=50` |
| Modificar | `config/constants.ts` — dejar solo `DEBUG_MODE`, `SCOREBOARD_FILE` |
| Crear | `config/__tests__/boggleConstants.test.ts` (~2 tests) |
| Crear | `config/__tests__/scrabbleConstants.test.ts` (~5 tests) |
| Modificar | `config/__tests__/constants.test.ts` — solo DEBUG_MODE y SCOREBOARD_FILE (2 tests) |

### Interfaces

| Accion | Archivo |
|--------|---------|
| Crear | `src/interfaces/boggle.ts` — mover: `DiceRoll`, `BoardCell`, `WordPath`, `DiceConfiguration`, `DieFaces`, `StartGameResult`, `RotateBoardResult`, `MaxScoreData`, `RevalidationResult`. Crear `BoggleGameState`, `BoggleGameEvents`, `BoggleClientEvents` |
| Crear | `src/interfaces/scrabble.ts` — `ScrabbleTile`, `MultiplierType`, `ScrabbleBoardCell`, `ScrabbleGameState`, `ScrabblePlayer`, `TilePlacement`, `ScrabbleTurnResult`, `ScoredWord`, `ScrabbleGameEvents`, `ScrabbleClientEvents` |
| Modificar | `src/interfaces/game.ts` — dejar solo compartidos: `Player`, `GameStatus`, `WordResult`, `ScoreboardEntry`, `BaseGameState`. Mantener aliases para backward-compat del cliente |
| Modificar | `src/interfaces/server.ts` — dejar solo compartidos: `TypedServer`, `TypedSocket`, `Board`, `PlayerData`, `StreakData`, `SessionStats`. Re-exportar desde boggle.ts para compat |

**Verificacion:** `pnpm test:run && pnpm run build` (~345 + ~5 = ~350 tests)

---

## Step 5: Servidor multi-juego

**Objetivo:** Soportar multiples instancias de juego, ruteadas por query param `game=boggle|scrabble`.

| Accion | Archivo |
|--------|---------|
| Crear | `game/GameRegistry.ts` — registro de instancias: `registerGame(type, instance)`, `getGame(type)` |
| Crear | `game/__tests__/GameRegistry.test.ts` (~8 tests) |
| Modificar | `server.ts` — crear instancia BoggleGame, registrar en GameRegistry, pasar a socket handlers |
| Modificar | `socket/socketHandlers.ts` — leer `socket.handshake.query.game`, rutear a handlers especificos. Default=`boggle` |
| Modificar | `socket/__tests__/socketHandlers.test.ts` — agregar tests de ruteo (~4 tests) |

**Verificacion:** `pnpm test:run && pnpm run build` (~350 + ~12 = ~362 tests)

---

## Step 6: Routing del cliente + Landing page

**Objetivo:** Crear pagina de seleccion de juego. Mover Boggle a `/boggle`. Crear stub `/scrabble`.

| Accion | Archivo |
|--------|---------|
| Crear | `src/app/boggle/page.tsx` — renderiza `<BoggleGameMain />` |
| Crear | `src/app/scrabble/page.tsx` — placeholder "Scrabble — Proximamente" |
| Crear | `src/components/shared/GameSelector.tsx` — dos tarjetas: Boggle y Scrabble |
| Modificar | `src/app/page.tsx` — reemplazar BoggleGameMain con GameSelector |
| Modificar | `src/hooks/useSocket.ts` — aceptar `gameType` param, enviar como query: `io({ query: { game: gameType } })` |

**Verificacion:** `pnpm test:run && pnpm run build` (~362 tests, +0)

---

## Step 7: Scrabble config

**Objetivo:** Implementar toda la configuracion estatica de Scrabble.

| Accion | Archivo |
|--------|---------|
| Crear | `game/scrabble/scrabbleConfig.ts` |

Contenido:
- `MULTIPLIER_BOARD: MultiplierType[][]` — layout 15x15 estandar de Scrabble
- `TILE_DISTRIBUTION: Record<string, { count: number; value: number }>` — distribucion española (100 fichas)
- `LETTER_VALUES: Record<string, number>` — valor por letra
- `createEmptyBoard(): ScrabbleBoardCell[][]`
- `createTileBag(): ScrabbleTile[]` — bolsa mezclada de 100 fichas
- `calculateWordScore(tiles: TilePlacement[], board: ScrabbleBoardCell[][]): number`
- `calculateTurnScore(words: ScoredWord[]): number` — incluye bingo bonus (+50 por usar 7 fichas)

| Accion | Archivo |
|--------|---------|
| Crear | `game/scrabble/__tests__/scrabbleConfig.test.ts` (~28 tests) |

Tests clave: tablero 15x15, multiplicadores correctos (8 TW, 17 DW, 12 TL, 24 DL), centro es DW, simetria, bolsa tiene 100 fichas, conteo correcto por letra, scoring con/sin multiplicadores, bingo bonus.

**Verificacion:** `pnpm test:run && pnpm run build` (~362 + ~28 = ~390 tests)

---

## Step 8: ScrabbleGame — logica core

**Objetivo:** Implementar `ScrabbleGame extends WordGame` con mecanica por turnos.

| Accion | Archivo |
|--------|---------|
| Crear | `game/scrabble/ScrabbleGame.ts` |

**Propiedades adicionales:**
- `board: ScrabbleBoardCell[][]`
- `tileBag: ScrabbleTile[]`
- `playerRacks: Map<string, ScrabbleTile[]>`
- `playerOrder: string[]`
- `currentTurnIndex: number`
- `turnTimer`, `turnTimeLeft`
- `consecutivePasses: number`
- `tentativePlacements: Map<string, TilePlacement[]>`
- `isFirstTurn: boolean`
- `moveHistory: MoveRecord[]`

**Overrides de WordGame:**
- `addPlayer()` — super + reparte 7 fichas del bag
- `removePlayer()` — devuelve fichas al bag + super
- `startGame()` — prepara tablero, primer turno, timer por turno
- `endGame()` — scoring final (deducciones por fichas restantes), scoreboard
- `getGameState()` — oculta racks de otros jugadores
- `resetGame()` — super + reset tablero/bag

**Metodos nuevos:**
- `placeTiles(playerId, placements)` — colocar fichas tentativamente
- `recallTiles(playerId)` — devolver fichas tentativas al rack
- `submitTurn(playerId)` — validar colocacion + scoring + robar fichas + siguiente turno
- `passTurn(playerId)` — incrementar pases consecutivos, avanzar turno
- `exchangeTiles(playerId, tileIds)` — intercambiar fichas con bolsa
- `advanceTurn()` — siguiente jugador, reset timer
- `validatePlacement(placements)` — todas en linea, conectadas, sin huecos, tocan ficha existente (o centro en primer turno), todas las palabras formadas existen en diccionario
- `findFormedWords(placements)` — encontrar todas las palabras formadas (horizontal + vertical)
- `serialize()` / `static deserialize()` — para persistencia (Step 10)

| Accion | Archivo |
|--------|---------|
| Crear | `game/scrabble/__tests__/ScrabbleGame.test.ts` (~55 tests) |

Tests clave: constructor, addPlayer reparte 7 fichas, placeTiles valido/invalido, recallTiles, submitTurn con scoring, submitTurn invalido (no conectado, huecos, no toca centro), passTurn avanza turno, pases consecutivos terminan juego, exchangeTiles, timer expira auto-pass, end game deducciones, getGameState oculta racks, ciclo completo de juego.

**Verificacion:** `pnpm test:run && pnpm run build` (~390 + ~55 = ~445 tests)

---

## Step 9: Scrabble socket events

**Objetivo:** Implementar handlers de socket para Scrabble.

| Accion | Archivo |
|--------|---------|
| Crear | `socket/scrabble/scrabbleHandlers.ts` |

**Eventos client → server:**
- `start-game` — inicia juego Scrabble
- `place-tiles` `{ placements }` — colocar fichas
- `recall-tiles` — devolver fichas
- `submit-turn` — confirmar turno
- `pass-turn` — pasar turno
- `exchange-tiles` `{ tileIds }` — intercambiar fichas
- `reset-game` — reiniciar

**Eventos server → client:**
- `game-state`, `turn-started`, `turn-timer-update`, `tiles-placed`, `turn-submitted`, `turn-passed`, `tiles-exchanged`, `game-ended`

| Accion | Archivo |
|--------|---------|
| Crear | `socket/scrabble/__tests__/scrabbleHandlers.test.ts` (~22 tests) |
| Modificar | `socket/socketHandlers.ts` — agregar ruteo para `game: 'scrabble'` |
| Modificar | `server.ts` — crear instancia ScrabbleGame, registrar |

**Verificacion:** `pnpm test:run && pnpm run build` (~445 + ~22 = ~467 tests)

---

## Step 10: Persistencia de sesiones + reconexion

**Objetivo:** Scrabble games sobreviven reinicios del servidor. Jugadores reconectan por nombre.

| Accion | Archivo |
|--------|---------|
| Crear | `game/scrabble/gameSessionStore.ts` — `saveSession()`, `loadSession()`, `deleteSession()`, `listSessions()`. Archivos en `data/scrabble-sessions/<gameId>.json` |
| Crear | `game/scrabble/__tests__/gameSessionStore.test.ts` (~14 tests: save/load/delete/list, round-trip preserva estado, load retorna null si no existe) |
| Modificar | `game/scrabble/ScrabbleGame.ts` — implementar `serialize()` y `static deserialize()` |
| Modificar | `socket/scrabble/scrabbleHandlers.ts` — agregar evento `rejoin-game` `{ playerName, gameId }`, auto-save despues de cada mutacion |
| Modificar | `socket/scrabble/__tests__/scrabbleHandlers.test.ts` — agregar tests de rejoin (~5 tests) |

**Flujo de reconexion:**
1. Cliente abre `/scrabble`, revisa `localStorage` para `scrabble-session-{playerName}`
2. Si existe `{ gameId, playerName }`, envia `rejoin-game`
3. Servidor carga sesion, remapea socketId al jugador, envia estado completo
4. Si no existe o expiro → flujo normal de nuevo juego

**Desconexion:** No se elimina al jugador (a diferencia de Boggle). Si es su turno, grace period de 30s → auto-pass.

**Verificacion:** `pnpm test:run && pnpm run build` (~467 + ~19 = ~486 tests)

---

## Step 11: Frontend Scrabble — stores y hooks

**Objetivo:** Crear la capa de estado y comunicacion para el frontend de Scrabble.

| Accion | Archivo |
|--------|---------|
| Crear | `src/stores/scrabble-game.store.ts` — estado del juego Scrabble, rack, selected tile, tentative placements |
| Crear | `src/stores/__tests__/scrabble-game.store.test.ts` (~10 tests) |
| Crear | `src/hooks/use-scrabble-socket.ts` — emitters: placeTiles, recallTiles, submitTurn, passTurn, exchangeTiles, joinGame, rejoinGame |
| Crear | `src/hooks/use-scrabble-socket-listeners.ts` — listeners para eventos de Scrabble, actualizan store |

**Verificacion:** `pnpm test:run && pnpm run build` (~486 + ~10 = ~496 tests)

---

## Step 12: Frontend Scrabble — componentes

**Objetivo:** Construir la UI de Scrabble.

| Accion | Archivo |
|--------|---------|
| Crear | `src/components/scrabble/ScrabbleGameMain/index.tsx` — orquestador principal |
| Crear | `src/components/scrabble/ScrabbleBoard.tsx` — grid 15x15 con colores de multiplicadores |
| Crear | `src/components/scrabble/TileRack.tsx` — rack de 7 fichas |
| Crear | `src/components/scrabble/ScrabbleTile.tsx` — componente de ficha (letra + valor) |
| Crear | `src/components/scrabble/ScrabbleControls.tsx` — Submit Turn, Pass, Exchange, Recall |
| Crear | `src/components/scrabble/TurnIndicator.tsx` — turno actual + timer |
| Crear | `src/components/scrabble/ScrabbleInstructions.tsx` — reglas de Scrabble |
| Modificar | `src/app/scrabble/page.tsx` — reemplazar placeholder con `<ScrabbleGameMain />` |

**Interaccion:** Click ficha en rack → click celda en tablero para colocar. Click ficha colocada para devolver. Sin drag-and-drop (funciona en mobile).

**Verificacion:** `pnpm test:run && pnpm run build` (~496 tests, +0 a +8 de componentes)

---

## Step 13: Extraer componentes compartidos

**Objetivo:** Mover componentes reutilizables al directorio shared.

| Accion | Archivo |
|--------|---------|
| Mover | `JoinGameForm.tsx` → `src/components/shared/JoinGameForm.tsx` — parametrizar por `gameType` (icono, titulo, key de localStorage) |
| Mover | `PlayersList.tsx` → `src/components/shared/PlayersList.tsx` — aceptar `getWordScore` como prop |
| Mover | `Scoreboard.tsx` → `src/components/shared/Scoreboard.tsx` |
| Modificar | Imports en `BoggleGameMain` y `ScrabbleGameMain` |

**Verificacion:** `pnpm test:run && pnpm run build` (~496 tests, +0)

---

## Step 14: Landing page y polish final

**Objetivo:** Pulir la pagina de seleccion, navegacion, branding consistente.

| Accion | Archivo |
|--------|---------|
| Modificar | `src/app/page.tsx` — landing page final con tarjetas de juego |
| Modificar | `src/app/layout.tsx` — metadata actualizada ("Juegos de Palabras") |
| Modificar | `src/components/shared/GameSelector.tsx` — diseño pulido |

**Verificacion final:**
1. `pnpm test:run` — ~496-504 tests pasan
2. `pnpm run build` — build exitoso
3. `pnpm typecheck:server` — 0 errores de tipos
4. Manual: `/` → selector → Boggle funciona como antes
5. Manual: `/` → Scrabble → unirse → iniciar → colocar fichas → submit turn → scoring correcto
6. Manual: Scrabble reconexion → cerrar browser → reabrir `/scrabble` → auto-reconecta con estado completo
7. Manual: Layout mobile para ambos juegos

---

## Resumen de progresion de tests

| Step | Descripcion | Tests nuevos | Total acumulado |
|------|-------------|-------------|-----------------|
| 1 | WordGame base class | +18 | ~319 |
| 2 | Reorganizar game/ | +0 | ~319 |
| 3 | Reorganizar socket handlers | +26 | ~345 |
| 4 | Config e interfaces | +5 | ~350 |
| 5 | Servidor multi-juego | +12 | ~362 |
| 6 | Client routing + landing | +0 | ~362 |
| 7 | Scrabble config | +28 | ~390 |
| 8 | ScrabbleGame core | +55 | ~445 |
| 9 | Scrabble socket events | +22 | ~467 |
| 10 | Persistencia + reconexion | +19 | ~486 |
| 11 | Frontend stores/hooks | +10 | ~496 |
| 12 | Frontend componentes | +0-8 | ~496-504 |
| 13 | Componentes compartidos | +0 | ~496-504 |
| 14 | Landing page polish | +0 | ~496-504 |

**Total estimado final: ~500 tests** (desde baseline de 301)
