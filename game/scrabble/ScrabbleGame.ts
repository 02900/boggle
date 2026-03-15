import {
  SCRABBLE_TURN_TIME_LIMIT,
  SCRABBLE_RACK_SIZE,
  SCRABBLE_BOARD_SIZE,
} from "../../config/scrabbleConstants";
import {
  createEmptyBoard,
  createTileBag,
  calculateWordScore,
  calculateTurnScore,
} from "./scrabbleConfig";
import { updateScoreboard } from "../../utils/scoreboard";
import { debugLog } from "../../utils/debug";
import { WordGame } from "../shared/WordGame";
import type {
  ScrabbleBoardCell,
  ScrabbleTile,
  ScrabbleGameState,
  ScrabblePlayer,
  TilePlacement,
  ScoredWord,
  ScrabbleTurnResult,
  MoveRecord,
  SerializedScrabbleGame,
} from "../../src/interfaces/scrabble";

export class ScrabbleGame extends WordGame {
  board: ScrabbleBoardCell[][];
  tileBag: ScrabbleTile[];
  playerRacks: Map<string, ScrabbleTile[]>;
  playerOrder: string[];
  currentTurnIndex: number;
  turnTimer: ReturnType<typeof setInterval> | null;
  turnTimeLeft: number;
  consecutivePasses: number;
  tentativePlacements: Map<string, TilePlacement[]>;
  isFirstTurn: boolean;
  moveHistory: MoveRecord[];

  constructor() {
    super({ timeLimit: SCRABBLE_TURN_TIME_LIMIT });
    this.board = createEmptyBoard();
    this.tileBag = [];
    this.playerRacks = new Map();
    this.playerOrder = [];
    this.currentTurnIndex = 0;
    this.turnTimer = null;
    this.turnTimeLeft = SCRABBLE_TURN_TIME_LIMIT;
    this.consecutivePasses = 0;
    this.tentativePlacements = new Map();
    this.isFirstTurn = true;
    this.moveHistory = [];
  }

  // ---- Overridden WordGame methods ----

  addPlayer(playerId: string, playerName: string): void {
    super.addPlayer(playerId, playerName);
    this.playerOrder.push(playerId);
    this.playerRacks.set(playerId, []);

    if (this.gameState === "playing") {
      this.drawTiles(playerId, SCRABBLE_RACK_SIZE);
    }

    debugLog("SCRABBLE_PLAYER_ADDED", {
      playerId,
      playerName,
      playerOrder: this.playerOrder,
      rackSize: this.playerRacks.get(playerId)?.length ?? 0,
    });
  }

  removePlayer(playerId: string): void {
    // Return rack tiles to the bag
    const rack = this.playerRacks.get(playerId);
    if (rack) {
      this.tileBag.push(...rack);
    }

    // Remove from turn order
    const orderIndex = this.playerOrder.indexOf(playerId);
    const wasCurrentTurn = orderIndex !== -1 && orderIndex === this.currentTurnIndex;

    if (orderIndex !== -1) {
      this.playerOrder.splice(orderIndex, 1);
      if (orderIndex < this.currentTurnIndex) {
        this.currentTurnIndex--;
      } else if (wasCurrentTurn) {
        if (this.currentTurnIndex >= this.playerOrder.length) {
          this.currentTurnIndex = 0;
        }
      }
    }

    this.playerRacks.delete(playerId);
    this.tentativePlacements.delete(playerId);

    if (wasCurrentTurn && this.gameState === "playing" && this.playerOrder.length > 0) {
      this.advanceTurn();
    }

    super.removePlayer(playerId);

    debugLog("SCRABBLE_PLAYER_REMOVED", {
      playerId,
      remainingPlayers: this.playerOrder.length,
    });
  }

