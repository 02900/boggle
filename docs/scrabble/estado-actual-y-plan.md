# Scrabble — Estado actual y plan de mejora

> Auditoría realizada el 2026-09-06 sobre `main` (commit `2131529`).
> Objetivo: pasar de un prototipo funcional a una UI limpia, pulida y esbelta,
> con la lógica de juego completa y estados intermedios bien comunicados.

---

## 1. Resumen ejecutivo

**Lo que funciona:** unirse, iniciar con 2+ jugadores, colocar fichas, confirmar,
pasar, cambiar, comodín, fin de partida por pases, timer por turno, persistencia
de sesión en server. 511 unit tests + 18 e2e en verde.

**Lo que no:**

| Área | Severidad | Problema |
|---|---|---|
| Lógica | Alta | El diccionario filtra a 3+ letras → **ninguna palabra de 2 letras es válida**, y cualquier jugada que forme una palabra cruzada de 2 letras se rechaza. Esto rompe el Scrabble real. |
| Sync | Alta | Tras una jugada inválida el server devuelve las fichas al atril pero **no lo comunica**; el cliente queda desincronizado (ficha fantasma en el tablero, botón "Cambiar" bloqueado). |
| Reconexión | Alta | El `gameId` nunca llega al cliente → la sesión nunca se guarda en `localStorage` → reconexión rota (e2e marcados `fixme`). |
| UI | Alta | Sin jerarquía visual, paleta discordante (verde casino + gris + naranja + rosa/cian), tablero que desborda en móvil, atril de 900px con 7 fichas de 40px, cero animaciones, cero estados de espera. |
| UX | Media | No hay feedback de "esperando a X", ni de error (rojo/toast), ni de puntos ganados por otro jugador, ni aviso de tiempo agotándose. |
| Ruido | Media | El toast "Diccionario cargado" (de Boggle) aparece en Scrabble y tapa el indicador de turno. |

---

## 2. Estado actual — Lógica de juego (server)

Archivos: `game/scrabble/ScrabbleGame.ts` (1059 líneas), `scrabbleConfig.ts`,
`socket/scrabble/scrabbleHandlers.ts`, `game/shared/WordGame.ts`.

### 2.1 Implementado

- Estados: `waiting` → `playing` → `finished` (`ScrabbleGame.ts:111-147`, `:149-216`).
- Turnos por orden de entrada, primer turno siempre al primer jugador (`:135`).
- Timer de 120s por turno; al expirar hace auto-pass (`:642-665`).
- Validación de colocación: misma fila/columna, línea continua, primer turno en el
  centro, adyacencia a fichas existentes (`:669-745`).
- Detección de palabra principal + palabras cruzadas (`:749-856`).
- Puntuación con casillas premium y bingo de 50 pts (`scrabbleConfig.ts:171`).
- Pasar, intercambiar (requiere bolsa ≥ fichas a cambiar), devolver fichas.
- Fin: todos pasaron consecutivamente **una ronda** o bolsa vacía + atril vacío (`:860-882`).
- Ajuste final: se restan fichas restantes (clamp a 0) y se suman al que se quedó sin fichas (`:154-197`).
- Comodín con letra asignada por el cliente (`:773-778`).
- Desconexión con período de gracia de 30s; luego auto-pass y remoción (`scrabbleHandlers.ts:196-236`).
- Serialización/deserialización para rejoin (`gameSessionStore.ts`).

### 2.2 Faltantes y bugs

