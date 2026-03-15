import { TIME_LIMIT, ROTATION_COOLDOWN } from "../../config/constants";
import { getDiceConfiguration, calculateWordPoints } from "./boggleConfig";
import { updateScoreboard } from "../../utils/scoreboard";
import { debugLog } from "../../utils/debug";
import { streakTracker } from "../../utils/streakTracker";
import { WordGame } from "../shared/WordGame";
import type { DiceRoll, GameState, WordResult } from "../../src/interfaces/game";
import type {
  Board,
  StartGameResult,
  RotateBoardResult,
  MaxScoreData,
} from "../../src/interfaces/server";

export class BoggleGame extends WordGame {
  board: Board;
  lastRotationTime: number;
  rotationCooldown: number;
  eliminateCommonWords: boolean;
  rotationVersion: number;
  boardHistory: Map<number, Board>;
  maxBoardHistory: number;
  lastDiceRolls?: DiceRoll[];

  constructor() {
    super({ timeLimit: TIME_LIMIT });
    this.board = [];
    this.lastRotationTime = 0;
    this.rotationCooldown = ROTATION_COOLDOWN;
    this.eliminateCommonWords = true;
    this.rotationVersion = 0;
    this.boardHistory = new Map();
    this.maxBoardHistory = 5;
  }

  saveBoardToHistory(): void {
    const boardCopy: Board = this.board.map((row) => [...row]);
    this.boardHistory.set(this.rotationVersion, boardCopy);

    if (this.boardHistory.size > this.maxBoardHistory) {
      const oldestVersion = Math.min(...this.boardHistory.keys());
      this.boardHistory.delete(oldestVersion);
    }

    debugLog("BOARD_HISTORY: Tablero guardado", {
      version: this.rotationVersion,
      historySize: this.boardHistory.size,
      availableVersions: Array.from(this.boardHistory.keys()),
    });
  }

  getBoardByVersion(version: number): Board | null {
    if (version === this.rotationVersion) {
      return this.board;
    }
    return this.boardHistory.get(version) || null;
  }

  transformCoordinates(
    path: [number, number][],
    fromVersion: number,
    toVersion: number
  ): [number, number][] {
    if (fromVersion === toVersion) {
      return path;
    }

    const rotationDiff = ((toVersion - fromVersion) % 4 + 4) % 4;
    if (rotationDiff === 0) {
      return path;
    }

    return path.map(([row, col]) => {
      let newRow = row;
      let newCol = col;

      for (let i = 0; i < rotationDiff; i++) {
        const temp = newRow;
        newRow = newCol;
        newCol = 3 - temp;
      }

      return [newRow, newCol] as [number, number];
    });
  }

  generateBoard(): DiceRoll[] {
    const dice = getDiceConfiguration();
    const diceRolls: DiceRoll[] = [];

    const shuffledDice = [...dice].sort(() => Math.random() - 0.5);

    this.board = [];
    let diceIndex = 0;

    for (let i = 0; i < 4; i++) {
      const row: string[] = [];
      for (let j = 0; j < 4; j++) {
        const currentDie = shuffledDice[diceIndex];
        const rolledFace = Math.floor(Math.random() * 6);
        const letter = currentDie[rolledFace];

        row.push(letter);
        diceRolls.push({
          diceNumber: diceIndex + 1,
          position: { row: i, col: j },
          faces: currentDie,
          rolledFace: rolledFace,
          letter: letter,
        });

        diceIndex++;
      }
      this.board.push(row);
    }

    this.lastDiceRolls = diceRolls;
    this.rotationVersion = 0;
    this.boardHistory.clear();
    this.saveBoardToHistory();

    return diceRolls;
  }

  startGame(): StartGameResult | false {
    if (this.players.size < 1) return false;

    this.clearTimers();

    const diceRolls = this.generateBoard();
    this.gameState = "playing";
    this.timeLeft = this.config.timeLimit;

    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);

    if (this.io) {
      this.updateTimer = setInterval(() => {
        if (this.gameState === "playing") {
          this.io!.emit("timer-update", this.timeLeft);
        } else {
          this.clearUpdateTimer();
        }
      }, 1000);
    }