  startGame(): { success: boolean } | false {
    if (this.players.size < 2) {
      debugLog("SCRABBLE_START_FAILED", { reason: "Not enough players", count: this.players.size });
      return false;
    }

    this.clearTimers();
    this.clearTurnTimer();

    // Create fresh board and tile bag
    this.board = createEmptyBoard();
    this.tileBag = createTileBag();
    this.isFirstTurn = true;
    this.consecutivePasses = 0;
    this.moveHistory = [];
    this.tentativePlacements.clear();

    // Draw initial tiles for each player
    for (const playerId of this.playerOrder) {
      this.playerRacks.set(playerId, []);
      this.drawTiles(playerId, SCRABBLE_RACK_SIZE);
    }

    this.gameState = "playing";
    this.currentTurnIndex = 0;

    // Start the first turn
    this.startTurnTimer();

    debugLog("SCRABBLE_GAME_STARTED", {
      playerCount: this.players.size,
      tileBagSize: this.tileBag.length,
      firstPlayer: this.getCurrentTurnPlayerId(),
    });

    return { success: true };
  }

  endGame(): void {
    this.gameState = "finished";
    this.clearTimers();
    this.clearTurnTimer();

    // Final score adjustments: each player loses points for remaining rack tiles
    let goOutPlayerId: string | null = null;
    let otherPlayersRemainingValue = 0;

    // Find if any player went out (empty rack and empty bag)
    for (const [playerId, rack] of this.playerRacks) {
      if (rack.length === 0) {
        goOutPlayerId = playerId;
        break;
      }
    }

    // Deduct remaining tile values from each player's score
    for (const [playerId, rack] of this.playerRacks) {
      const remainingValue = rack.reduce((sum, tile) => sum + tile.value, 0);

      if (playerId !== goOutPlayerId) {
        otherPlayersRemainingValue += remainingValue;

        const player = this.players.get(playerId);
        if (player) {
          player.score -= remainingValue;
          // Don't let score go below 0
          if (player.score < 0) player.score = 0;
        }

        const historyPlayer = this.gameHistory.get(playerId);
        if (historyPlayer) {
          historyPlayer.score = this.players.get(playerId)?.score ?? historyPlayer.score;
        }
      }
    }

    // The player who went out gains the sum of other players' remaining tile values
    if (goOutPlayerId) {
      const goOutPlayer = this.players.get(goOutPlayerId);
      if (goOutPlayer) {
        goOutPlayer.score += otherPlayersRemainingValue;
      }
      const goOutHistory = this.gameHistory.get(goOutPlayerId);
      if (goOutHistory) {
        goOutHistory.score = goOutPlayer?.score ?? goOutHistory.score;
      }
    }

    // Update scoreboard
    const playerScores = Array.from(this.players.values()).map((p) => ({
      name: p.name,
      score: p.score,
    }));
    updateScoreboard(playerScores, this.players.size);

    debugLog("SCRABBLE_GAME_ENDED", {
      playerScores,
      goOutPlayer: goOutPlayerId,
      otherPlayersRemainingValue,
      moveCount: this.moveHistory.length,
    });

    if (this.io) {
      this.io.emit("game-ended" as any, this.getGameState());
    }
  }