| # | Problema | Dónde | Detalle |
|---|---|---|---|
| L1 ✅ | **Palabras de 2 letras imposibles** | `game/shared/WordGame.ts:81-87` | El filtro `word.length >= 3` es de Boggle. `findFormedWords` sí detecta palabras de 2 (`:819`), pero `submitTurn` las rechaza contra el diccionario (`:414-420`). En Scrabble las de 2 letras (de, el, la, un, es, si…) son fundamentales; hoy casi cualquier jugada paralela es inválida. |
| L2 ✅ | **Desync tras jugada inválida** | `ScrabbleGame.ts:406,417,423` + `scrabbleHandlers.ts:76-89` | El server hace `recallTiles` en cada rama inválida, pero el handler solo emite `word-result`; nunca emite `game-state`. El cliente no limpia `tentativePlacements`. Reproducido: la ficha queda dibujada en el tablero y desaparece del atril. |
| L3 ✅ | **Reconexión rota** | `socket/shared/sharedHandlers.ts:39`, `use-scrabble-socket-listeners.ts:85` | `join-confirmed` y `game-started` no incluyen `gameId`; el cliente solo guarda sesión si `s.gameId` existe → nunca. |
| L4 ✅ | Fin por pases demasiado agresivo | `ScrabbleGame.ts:862` | Termina con `consecutivePasses >= players.length` (1 ronda). Estándar: 6 pases consecutivos (o 2 rondas). Con 2 jugadores, **dos timeouts seguidos terminan la partida**. |
| L5 ✅ | Timeout cuenta como pase | `:657` | Debería ser un pase "forzado" pero con aviso claro; combinado con L4 es letal. |
| L6 ✅ | Intercambio sin regla de bolsa ≥ 7 | `:541` | Estándar: solo se puede cambiar si la bolsa tiene ≥ 7 fichas. |
| L7 ✅ | Fichas del jugador removido se pierden | `removePlayer` (`:74-109`) | No vuelven a la bolsa. |
| L8 ✅ | Primer jugador no aleatorio | `:135` | Siempre el primero en entrar. |
| L9 ✅ | Comodín sin validación server-side | `:773` | `assignedLetter` se acepta tal cual; debería validarse contra el alfabeto. |
| L10 ✅ | Sin límite de jugadores | `addPlayer` | Estándar 2–4. |
| L11 ✅ | Sin "desafío" ni pista de palabras válidas | — | Aceptable omitirlo (validación automática), pero documentarlo en las reglas. |
| L12 ✅ | Score clamp a 0 al final | `:177` | No estándar; decidir y documentar. |

### 2.3 Eventos socket actuales

**Cliente → Server:** `join-game`, `rejoin-game {playerName, gameId}`, `start-game`,
`place-tiles {placements}`, `recall-tiles`, `submit-turn`, `pass-turn`,
`exchange-tiles {tileIds}`, `reset-game`.

**Server → Cliente:** `join-confirmed {playerName, playerId}`, `player-joined`,
`player-left`, `game-state` (público o con `rack` privado), `game-started`,
`word-result {valid, reason?, points?, word?}` (solo al emisor), `turn-timer-update n`
(cada segundo, a todos), `game-ended`, `game-reset`, `rejoin-success`, `rejoin-failed`.

### 2.4 Estados intermedios que el server NO comunica

- **Quién jugó qué:** cuando un rival confirma, los demás solo reciben un `game-state`
  nuevo; deben inferir la jugada comparando `moveHistory`. Falta un evento
  `turn-played {playerName, words, score, type}` broadcast.
- **Cambio de turno explícito:** no hay `turn-changed {from, to, reason: submit|pass|exchange|timeout|disconnect}`.
- **Jugador desconectado en gracia:** se emite `player-left` y el cliente lo **quita de la lista**;
  a los 30s reaparece o desaparece sin explicación. Falta `player-disconnected {playerName, graceSeconds}` / `player-reconnected`.
- **Rechazo de jugada visible para el resto:** no hace falta, pero sí que el emisor
  reciba el `game-state` corregido (L2).
- **Timer a punto de expirar:** el cliente tiene el número, pero no hay umbral semántico.
- **Motivo del fin de partida:** `game-ended` no dice si fue por pases, por bolsa vacía o por abandono.
- **Confirmación de `start-game` fallido:** si `startGame()` devuelve `false` no se emite nada.

---

## 3. Estado actual — Cliente (UI/UX)

Archivos: `src/components/scrabble/*` (8 componentes, ~700 líneas),
`src/stores/scrabble-game.store.ts`, `src/hooks/use-scrabble-socket*.ts`.

### 3.1 Inventario de pantallas y qué falta en cada una