    return { success: true, diceRolls };
  }

  endGame(): void {
    this.gameState = "finished";
    this.clearTimers();

    if (this.clientSideValidation) {
      this.revalidateClientWords();
    }

    debugLog("ENDGAME: Verificando eliminación de palabras comunes", {
      eliminateCommonWords: this.eliminateCommonWords,
    });

    if (this.eliminateCommonWords) {
      this.eliminateCommonWordsFromPlayers();
    } else {
      debugLog("ENDGAME: Eliminación de palabras comunes deshabilitada");
    }

    const allParticipantScores = Array.from(this.gameHistory.values()).map(
      (player) => ({
        name: player.name,
        score: player.score,
        isConnected: player.isConnected,
      })
    );
    const totalParticipants = this.gameHistory.size;

    debugLog("SCOREBOARD_UPDATE: Actualizando con todos los participantes", {
      totalParticipants,
      connectedPlayers: this.players.size,
      disconnectedPlayers: totalParticipants - this.players.size,
    });

    updateScoreboard(allParticipantScores, totalParticipants);

    if (totalParticipants > 1) {
      const maxScore = Math.max(...allParticipantScores.map((p) => p.score));
      const winners = allParticipantScores.filter(
        (p) => p.score === maxScore && p.score > 0
      );

      if (winners.length > 0) {
        debugLog("STREAK_UPDATE: Actualizando rachas de ganadores", {
          winners: winners.map((w) => w.name),
          maxScore,
        });

        winners.forEach((winner) => {
          const updatedStreak = streakTracker.recordWin(winner.name);
          debugLog("STREAK_UPDATE: Racha actualizada", {
            playerName: winner.name,
            newStreak: updatedStreak.wins,
          });
        });
      }
    }

    if (this.io) {
      const finalGameState = this.getGameState();
      finalGameState.allParticipants = Array.from(this.gameHistory.values());

      debugLog("EMIT: game-ended (con rachas actualizadas)", {
        connectedPlayers: finalGameState.players.length,
        totalParticipants: finalGameState.allParticipants.length,
        disconnectedPlayers:
          finalGameState.allParticipants.length - finalGameState.players.length,
        playerStreaks: finalGameState.playerStreaks,
      });

      this.io.emit("game-ended", finalGameState);
    }
  }

  submitWord(
    playerId: string,
    word: string,
    path: [number, number][],
    clientRotationVersion: number
  ): WordResult {
    if (this.gameState !== "playing")
      return { valid: false, reason: "Juego no activo" };

    const player = this.players.get(playerId);
    if (!player) return { valid: false, reason: "Jugador no encontrado" };

    word = word.toLowerCase();

    if (player.wordsFound.includes(word)) {
      return { valid: false, reason: "Palabra ya encontrada" };
    }

    if (word.length < 3) {
      return { valid: false, reason: "Palabra muy corta" };
    }

    if (!this.words.has(word)) {
      return { valid: false, reason: "Palabra no está en el diccionario" };
    }

    if (!this.isValidPath(path, word, clientRotationVersion)) {
      return { valid: false, reason: "Ruta inválida en el tablero" };
    }

    player.wordsFound.push(word);
    const points = calculateWordPoints(word);
    player.score += points;

    const historyPlayer = this.gameHistory.get(playerId);
    if (historyPlayer) {
      historyPlayer.wordsFound = [...player.wordsFound];
      historyPlayer.score = player.score;
    }

    return { valid: true, points, word };
  }

  isValidPath(
    path: [number, number][],
    word: string,
    clientRotationVersion: number
  ): boolean {
    let boardToUse = this.board;
    let pathToUse = path;

    if (clientRotationVersion !== this.rotationVersion) {
      debugLog("PATH_VALIDATION: Detectada diferencia de versión de rotación", {
        clientVersion: clientRotationVersion,
        serverVersion: this.rotationVersion,
        word,
        originalPath: path,
      });

      const historicalBoard = this.getBoardByVersion(clientRotationVersion);
      if (historicalBoard) {
        boardToUse = historicalBoard;
        debugLog("PATH_VALIDATION: Usando tablero histórico", {
          version: clientRotationVersion,
        });
      } else {
        pathToUse = this.transformCoordinates(
          path,
          clientRotationVersion,
          this.rotationVersion
        );
        debugLog("PATH_VALIDATION: Transformando coordenadas", {
          originalPath: path,
          transformedPath: pathToUse,
          fromVersion: clientRotationVersion,
          toVersion: this.rotationVersion,
        });
      }
    }

    return this.validatePathOnBoard(pathToUse, word, boardToUse);
  }

  validatePathOnBoard(
    path: [number, number][],
    word: string,
    board: Board
  ): boolean {
    let pathWord = "";
    const used = new Set<string>();

    for (let i = 0; i < path.length; i++) {
      const [row, col] = path[i];

      if (row < 0 || row >= 4 || col < 0 || col >= 4) return false;

      const cellKey = `${row},${col}`;
      if (used.has(cellKey)) return false;
      used.add(cellKey);

      const cellLetter = board[row][col].toLowerCase();
      pathWord += cellLetter;

      if (i > 0) {
        const [prevRow, prevCol] = path[i - 1];
        const rowDiff = Math.abs(row - prevRow);
        const colDiff = Math.abs(col - prevCol);

        if (rowDiff > 1 || colDiff > 1 || (rowDiff === 0 && colDiff === 0)) {
          return false;
        }
      }
    }

    return pathWord === word.toLowerCase();
  }

  getGameState(): GameState {
    const gameState: GameState = {
      board: this.board,
      players: Array.from(this.players.values()),
      gameState: this.gameState,
      timeLeft: this.timeLeft,
      diceRolls: this.lastDiceRolls || [],
      rotationVersion: this.rotationVersion,
      clientSideValidation: this.clientSideValidation,
    };

    if (this.gameState === "finished") {
      const allParticipants = Array.from(this.gameHistory.values());
      const playerNames = allParticipants.map((p) => p.name);
      gameState.playerStreaks = streakTracker.getPlayersStreaks(playerNames);

      debugLog("GET_GAME_STATE: Incluyendo rachas en estado final", {
        playerNames,
        playerStreaks: gameState.playerStreaks,
      });
    }

    return gameState;
  }

  resetGame(): void {
    this.board = [];
    this.rotationVersion = 0;
    this.boardHistory.clear();
    this.lastRotationTime = 0;
    super.resetGame();
  }

  setEliminateCommonWords(enabled: boolean): void {
    this.eliminateCommonWords = enabled;
    debugLog("ELIMINATE_COMMON_WORDS: Configuración actualizada", {
      enabled: this.eliminateCommonWords,
    });
  }

  revalidateClientWords(): void {
    debugLog("REVALIDATION: Iniciando revalidación de palabras del cliente");

    let totalWordsRevalidated = 0;
    let totalWordsRemoved = 0;
    const revalidationResults: Record<string, unknown> = {};

    for (const [playerId, player] of this.gameHistory) {
      const originalWordsCount = player.wordsFound.length;
      const validWords: string[] = [];
      const invalidWords: Array<{ word: string; reason: string }> = [];

      debugLog("REVALIDATION: Revalidando jugador", {
        playerId,
        playerName: player.name,
        originalWordsCount,
      });

      for (const word of player.wordsFound) {
        if (word.length < 3) {
          invalidWords.push({ word, reason: "Palabra muy corta" });
          continue;
        }

        if (!this.words.has(word.toLowerCase())) {
          invalidWords.push({ word, reason: "No está en el diccionario" });
          continue;
        }

        validWords.push(word);
        totalWordsRevalidated++;
      }

      player.wordsFound = validWords;

      const oldScore = player.score;
      player.score = validWords.reduce((total, w) => {
        return total + calculateWordPoints(w);
      }, 0);

      const wordsRemoved = originalWordsCount - validWords.length;
      totalWordsRemoved += wordsRemoved;

      revalidationResults[playerId] = {
        playerName: player.name,
        originalWords: originalWordsCount,
        validWords: validWords.length,
        invalidWords: invalidWords.length,
        wordsRemoved,
        oldScore,
        newScore: player.score,
        scoreChange: player.score - oldScore,
        removedWords: invalidWords,
      };

      const connectedPlayer = this.players.get(playerId);
      if (connectedPlayer) {
        connectedPlayer.wordsFound = [...validWords];
        connectedPlayer.score = player.score;
      }

      debugLog(
        "REVALIDATION: Jugador revalidado",
        revalidationResults[playerId]
      );
    }

    debugLog("REVALIDATION: Revalidación completada", {
      totalWordsRevalidated,
      totalWordsRemoved,
      playersProcessed: Object.keys(revalidationResults).length,
      revalidationResults,
    });

    if (totalWordsRemoved > 0 && this.io) {
      this.io.emit("words-revalidated", {
        totalWordsRemoved,
        affectedPlayers: Object.keys(revalidationResults).length,
        summary:
          "Algunas palabras fueron removidas tras la revalidación del servidor",
      });
    }
  }

  eliminateCommonWordsFromPlayers(): void {
    const allParticipants = Array.from(this.gameHistory.values());
    if (allParticipants.length < 2) {
      debugLog("ELIMINATE_COMMON_WORDS: Skipping - menos de 2 participantes", {
        participantCount: allParticipants.length,
      });
      return;
    }

    debugLog("ELIMINATE_COMMON_WORDS: Iniciando eliminación", {
      participantCount: allParticipants.length,
      connectedPlayers: this.players.size,
      disconnectedPlayers: allParticipants.length - this.players.size,
    });

    const wordToPlayers = new Map<string, string[]>();

    allParticipants.forEach((player) => {
      player.wordsFound.forEach((word) => {
        if (!wordToPlayers.has(word)) {
          wordToPlayers.set(word, []);
        }
        wordToPlayers.get(word)!.push(player.id);
      });
    });

    const commonWords = new Set<string>();
    wordToPlayers.forEach((playerIds, word) => {
      if (playerIds.length > 1) {
        commonWords.add(word);
      }
    });

    debugLog("ELIMINATE_COMMON_WORDS: Palabras comunes encontradas", {
      commonWordsCount: commonWords.size,
      commonWords: Array.from(commonWords),
    });

    allParticipants.forEach((historyPlayer) => {
      if (!historyPlayer.eliminatedWords) {
        historyPlayer.eliminatedWords = [];
      }

      const originalWords = [...historyPlayer.wordsFound];
      const eliminatedWords: string[] = [];
      const validWords: string[] = [];

      originalWords.forEach((word) => {
        if (commonWords.has(word)) {
          eliminatedWords.push(word);
        } else {
          validWords.push(word);
        }
      });

      historyPlayer.wordsFound = validWords;
      historyPlayer.eliminatedWords = eliminatedWords;

      const oldScore = historyPlayer.score;
      historyPlayer.score = validWords.reduce((total, word) => {
        return total + calculateWordPoints(word);
      }, 0);

      const activePlayer = this.players.get(historyPlayer.id);
      if (activePlayer) {
        activePlayer.wordsFound = validWords;
        activePlayer.eliminatedWords = eliminatedWords;
        activePlayer.score = historyPlayer.score;
      }

      debugLog("ELIMINATE_COMMON_WORDS: Participante procesado", {
        playerName: historyPlayer.name,
        isConnected: historyPlayer.isConnected,
        originalWords: originalWords.length,
        validWords: validWords.length,
        eliminatedWords: eliminatedWords.length,
        oldScore,
        newScore: historyPlayer.score,
      });
    });

    debugLog("ELIMINATE_COMMON_WORDS: Proceso completado");
  }

  rotateBoard(): RotateBoardResult {
    const now = Date.now();

    if (now - this.lastRotationTime < this.rotationCooldown) {
      const remainingTime = Math.ceil(
        (this.rotationCooldown - (now - this.lastRotationTime)) / 1000
      );
      return {
        success: false,
        reason: `Debes esperar ${remainingTime} segundos antes de rotar nuevamente`,
      };
    }

    if (this.gameState !== "playing") {
      return {
        success: false,
        reason: "Solo se puede rotar el tablero durante el juego",
      };
    }

    const rotatedBoard: Board = [];
    for (let i = 0; i < 4; i++) {
      rotatedBoard[i] = [];
      for (let j = 0; j < 4; j++) {
        rotatedBoard[i][j] = this.board[4 - 1 - j][i];
      }
    }

    this.saveBoardToHistory();
    this.board = rotatedBoard;
    this.lastRotationTime = now;
    this.rotationVersion++;

    debugLog("BOARD_ROTATED: Nueva versión de tablero", {
      newVersion: this.rotationVersion,
      availableVersions: Array.from(this.boardHistory.keys()),
    });

    return {
      success: true,
      cooldownTime: this.rotationCooldown / 1000,
      rotationVersion: this.rotationVersion,
    };
  }

  findAllPossibleWords(): MaxScoreData {
    const allWords: Array<{
      word: string;
      path: [number, number][];
      points: number;
    }> = [];
    const visited = Array(4)
      .fill(null)
      .map(() => Array(4).fill(false) as boolean[]);

    const dfs = (
      row: number,
      col: number,
      currentWord: string,
      currentPath: [number, number][]
    ): void => {
      visited[row][col] = true;

      const cellLetter = this.board[row][col].toLowerCase();
      currentWord += cellLetter;
      currentPath.push([row, col]);

      if (currentWord.length >= 3 && this.words.has(currentWord)) {
        allWords.push({
          word: currentWord,
          path: [...currentPath],
          points: calculateWordPoints(currentWord),
        });
      }

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;

          const newRow = row + dr;
          const newCol = col + dc;

          if (
            newRow >= 0 &&
            newRow < 4 &&
            newCol >= 0 &&
            newCol < 4 &&
            !visited[newRow][newCol]
          ) {
            dfs(newRow, newCol, currentWord, currentPath);
          }
        }
      }

      visited[row][col] = false;
      currentPath.pop();
    };

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        dfs(row, col, "", []);
      }
    }

    const uniqueWords = new Map<
      string,
      { word: string; path: [number, number][]; points: number }
    >();
    allWords.forEach((wordData) => {
      if (
        !uniqueWords.has(wordData.word) ||
        uniqueWords.get(wordData.word)!.points < wordData.points
      ) {
        uniqueWords.set(wordData.word, wordData);
      }
    });

    const finalWords = Array.from(uniqueWords.values());
    const maxScore = finalWords.reduce(
      (total, wordData) => total + wordData.points,
      0
    );

    return {
      words: finalWords.sort(
        (a, b) => b.points - a.points || a.word.localeCompare(b.word)
      ),
      maxScore,
      totalWords: finalWords.length,
    };
  }
}