  getGameState(): ScrabbleGameState {
    const currentTurnPlayerId = this.getCurrentTurnPlayerId();

    const players: ScrabblePlayer[] = Array.from(this.players.values()).map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      wordsFound: player.wordsFound,
      rackSize: this.playerRacks.get(player.id)?.length ?? 0,
      isCurrentTurn: player.id === currentTurnPlayerId,
    }));

    return {
      board: this.board,
      players,
      gameState: this.gameState,
      currentTurnPlayerId,
      turnTimeLeft: this.turnTimeLeft,
      tileBagCount: this.tileBag.length,
      consecutivePasses: this.consecutivePasses,
    };
  }

  resetGame(): void {
    this.board = createEmptyBoard();
    this.tileBag = [];
    this.playerRacks.clear();
    this.playerOrder = Array.from(this.players.keys());
    this.currentTurnIndex = 0;
    this.clearTurnTimer();
    this.turnTimeLeft = SCRABBLE_TURN_TIME_LIMIT;
    this.consecutivePasses = 0;
    this.tentativePlacements.clear();
    this.isFirstTurn = true;
    this.moveHistory = [];

    super.resetGame();

    debugLog("SCRABBLE_GAME_RESET", {
      playerCount: this.players.size,
    });
  }

  // ---- Tile management ----

  drawTiles(playerId: string, count: number): ScrabbleTile[] {
    const rack = this.playerRacks.get(playerId);
    if (!rack) return [];

    const drawCount = Math.min(count, this.tileBag.length);
    const drawn = this.tileBag.splice(0, drawCount);
    rack.push(...drawn);

    debugLog("SCRABBLE_DRAW_TILES", {
      playerId,
      drawn: drawCount,
      rackSize: rack.length,
      tileBagRemaining: this.tileBag.length,
    });

    return drawn;
  }

  // ---- Tile placement (tentative) ----

  placeTiles(
    playerId: string,
    placements: TilePlacement[]
  ): { success: boolean; reason?: string } {
    if (this.getCurrentTurnPlayerId() !== playerId) {
      return { success: false, reason: "No es tu turno" };
    }

    const rack = this.playerRacks.get(playerId);
    if (!rack) {
      return { success: false, reason: "Jugador no encontrado" };
    }

    // Validate no duplicate tile IDs in placements
    const tileIdSet = new Set(placements.map((p) => p.tile.id));
    if (tileIdSet.size !== placements.length) {
      return { success: false, reason: "Fichas duplicadas en la colocación" };
    }

    // Validate each tile is in the player's rack
    for (const placement of placements) {
      const tileIndex = rack.findIndex((t) => t.id === placement.tile.id);
      if (tileIndex === -1) {
        return { success: false, reason: `Ficha ${placement.tile.id} no está en tu atril` };
      }
    }

    // Collect existing tentative positions
    const existingTentative = this.tentativePlacements.get(playerId) ?? [];
    const tentativePositions = new Set(
      existingTentative.map((p) => `${p.row},${p.col}`)
    );

    // Validate each target cell is empty (no committed tile or tentative tile)
    for (const placement of placements) {
      const { row, col } = placement;
      if (
        row < 0 || row >= SCRABBLE_BOARD_SIZE ||
        col < 0 || col >= SCRABBLE_BOARD_SIZE
      ) {
        return { success: false, reason: `Posición (${row}, ${col}) fuera del tablero` };
      }
      if (this.board[row][col].tile !== null) {
        return { success: false, reason: `Celda (${row}, ${col}) ya está ocupada` };
      }
      const posKey = `${row},${col}`;
      if (tentativePositions.has(posKey)) {
        return { success: false, reason: `Celda (${row}, ${col}) ya tiene una ficha tentativa` };
      }
      tentativePositions.add(posKey);
    }

    // Remove tiles from rack and store as tentative
    for (const placement of placements) {
      const tileIndex = rack.findIndex((t) => t.id === placement.tile.id);
      if (tileIndex !== -1) {
        rack.splice(tileIndex, 1);
      }
    }

    // Merge with any existing tentative placements
    const existing = this.tentativePlacements.get(playerId) ?? [];
    existing.push(...placements);
    this.tentativePlacements.set(playerId, existing);

    debugLog("SCRABBLE_TILES_PLACED", {
      playerId,
      placementCount: placements.length,
      totalTentative: existing.length,
    });

    return { success: true };
  }

  recallTiles(playerId: string): { success: boolean } {
    const placements = this.tentativePlacements.get(playerId);
    if (!placements || placements.length === 0) {
      return { success: true };
    }

    const rack = this.playerRacks.get(playerId);
    if (rack) {
      for (const placement of placements) {
        rack.push(placement.tile);
      }
    }

    this.tentativePlacements.delete(playerId);

    debugLog("SCRABBLE_TILES_RECALLED", {
      playerId,
      recalledCount: placements.length,
    });

    return { success: true };
  }

  // ---- Turn actions ----

  submitTurn(playerId: string): ScrabbleTurnResult {
    if (this.getCurrentTurnPlayerId() !== playerId) {
      return { valid: false, reason: "No es tu turno" };
    }

    const placements = this.tentativePlacements.get(playerId);
    if (!placements || placements.length === 0) {
      return { valid: false, reason: "No has colocado ninguna ficha" };
    }

    // Validate placement rules
    const validation = this.validatePlacement(placements);
    if (!validation.valid) {
      this.recallTiles(playerId);
      return { valid: false, reason: validation.reason };
    }

    // Find all words formed by this placement
    const formedWords = this.findFormedWords(placements);

    // Check all words are in the dictionary
    for (const fw of formedWords) {
      const wordLower = fw.word.toLowerCase();
      if (!this.words.has(wordLower)) {
        this.recallTiles(playerId);
        return { valid: false, reason: `"${fw.word}" no está en el diccionario` };
      }
    }

    if (formedWords.length === 0) {
      this.recallTiles(playerId);
      return { valid: false, reason: "No se formó ninguna palabra válida" };
    }

    // Calculate score for each word
    const scoredWords: ScoredWord[] = formedWords.map((fw) => ({
      word: fw.word,
      score: calculateWordScore(fw.tiles, this.board),
      tiles: fw.tiles,
    }));

    const totalScore = calculateTurnScore(scoredWords, placements.length);

    // Commit tiles to the board
    for (const placement of placements) {
      this.board[placement.row][placement.col].tile = placement.tile;
    }

    // Clear tentative placements
    this.tentativePlacements.delete(playerId);

    // Add score to player
    const player = this.players.get(playerId);
    if (player) {
      player.score += totalScore;
      // Track words found
      for (const sw of scoredWords) {
        player.wordsFound.push(sw.word.toLowerCase());
      }

      const historyPlayer = this.gameHistory.get(playerId);
      if (historyPlayer) {
        historyPlayer.score = player.score;
        historyPlayer.wordsFound = [...player.wordsFound];
      }
    }

    // Draw new tiles to refill rack
    const tilesNeeded = SCRABBLE_RACK_SIZE - (this.playerRacks.get(playerId)?.length ?? 0);
    if (tilesNeeded > 0) {
      this.drawTiles(playerId, tilesNeeded);
    }

    // Record move
    this.moveHistory.push({
      playerName: player?.name ?? "Unknown",
      type: "place",
      tiles: placements,
      words: scoredWords,
      score: totalScore,
    });

    // Reset consecutive passes
    this.consecutivePasses = 0;

    // After first successful placement, it's no longer the first turn
    if (this.isFirstTurn) {
      this.isFirstTurn = false;
    }

    debugLog("SCRABBLE_TURN_SUBMITTED", {
      playerId,
      words: scoredWords.map((w) => `${w.word} (${w.score})`),
      totalScore,
      tilesPlaced: placements.length,
    });

    // Check if game is over
    if (this.isGameOver()) {
      this.endGame();
    } else {
      this.advanceTurn();
    }

    return { valid: true, score: totalScore, words: scoredWords };
  }

  passTurn(playerId: string): { success: boolean; reason?: string } {
    if (this.getCurrentTurnPlayerId() !== playerId) {
      return { success: false, reason: "No es tu turno" };
    }

    // Recall any tentative tiles
    this.recallTiles(playerId);

    this.consecutivePasses++;

    const player = this.players.get(playerId);
    this.moveHistory.push({
      playerName: player?.name ?? "Unknown",
      type: "pass",
      score: 0,
    });

    debugLog("SCRABBLE_TURN_PASSED", {
      playerId,
      consecutivePasses: this.consecutivePasses,
      threshold: this.playerOrder.length,
    });

    // Check if all players have passed consecutively
    if (this.isGameOver()) {
      this.endGame();
    } else {
      this.advanceTurn();
    }

    return { success: true };
  }

  exchangeTiles(
    playerId: string,
    tileIds: string[]
  ): { success: boolean; reason?: string } {
    if (this.getCurrentTurnPlayerId() !== playerId) {
      return { success: false, reason: "No es tu turno" };
    }

    if (this.tileBag.length < tileIds.length) {
      return {
        success: false,
        reason: "No hay suficientes fichas en la bolsa para intercambiar",
      };
    }

    // Recall any tentative tiles first
    this.recallTiles(playerId);

    const rack = this.playerRacks.get(playerId);
    if (!rack) {
      return { success: false, reason: "Jugador no encontrado" };
    }

    // Validate and remove specified tiles from rack
    const removedTiles: ScrabbleTile[] = [];
    for (const tileId of tileIds) {
      const index = rack.findIndex((t) => t.id === tileId);
      if (index === -1) {
        // Put back any already removed tiles
        rack.push(...removedTiles);
        return { success: false, reason: `Ficha ${tileId} no está en tu atril` };
      }
      removedTiles.push(rack.splice(index, 1)[0]);
    }

    // Draw the same number of new tiles
    this.drawTiles(playerId, removedTiles.length);

    // Return removed tiles to bag and shuffle
    this.tileBag.push(...removedTiles);
    this.shuffleTileBag();

    // Exchange does NOT count as a pass for end-game detection (standard rules)
    this.consecutivePasses = 0;

    const player = this.players.get(playerId);
    this.moveHistory.push({
      playerName: player?.name ?? "Unknown",
      type: "exchange",
      score: 0,
    });

    debugLog("SCRABBLE_TILES_EXCHANGED", {
      playerId,
      exchangedCount: removedTiles.length,
    });

    this.advanceTurn();

    return { success: true };
  }

  // ---- Turn management ----

  advanceTurn(): void {
    this.clearTurnTimer();

    if (this.playerOrder.length === 0) return;

    // Move to next player, skipping disconnected ones
    let attempts = 0;
    do {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.playerOrder.length;
      attempts++;
    } while (
      !this.players.has(this.playerOrder[this.currentTurnIndex]) &&
      attempts < this.playerOrder.length
    );

    this.turnTimeLeft = SCRABBLE_TURN_TIME_LIMIT;
    this.startTurnTimer();

    const currentPlayerId = this.getCurrentTurnPlayerId();

    debugLog("SCRABBLE_TURN_ADVANCED", {
      currentPlayerId,
      turnIndex: this.currentTurnIndex,
      turnTimeLeft: this.turnTimeLeft,
    });

  }

  getCurrentTurnPlayerId(): string | null {
    if (this.playerOrder.length === 0) return null;
    return this.playerOrder[this.currentTurnIndex] ?? null;
  }

  clearTimers(): void {
    super.clearTimers();
    this.clearTurnTimer();
  }

  clearTurnTimer(): void {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
  }

  private startTurnTimer(): void {
    this.clearTurnTimer();
    this.turnTimeLeft = SCRABBLE_TURN_TIME_LIMIT;

    this.turnTimer = setInterval(() => {
      this.turnTimeLeft--;

      if (this.turnTimeLeft <= 0) {
        const currentPlayerId = this.getCurrentTurnPlayerId();
        if (currentPlayerId) {
          debugLog("SCRABBLE_TURN_TIMEOUT", { playerId: currentPlayerId });
          this.passTurn(currentPlayerId);
        }
      }
    }, 1000);
  }

  // ---- Validation ----

  validatePlacement(
    placements: TilePlacement[]
  ): { valid: boolean; reason?: string } {
    if (placements.length === 0) {
      return { valid: false, reason: "No se colocaron fichas" };
    }

    // 1. All tiles must be in the same row OR same column
    const rows = new Set(placements.map((p) => p.row));
    const cols = new Set(placements.map((p) => p.col));
    const sameRow = rows.size === 1;
    const sameCol = cols.size === 1;

    if (!sameRow && !sameCol) {
      return { valid: false, reason: "Las fichas deben estar en la misma fila o columna" };
    }

    // 2. Tiles must form a continuous line (existing board tiles can fill gaps)
    if (sameRow) {
      const row = placements[0].row;
      const placedCols = placements.map((p) => p.col).sort((a, b) => a - b);
      const minCol = placedCols[0];
      const maxCol = placedCols[placedCols.length - 1];

      for (let c = minCol; c <= maxCol; c++) {
        const hasPlaced = placedCols.includes(c);
        const hasExisting = this.board[row][c].tile !== null;
        if (!hasPlaced && !hasExisting) {
          return { valid: false, reason: "Las fichas deben formar una línea continua (sin huecos)" };
        }
      }
    } else {
      const col = placements[0].col;
      const placedRows = placements.map((p) => p.row).sort((a, b) => a - b);
      const minRow = placedRows[0];
      const maxRow = placedRows[placedRows.length - 1];

      for (let r = minRow; r <= maxRow; r++) {
        const hasPlaced = placedRows.includes(r);
        const hasExisting = this.board[r][col].tile !== null;
        if (!hasPlaced && !hasExisting) {
          return { valid: false, reason: "Las fichas deben formar una línea continua (sin huecos)" };
        }
      }
    }

    // 3. On first turn: at least one tile must cover center (7, 7)
    if (this.isFirstTurn) {
      const coversCenter = placements.some((p) => p.row === 7 && p.col === 7);
      if (!coversCenter) {
        return { valid: false, reason: "La primera palabra debe cubrir la casilla central" };
      }
    }

    // 4. On subsequent turns: at least one tile must be adjacent to an existing tile
    if (!this.isFirstTurn) {
      const isAdjacentToExisting = placements.some((p) => {
        const directions = [
          [-1, 0], [1, 0], [0, -1], [0, 1],
        ];
        return directions.some(([dr, dc]) => {
          const nr = p.row + dr;
          const nc = p.col + dc;
          if (nr < 0 || nr >= SCRABBLE_BOARD_SIZE || nc < 0 || nc >= SCRABBLE_BOARD_SIZE) {
            return false;
          }
          return this.board[nr][nc].tile !== null;
        });
      });

      if (!isAdjacentToExisting) {
        return { valid: false, reason: "La palabra debe conectar con fichas existentes en el tablero" };
      }
    }

    return { valid: true };
  }

  // ---- Word finding ----

  findFormedWords(
    placements: TilePlacement[]
  ): { word: string; tiles: TilePlacement[] }[] {
    const words: { word: string; tiles: TilePlacement[] }[] = [];

    // Build a combined view: board tiles + tentative placements
    const placementMap = new Map<string, TilePlacement>();
    for (const p of placements) {
      placementMap.set(`${p.row},${p.col}`, p);
    }

    const getTileAt = (row: number, col: number): ScrabbleTile | null => {
      const key = `${row},${col}`;
      const placement = placementMap.get(key);
      if (placement) return placement.tile;
      if (
        row >= 0 && row < SCRABBLE_BOARD_SIZE &&
        col >= 0 && col < SCRABBLE_BOARD_SIZE
      ) {
        return this.board[row][col].tile;
      }
      return null;
    };

    const getEffectiveLetter = (tile: ScrabbleTile): string => {
      if (tile.isBlank && tile.assignedLetter) {
        return tile.assignedLetter;
      }
      return tile.letter;
    };

    // Determine the direction of placement
    const rows = new Set(placements.map((p) => p.row));
    const isHorizontal = rows.size === 1;

    // Collect the main word along the primary direction
    const collectWord = (
      startRow: number,
      startCol: number,
      dRow: number,
      dCol: number
    ): { word: string; tiles: TilePlacement[] } | null => {
      // Walk backwards to find the start of the word
      let r = startRow;
      let c = startCol;
      while (
        r - dRow >= 0 && r - dRow < SCRABBLE_BOARD_SIZE &&
        c - dCol >= 0 && c - dCol < SCRABBLE_BOARD_SIZE &&
        getTileAt(r - dRow, c - dCol) !== null
      ) {
        r -= dRow;
        c -= dCol;
      }

      // Walk forward collecting tiles
      const wordTiles: TilePlacement[] = [];
      let word = "";
      while (
        r >= 0 && r < SCRABBLE_BOARD_SIZE &&
        c >= 0 && c < SCRABBLE_BOARD_SIZE
      ) {
        const tile = getTileAt(r, c);
        if (!tile) break;

        word += getEffectiveLetter(tile);
        wordTiles.push({ tile, row: r, col: c });
        r += dRow;
        c += dCol;
      }

      if (word.length >= 2) {
        return { word, tiles: wordTiles };
      }
      return null;
    };

    // Find the main word (along the primary direction of placement)
    if (isHorizontal) {
      // Main word is horizontal
      const mainWord = collectWord(placements[0].row, placements[0].col, 0, 1);
      if (mainWord) words.push(mainWord);

      // Check cross-words (vertical) for each newly placed tile
      for (const p of placements) {
        const crossWord = collectWord(p.row, p.col, 1, 0);
        if (crossWord) words.push(crossWord);
      }
    } else {
      // Main word is vertical
      const mainWord = collectWord(placements[0].row, placements[0].col, 1, 0);
      if (mainWord) words.push(mainWord);

      // Check cross-words (horizontal) for each newly placed tile
      for (const p of placements) {
        const crossWord = collectWord(p.row, p.col, 0, 1);
        if (crossWord) words.push(crossWord);
      }
    }

    // Deduplicate words (same word at the same position)
    const seen = new Set<string>();
    return words.filter((w) => {
      const key = `${w.tiles[0].row},${w.tiles[0].col}-${w.word}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ---- Game-over detection ----

  isGameOver(): boolean {
    // All active players passed/exchanged consecutively
    if (this.consecutivePasses >= this.playerOrder.length) {
      debugLog("SCRABBLE_GAME_OVER", { reason: "All players passed consecutively" });
      return true;
    }

    // Tile bag is empty and any player has an empty rack
    if (this.tileBag.length === 0) {
      for (const [playerId] of this.playerRacks) {
        const rack = this.playerRacks.get(playerId);
        if (rack && rack.length === 0) {
          debugLog("SCRABBLE_GAME_OVER", {
            reason: "Bag empty and player has no tiles",
            playerId,
          });
          return true;
        }
      }
    }

    return false;
  }

  // ---- Helpers ----

  private shuffleTileBag(): void {
    for (let i = this.tileBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tileBag[i], this.tileBag[j]] = [this.tileBag[j], this.tileBag[i]];
    }
  }

  /**
   * Get a specific player's rack (used by socket handlers to send private rack data).
   */
  getPlayerRack(playerId: string): ScrabbleTile[] {
    return this.playerRacks.get(playerId) ?? [];
  }

  /**
   * Get the full game state including a specific player's rack.
   */
  getGameStateForPlayer(playerId: string): ScrabbleGameState & { rack: ScrabbleTile[] } {
    return {
      ...this.getGameState(),
      rack: this.getPlayerRack(playerId),
    };
  }

  // ---- Serialization ----

  serialize(gameId: string, existingCreatedAt?: string): SerializedScrabbleGame {
    // Recall all tentative placements before serializing to avoid tile loss
    for (const playerId of this.playerOrder) {
      this.recallTiles(playerId);
    }

    const players = this.playerOrder.map((playerId) => {
      const player = this.players.get(playerId) ?? this.gameHistory.get(playerId);
      const rack = this.playerRacks.get(playerId) ?? [];
      return {
        name: player?.name ?? "Unknown",
        score: player?.score ?? 0,
        rack: [...rack],
        wordsFound: [...(player?.wordsFound ?? [])],
      };
    });

    const currentPlayer = this.getCurrentTurnPlayerId();
    const currentPlayerData = currentPlayer
      ? this.players.get(currentPlayer) ?? this.gameHistory.get(currentPlayer)
      : null;

    return {
      gameId,
      createdAt: existingCreatedAt ?? new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      board: this.board.map((row) => row.map((cell) => ({ ...cell, tile: cell.tile ? { ...cell.tile } : null }))),
      tileBag: [...this.tileBag],
      players,
      currentTurnPlayerName: currentPlayerData?.name ?? null,
      turnTimeLeft: this.turnTimeLeft,
      consecutivePasses: this.consecutivePasses,
      gameState: this.gameState,
      moveHistory: [...this.moveHistory],
      isFirstTurn: this.isFirstTurn,
    };
  }

  static deserialize(data: SerializedScrabbleGame): ScrabbleGame {
    const game = new ScrabbleGame();
    game.board = data.board;
    game.tileBag = data.tileBag;
    game.gameState = data.gameState;
    game.turnTimeLeft = data.turnTimeLeft;
    game.consecutivePasses = data.consecutivePasses;
    game.moveHistory = data.moveHistory ?? [];
    game.isFirstTurn = data.isFirstTurn ?? false;

    // Restore players with placeholder socket IDs (will be remapped on rejoin)
    for (const playerData of data.players) {
      const placeholderId = `offline-${playerData.name}`;
      game.players.set(placeholderId, {
        id: placeholderId,
        name: playerData.name,
        score: playerData.score,
        wordsFound: [...playerData.wordsFound],
        eliminatedWords: [],
        isConnected: false,
        joinedAt: Date.now(),
      });
      game.gameHistory.set(placeholderId, {
        id: placeholderId,
        name: playerData.name,
        score: playerData.score,
        wordsFound: [...playerData.wordsFound],
        eliminatedWords: [],
        isConnected: false,
        joinedAt: Date.now(),
      });
      game.playerOrder.push(placeholderId);
      game.playerRacks.set(placeholderId, [...playerData.rack]);
    }

    // Restore current turn by player name
    if (data.currentTurnPlayerName) {
      const turnIndex = game.playerOrder.findIndex((id) => {
        const player = game.players.get(id);
        return player?.name === data.currentTurnPlayerName;
      });
      if (turnIndex !== -1) {
        game.currentTurnIndex = turnIndex;
      }
    }

    debugLog("SCRABBLE_DESERIALIZED", {
      gameId: data.gameId,
      players: data.players.map((p) => p.name),
      gameState: data.gameState,
    });

    return game;
  }

  reconnectPlayer(playerName: string, newSocketId: string): boolean {
    // Find the player by name
    let oldId: string | null = null;
    for (const [id, player] of this.players) {
      if (player.name === playerName) {
        oldId = id;
        break;
      }
    }
    if (!oldId) return false;

    const player = this.players.get(oldId)!;

    // Guard: if the player is already connected, don't remap
    if (player.isConnected && oldId !== newSocketId) {
      debugLog("SCRABBLE_RECONNECT_SKIPPED", {
        playerName,
        reason: "Player already connected",
        existingId: oldId,
      });
      return false;
    }
    const rack = this.playerRacks.get(oldId) ?? [];
    const tentative = this.tentativePlacements.get(oldId) ?? [];

    // Remap to new socket ID
    this.players.delete(oldId);
    player.id = newSocketId;
    player.isConnected = true;
    this.players.set(newSocketId, player);

    this.gameHistory.delete(oldId);
    this.gameHistory.set(newSocketId, { ...player });

    this.playerRacks.delete(oldId);
    this.playerRacks.set(newSocketId, rack);

    this.tentativePlacements.delete(oldId);
    this.tentativePlacements.set(newSocketId, tentative);

    const orderIndex = this.playerOrder.indexOf(oldId);
    if (orderIndex !== -1) {
      this.playerOrder[orderIndex] = newSocketId;
    }

    debugLog("SCRABBLE_PLAYER_RECONNECTED", {
      playerName,
      oldId,
      newSocketId,
      isCurrentTurn: this.getCurrentTurnPlayerId() === newSocketId,
    });

    return true;
  }
}