| Pantalla / estado | Hoy | Falta |
|---|---|---|
| **Join** | Card gris sobre gradiente verde, input, botón "Unirse"/"Conectando...", "Ver reglas". | Indicador de conexión real, error si el nombre está tomado, nombre aleatorio (Boggle lo tiene), acceso al scoreboard, layout centrado con identidad. |
| **Lobby (esperando jugadores)** | Misma vista que el juego: tablero vacío completo + atril vacío gigante con "Sin fichas". Con 1 jugador no hay ningún botón ni mensaje. | Pantalla de lobby dedicada: lista de jugadores con avatares/colores, "Esperando a más jugadores (1/2)", botón "Iniciar" solo para el host, compartir link. **No mostrar el tablero.** |
| **Inicio de partida** | Aparecen fichas de golpe, mensaje "Juego iniciado" en gris. | Animación de reparto, anuncio "Empieza X", transición lobby → mesa. |
| **Mi turno** | Badge verde "Tu turno 1:58" arriba a la derecha; 4 botones de colores distintos. | Realce del atril/tablero, timer con estados (normal / < 30s ámbar / < 10s rojo pulsando), preview de palabra y puntos antes de confirmar. |
| **Turno ajeno** | Badge gris "Turno de Bob". Los botones desaparecen. | Mensaje "Esperando a Bob…" con indicador, atril atenuado, bloqueo visual del tablero. |
| **Colocando ficha** | Ficha `scale-110` con ring amarillo; celda con `hover:brightness`. | Drag & drop, guía de dirección (fila/columna), highlight de celdas válidas, distinción clara ficha tentativa vs confirmada, click en ficha tentativa para devolverla. |
| **Jugada inválida** | Texto gris en un rectángulo gris ("No se formó ninguna palabra válida"). Ficha fantasma queda en tablero (L2). | Toast/banner rojo con icono, shake de las fichas, devolución animada al atril. |
| **Jugada válida** | "+N puntos" en gris; el score cambia de golpe. | Highlight de la palabra formada, contador animado del score, toast "+12 · CASA" visible para todos. |
| **Modo cambio** | Banner naranja + checks naranjas + "Confirmar cambio (N)". | Atenuar el tablero, texto "Perderás el turno", deshabilitar si bolsa < 7. |
| **Comodín** | Modal con grid de 27 letras. | Animación de entrada, focus trap, Escape, indicar en qué casilla va. |
| **Fin de partida** | Bloque gris con "Juego Terminado" y lista con 🏆. | Pantalla de resultados: podio, palabras de cada jugador, mejor jugada, motivo del fin, ajuste de fichas restantes, CTA "Nueva partida" / "Volver al inicio". |
| **Desconexión / reconexión** | Nada en la vista de juego. | Overlay "Reconectando…", banner "Bob se desconectó (30s)", "Bob volvió". |
| **Historial** | Toggle "Historial (N)" con lista plana. | Panel lateral en desktop / drawer en móvil, con palabra, puntos, jugador y tipo (pase/cambio). |

### 3.2 Calidad visual — por qué se ve "mal hecho"

Verificado con screenshots a 1280×900 y 390×844:

1. **Sin sistema de diseño.** Todo son clases Tailwind inline con colores crudos
   (`bg-red-700`, `bg-pink-600`, `bg-cyan-600`, `bg-amber-800`, `bg-gray-800`,
   `from-green-900`). No hay tokens en `globals.css` más allá de `--background`/`--foreground`.
2. **Paleta discordante.** Fondo verde casino saturado + cards gris azulado + atril
   marrón + botones azul/amarillo/gris/naranja/violeta. Cinco familias de color
   compitiendo, ninguna jerarquía.
3. **Tablero.** Casillas premium en rojo/rosa/azul/cian sobre verde: `CENTER` y `DW`
   comparten color (`ScrabbleBoard.tsx:15`), etiquetas `text-white/40` casi ilegibles,
   sin coordenadas, sin borde/marco. En móvil (390px) **desborda horizontalmente**
   y se recortan columnas.
4. **Atril.** Barra marrón de ancho completo (`TileRack.tsx:22`) con 7 fichas de 40px
   centradas: enorme espacio vacío a los lados. Con 0 fichas muestra un rectángulo
   marrón gigante que dice "Sin fichas".
5. **Fichas.** Botones amarillo pálido con borde; sin relieve, sin sombra, valor en
   `text-[8px]`. Ficha tentativa (`amber-200`) casi idéntica a la del atril (`amber-100`).
