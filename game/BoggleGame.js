import { TIME_LIMIT, ROTATION_COOLDOWN } from "../config/constants.js";
import { getDiceConfiguration, calculateWordPoints } from "./gameConfig.js";
import { debugLog } from "../utils/debug.js";
import { streakTracker } from "../utils/streakTracker.js";
import { WordGame } from "./WordGame.js";

/**
 * Boggle game — 4x4 grid, path-based word selection, real-time multiplayer.
 */
export class BoggleGame extends WordGame {
  constructor() {
    super({ timeLimit: TIME_LIMIT });

    this.board = [];
    this.lastRotationTime = 0;
    this.rotationCooldown = ROTATION_COOLDOWN;
    this.rotationVersion = 0;
    this.boardHistory = new Map();
    this.maxBoardHistory = 5;
    this.pendingClientWords = new Map();
  }

  // --- Board history (rotation versioning) ---

  saveBoardToHistory() {
    const boardCopy = this.board.map((row) => [...row]);
    this.boardHistory.set(this.rotationVersion, boardCopy);

    if (this.boardHistory.size > this.maxBoardHistory) {
      const oldestVersion = Math.min(...this.boardHistory.keys());
      this.boardHistory.delete(oldestVersion);
    }
  }

  getBoardByVersion(version) {
    if (version === this.rotationVersion) {
      return this.board;
    }
    return this.boardHistory.get(version) || null;
  }

  transformCoordinates(path, fromVersion, toVersion) {
    if (fromVersion === toVersion) return path;

    const rotationDiff = (toVersion - fromVersion) % 4;
    if (rotationDiff === 0) return path;

    return path.map(([row, col]) => {
      let newRow = row;
      let newCol = col;
      for (let i = 0; i < rotationDiff; i++) {
        const temp = newRow;
        newRow = newCol;
        newCol = 3 - temp;
      }
      return [newRow, newCol];
    });
  }

  // --- Board generation ---

  generateBoard() {
    const dice = getDiceConfiguration();
    const diceRolls = [];
    const shuffledDice = [...dice].sort(() => Math.random() - 0.5);

    this.board = [];
    let diceIndex = 0;

    for (let i = 0; i < 4; i++) {
      const row = [];
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

  // --- Game lifecycle ---

  startGame() {
    if (this.players.size < 1) return false;

    this.clearTimers();

    const diceRolls = this.generateBoard();
    this.gameState = "playing";
    this.timeLeft = this.timeLimit;

    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);

    if (this.io) {
      this.updateTimer = setInterval(() => {
        if (this.gameState === "playing") {
          this.io.emit("timer-update", this.timeLeft);
        } else {
          this.clearUpdateTimer();
        }
      }, 1000);
    }

    return { success: true, diceRolls };
  }

  endGame() {
    this.finalizeGame();

    if (this.io) {
      const finalGameState = this.getGameState();
      finalGameState.allParticipants = Array.from(this.gameHistory.values());
      this.io.emit("game-ended", finalGameState);
    }
  }

  resetGame() {
    this.board = [];
    this.gameState = "waiting";
    this.timeLeft = this.timeLimit;
    this.clearTimers();
    this.resetPlayers();
  }

  // --- Word submission ---

  submitWord(playerId, word, path, clientRotationVersion) {
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

  // --- Path validation ---

  isValidPath(path, word, clientRotationVersion) {
    let boardToUse = this.board;
    let pathToUse = path;

    if (clientRotationVersion !== this.rotationVersion) {
      const historicalBoard = this.getBoardByVersion(clientRotationVersion);
      if (historicalBoard) {
        boardToUse = historicalBoard;
      } else {
        pathToUse = this.transformCoordinates(
          path,
          clientRotationVersion,
          this.rotationVersion
        );
      }
    }

    return this.validatePathOnBoard(pathToUse, word, boardToUse);
  }

  validatePathOnBoard(path, word, board) {
    let pathWord = "";
    const used = new Set();

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

  // --- Game state ---

  getGameState() {
    const gameState = {
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
    }

    return gameState;
  }

  // --- Board rotation ---

  rotateBoard() {
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

    const rotatedBoard = [];
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

    return {
      success: true,
      cooldownTime: this.rotationCooldown / 1000,
      rotationVersion: this.rotationVersion,
    };
  }

  // --- Find all possible words (DFS) ---

  findAllPossibleWords() {
    const allWords = [];
    const visited = Array(4)
      .fill()
      .map(() => Array(4).fill(false));

    const dfs = (row, col, currentWord, currentPath) => {
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

    const uniqueWords = new Map();
    allWords.forEach((wordData) => {
      if (
        !uniqueWords.has(wordData.word) ||
        uniqueWords.get(wordData.word).points < wordData.points
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