6. **Tipografía.** `body` fuerza Arial (`globals.css:34`) ignorando la variable de
   Geist; tamaños arbitrarios (`text-[10px]`, `text-[8px]`, `text-xs`, `text-sm`, `text-2xl`).
7. **Botones.** Cada uno de un color distinto sin semántica (primario/secundario/peligro).
   Deshabilitados todos iguales en gris.
8. **Header.** "Scrabble" en `text-lg` arriba a la izquierda y el badge de turno arriba a la
   derecha, tapado por el toast global "Diccionario cargado" (componente de Boggle que
   se renderiza en `/scrabble` sin motivo).
9. **Layout.** Una sola columna vertical: header → jugadores → tablero → atril →
   controles → historial → resultado. En desktop desaprovecha el ancho; en móvil el
   atril y los controles quedan fuera del viewport (hay que scrollear para jugar).

### 3.3 Animaciones

**Existentes:** `transition-colors` en botones, `scale-110` en ficha seleccionada,
`hover:brightness-125` en celdas, `hover:scale-110` en letras del modal. Nada más.

**Faltan (por prioridad):** colocación ficha atril→tablero · devolución tablero→atril ·
feedback inválido (shake + rojo) · cambio de turno (barrido/fade + anuncio) ·
score incremental · timer de urgencia (pulso) · reparto inicial · modal (scale+fade) ·
mensajes con enter/exit · reveal de resultados · reordenar atril (drag).

### 3.4 Arquitectura del cliente

- Store único `scrabble-game.store.ts` mezcla conexión, sesión, estado del server e
  interacción local. Funciona, pero conviene separar `interaction` (selección,
  tentativas, exchange) de `game` (server) y `session`.
- `ScrabbleGameMain/index.tsx` contiene `JoinForm` + `GameView` (166 líneas).
- Sin memoización: `ScrabbleBoard` reconstruye un `Map` y re-renderiza 225 celdas
  en cada cambio del store; `ScrabbleTile` no es `memo`.
- `message: string` es un canal único para todo (éxito, error, info) → no permite
  semántica ni cola de toasts.
- Accesibilidad: ningún `aria-*`, sin `aria-live`, sin focus trap, sin teclado.
- Cadenas en español hardcodeadas (igual que Boggle; aceptable por ahora).
- No reutiliza `src/components/shared/` (`Scoreboard`, `GameSelector`).

### 3.5 Tests

- Unit cliente: solo `scrabble-game.store.test.ts` (no cubre exchange). Cero tests de componentes/hooks.
- Unit server: `ScrabbleGame.test.ts`, `scrabbleConfig.test.ts`, `scrabbleHandlers.test.ts` — buena base.
- E2E: 6 specs / 21 tests; 2 en `fixme` (reconexión). No cubren comodín, jugada
  inválida, timeout, móvil.

---

## 4. Plan de mejora

Ordenado por fases; cada fase deja el juego en estado usable. Los ítems marcan
si son **server (S)**, **cliente (C)** o ambos.

### Fase 0 — Bugs bloqueantes (antes de tocar UI) — ✅ HECHA

1. ✅ **(S) Diccionario con 2+ letras.** `WordGameConfig.minWordLength` (default 3);
   `ScrabbleGame` pasa `SCRABBLE_MIN_WORD_LENGTH = 2`. `file-2017.txt` ya traía 84 palabras
   de 2 letras. Fix L1.
2. ✅ **(S+C) Fuente de verdad única para el atril.** `getGameStateForPlayer` ahora incluye
   `tentativePlacements` (tipo `ScrabblePlayerGameState`); el server lo emite también tras
   `submit-turn`/`place-tiles` fallidos y el cliente sincroniza `rack` + `tentativePlacements`
   desde ahí. Fix L2.
3. ✅ **(S+C) Reconexión.** `game-started` incluye `gameId`. Además se encontró la causa
   real: `JoinForm` emitía `rejoin-game` en su `useEffect`, pero el socket lo crea el padre
   y los efectos de los hijos corren antes → `socket` era `null`. El auto-rejoin se movió al
   handler `connect` del socket (cubre también reconexiones de red). `rejoin-failed` y
   `game-reset` limpian la sesión. Los 2 e2e `fixme` están activos y en verde. Fix L3.
4. ✅ **(C) `DictionaryStatus`** movido del layout raíz a `/boggle`.
5. ✅ **(S) Endgame estándar:** `SCRABBLE_MAX_CONSECUTIVE_PASSES = 6`. Fix L4/L5.
6. ✅ **(infra)** El dev server de e2e usa `NEXT_DIST_DIR=.next-e2e` para no pisar la caché
   de webpack de un `pnpm dev` que el desarrollador tenga corriendo.
7. ✅ **(infra, afecta producción en dev)** El watcher de Next recompilaba cada vez que el
   server escribía `data/scrabble-sessions/*.json`, `data/player-streaks.json` o
   `scoreboard.json` (o sea: al iniciar partida, cada jugada y al terminar). Cada
   recompilación forzaba un full-reload de todas las pestañas → los jugadores volvían al
   formulario y los e2e eran flaky (1/8 en reconexión). `next.config.ts` excluye esos
   paths de `watchOptions.ignored`. Resultado: 8/8 en reconexión, 44/44 en la suite ×2.
8. ✅ **(S)** Rejoin "la conexión más nueva gana": si el `rejoin-game` llega antes que el
   `disconnect` del socket viejo, se expulsa el viejo en vez de rechazar el rejoin. El
   `disconnect` de un socket ya remapeado no emite `player-left`. El cliente, ante
   `player-joined` con nombre existente, actualiza el id en vez de duplicar.

### Fase 1 — Protocolo de estados intermedios (S + C) — ✅ HECHA

Eventos server→cliente nuevos, tipados en `src/interfaces/scrabble.ts`:

```ts
"turn-played":        TurnPlayedEvent   { playerId, playerName, type: "place"|"pass"|"exchange"|"timeout"|"disconnect", words?, score?, exchangedCount? }
"turn-changed":       TurnChangedEvent  { previousPlayerId, currentPlayerId, currentPlayerName, reason }
"player-disconnected":{ playerId, playerName, graceSeconds }   // en vez de player-left durante la partida
"player-reconnected": { playerId, playerName }                 // en vez de player-joined al reconectar
"game-ended":         GameEndedEvent    ScrabbleGameState & { reason: "passes"|"bag-empty"|"abandon", finalAdjustments[] }
"start-failed":       { reason }
```

- `ScrabblePlayer.isConnected` viaja en cada `game-state` (badge atenuado/tachado en gracia).
- `turn-played`/`turn-changed` los emite `ScrabbleGame` (única fuente: cubre timeout,
  desconexión y jugadas). `passTurn(playerId, reason)` distingue pase voluntario de forzado.
- `game-ended` trae `finalAdjustments` por jugador (fichas restantes, valor, delta, score final).
- Cliente: `message: string` reemplazado por `notifications: Notification[]` (`notify(kind, text, ttl?)`,
  máx. 4 visibles, auto-dismiss) renderizadas por `<Toaster/>`; `connectionStatus`
  (`connecting|connected|reconnecting`); `disconnectedPlayers` con deadline de gracia;
  `gameEndSummary`. Copy centralizado en `src/utils/scrabble-messages.ts`.
- `<ConnectionBanner/>`: "Conexión perdida · reconectando…" para el propio socket, y
  "Bob se desconectó · 27s para volver" con cuenta regresiva para los demás.
- Page object e2e usa `data-testid` (`turn-indicator`, `player-badge`, `toast`, `connection-banner`)
  en vez de clases Tailwind. Nuevo spec `scrabble-presence.spec.ts` (toasts de turno,
  desconexión con gracia + vuelta, socket propio reconectando).

### Fase 2 — Sistema de diseño mínimo (C) — ✅ HECHA (dirección: oscuro sobrio)

- **Tokens** en `src/app/globals.css` (`@theme` de Tailwind 4 → utilidades `bg-surface`,
  `text-ink`, `border-edge`, …): `canvas/surface/surface-raised/edge`, `ink/ink-muted/ink-faint`,
  un único acento `accent` (ámbar) para "tu turno" y CTA, semánticos `success/danger/warning/info`,
  tablero `board-frame/cell/tw/dw/tl/dl/center` desaturados, fichas `tile/tile-edge/tile-ink/
  tile-tentative/tile-selected` y atril `rack/rack-edge`, sombras `shadow-tile`/`shadow-tile-lift`.
- `body` usa la fuente Geist (`--font-sans`) en vez de Arial.
- **Componentes base** en `src/components/ui/`: `Button` (primary/secondary/ghost/danger ×
  sm/md/lg, focus ring), `Card`, `Badge` (tones), `Modal` (focus trap, Escape, backdrop,
  devuelve el foco), `Timer` (estados normal/warning/danger con `role="timer"`).
- Scrabble migrado a tokens + base: fichas marfil con relieve y valor legible, tentativas y
  seleccionadas diferenciadas, atril al ancho del contenido con huecos punteados, tablero
  fluido (`aspect-square`, ya no desborda en móvil) con marco y etiquetas `3P/2P/3L/2L/★`
  legibles, botones con jerarquía (Confirmar primario, Devolver secundario, Cambiar/Pasar ghost).
- Fichas del tablero son `<div>` (antes `<button>` anidado en `<button>`, HTML inválido);
  las del atril son `<button aria-pressed>`; celdas con `role=gridcell` y `aria-label`.
- E2E: page object 100 % sobre `data-testid` (`tile-rack`, `board`, `tile[data-letter]`,
  `player-score`) — ya no depende de clases Tailwind.

### Fase 3 — Rediseño de pantallas (C) — ✅ HECHA

`ScrabbleGameMain` es ahora un router: **Join → Lobby (`waiting`) → Mesa (`playing`/`finished`)**.

1. ✅ **Join**: card centrada, input con foco acentuado, reglas en `Modal`.
2. ✅ **Lobby** (`ScrabbleLobby`): sin tablero. Jugadores con color de asiento estable
   (`player-colors.ts`), contador `n/4`, huecos "Esperando jugador…", estado "Falta 1 jugador"
   con pulso, Iniciar solo con ≥ 2.
3. ✅ **Mesa** (`ScrabbleTable`): desktop en dos columnas (tablero + atril + acciones |
   panel `PlayerPanel` con turno, fichas restantes, bolsa, e historial); móvil en una columna
   con jugadores compactos bajo el header y **atril + acciones `sticky` al pie** con
   `safe-area-inset`. El breakpoint se decide con `useMediaQuery` (no CSS `hidden`) para
   no duplicar atril/controles/jugadores en el DOM.
4. ✅ **Acciones**: Confirmar/Devolver/Cambiar/Pasar solo en tu turno; fuera de turno
   "Esperando a Bob…" con indicador. Iniciar y Nueva Partida salieron de la barra
   (viven en lobby y resultados).
5. ✅ **Resultados** (`GameOverModal`): se abre solo al terminar; "¡Ganaste!"/"Ganó X",
   motivo, ranking con medallas, palabras por jugador, ajuste por fichas restantes (+/-),
   mejor jugada, CTA Nueva Partida y "Ver tablero" (reabrible desde el panel).
6. Pendiente para Fase 4/6: puntos estimados en Confirmar, click en tentativa para devolverla,
   botón Mezclar y drag en el atril, coordenadas del tablero.

### Fase 4 — Animaciones (C) — ✅ HECHA

Solo CSS: `@keyframes` + tokens `--animate-*` en `@theme` (`globals.css`) → utilidades
`animate-tile-drop`, `animate-deal`, `animate-shake`, `animate-word-flash`, `animate-pop`,
`animate-slide-down`, `animate-fade-in`, `animate-modal-in`, `animate-glow`. Sin librerías.
`prefers-reduced-motion: reduce` anula duraciones globalmente.

| Momento | Implementación |
|---|---|
| Ficha atril → tablero | `animate-tile-drop` en la ficha tentativa (cae y se asienta, 220ms) |
| Devolver / reparto / fichas nuevas | Fichas del atril keyed por id con `animate-deal` y stagger de 45ms |
| Jugada inválida | `invalidMoveAt` en el store (desde `word-result`): tablero y atril se re-keyean → `animate-shake` + `ring-danger` 420ms |
| Jugada válida | `lastPlayedCells` en el store (desde `turn-played`, para todos): fichas de las palabras formadas con `animate-word-flash` (halo ámbar 1.4s); score del jugador `animate-pop` (keyed por score) |
| Cambio de turno | `TurnIndicator` keyed por jugador → `animate-pop`; atril con `animate-glow` mientras es tu turno |
| Timer < 30s / < 10s | `Timer` ya cambia a warning / danger + pulse (Fase 2) |
| Toast / banners / filas del lobby | `animate-slide-down` al montar |
| Modal | backdrop `animate-fade-in`, panel `animate-modal-in` |

No hecho (bajo valor / complejidad): FLIP real desde la posición del atril, animación de
salida de toasts, stagger del podio.

### Fase 5 — Reglas restantes (S) — ✅ HECHA

- ✅ Intercambio solo con bolsa ≥ 7 (`SCRABBLE_MIN_BAG_FOR_EXCHANGE`); se rechaza selección vacía o duplicada (L6).
- ✅ `removePlayer` devuelve atril **y fichas tentativas** a la bolsa y la mezcla; los comodines vuelven sin letra (L7).
- ✅ Orden de turnos aleatorio (`shufflePlayerOrder`); `turn-changed` con `reason: "start"` (L8).
- ✅ `placeTiles` reconstruye cada ficha desde el atril del server (antes aceptaba letra/valor
  enviados por el cliente); el comodín exige una letra de `VALID_BLANK_LETTERS` (incl. CH/LL/RR/Ñ) (L9).
- ✅ 2–4 jugadores y no se puede entrar con la partida empezada: `ScrabbleGame.canJoin()` +
  hook `canJoin` en `sharedHandlers` → `join-failed {reason}` (L10).
- ✅ Validación automática sin desafío, documentada en `ScrabbleInstructions` (L11).
- ✅ Se permiten puntajes finales negativos (regla oficial) (L12).

Bugs de servidor encontrados al cerrar la fase:

- **Abandono:** si quedan < 2 jugadores durante la partida → `endGame("abandon")` sin ajuste de fichas.
- **Turno saltado:** al quitar al jugador del turno actual con 3+ jugadores se salteaba a su sucesor.
- **Timeout:** el auto-pase del timer no guardaba la sesión ni mandaba el atril privado al jugador
  (sus fichas tentativas quedaban dibujadas). Ahora `ScrabbleGame.onAutoTurnEnd` lo resuelve el handler.
- **Restaurar sesión:** tras reiniciar el server, el rejoin restauraba la partida sin timer → `resumeTurnTimer()`.

Tiempo extra (pedido posterior a la fase):

- El turno ya **no se pasa solo** al llegar a 0: el reloj sigue en negativo y los rivales ven
  "Saltar turno de X" (`skip-turn` → `ScrabbleGame.skipTurn`, pase forzado tipo `timeout`).
- `timeUsed`/`overtime` por jugador, persistidos en la sesión y mostrados en el modal de resultados.
- E2E: el server de pruebas usa `SCRABBLE_TURN_TIME_LIMIT=15`; spec `scrabble-overtime.spec.ts`.

### Fase 6 — Calidad

- Tests de componentes (Vitest + Testing Library) para `Board`, `Rack`, `Controls`, `Toaster`.
- E2E: comodín, jugada inválida + resync, timeout, desconexión/gracia, viewport móvil.
- Memoizar `ScrabbleTile`, `tentativeMap`, `displayRack`; `useShallow` en selectores del store.
- Accesibilidad: `aria-label` en celdas/fichas, `aria-live` en toasts, `role="timer"`,
  navegación por teclado básica.
- Actualizar `docs/backend/socket-handlers.md` y `docs/frontend/components.md` con Scrabble.

---

## 5. Orden sugerido de ejecución

```
Fase 0 (bugs) ──► Fase 1 (protocolo) ──► Fase 2 (design system)
                                              │
                                              ▼
                             Fase 3 (pantallas) ──► Fase 4 (animaciones)
                                              │
                        Fase 5 (reglas) ◄─────┘──► Fase 6 (calidad, continuo)
```

Fases 0 y 1 son prerequisito: rediseñar la UI sobre un protocolo que no comunica
los estados intermedios obligaría a rehacerla. Fase 5 es independiente y puede ir
en paralelo con 3–4.
