import fs from 'fs';
import path from 'path';
import { TIME_LIMIT, ROTATION_COOLDOWN } from '../config/constants.js';
import { RANDOM_NAMES } from '../utils/names.js';
import { getDiceConfiguration, calculateWordPoints } from './gameConfig.js';
import { updateScoreboard } from '../utils/scoreboard.js';
import { debugLog } from '../utils/debug.js';

/**
 * Clase principal que maneja toda la lógica del juego Boggle
 */
export class BoggleGame {
  constructor() {
    this.board = [];
    this.players = new Map();
    this.gameState = "waiting"; // esperando, jugando, terminado
    this.timeLeft = TIME_LIMIT;
    this.timer = null; // Timer interno para decrementar timeLeft
    this.updateTimer = null; // Timer para enviar actualizaciones a los clientes
    this.io = null; // Referencia al socket.io server para enviar actualizaciones
    this.words = new Set(); // Palabras válidas del diccionario
    this.lastRotationTime = 0; // Timestamp de la última rotación
    this.rotationCooldown = ROTATION_COOLDOWN;
    this.availableNames = [...RANDOM_NAMES]; // Copia de nombres disponibles
    this.eliminateCommonWords = true; // Configuración para eliminar palabras comunes
    this.initializeDictionary();
  }

  /**
   * Método para configurar la referencia a socket.io server
   */
  setIO(io) {
    this.io = io;
  }

  /**
   * Limpia todos los timers activos
   */
  clearTimers() {
    this.clearInternalTimer();
    this.clearUpdateTimer();
  }

  clearInternalTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  clearUpdateTimer() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Inicializa el diccionario de palabras válidas desde el archivo
   */
  initializeDictionary() {
    try {
      // Leer el archivo de palabras completo en español
      const dictionaryPath = path.join(process.cwd(), "file-2017.txt");
      const fileContent = fs.readFileSync(dictionaryPath, "utf8");

      // Dividir por líneas y filtrar palabras válidas
      const allWords = fileContent
        .split("\n")
        .map((word) => word.trim().toLowerCase())
        .filter((word) => {
          // Filtrar palabras de 3 o más caracteres para Boggle
          return (
            word.length >= 3 &&
            word.length <= 16 &&
            /^[a-záéíóúñü]+$/.test(word)
          );
        });

      this.words = new Set(allWords);
      console.log(`Diccionario cargado: ${this.words.size} palabras válidas`);
    } catch (error) {
      console.error("Error al cargar el diccionario:", error);
      // Fallback a diccionario básico si hay error
      const basicWords = [
        "gato", "perro", "casa", "mesa", "silla", "agua", "fuego", "tierra",
        "aire", "amor", "tiempo", "lugar", "cosa", "persona", "animal", "planta", "comida",
      ];
      this.words = new Set(basicWords);
    }
  }

  /**
   * Lanza los dados y genera un nuevo tablero 4x4
   */
  generateBoard() {
    const dice = getDiceConfiguration();
    const diceRolls = [];

    // Mezclar los dados para posiciones aleatorias
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

    // Guardar información del lanzamiento para enviar a los clientes
    this.lastDiceRolls = diceRolls;
    return diceRolls;
  }

  /**
   * Obtiene un nombre aleatorio único de la lista disponible
   */
  getRandomName() {
    if (this.availableNames.length === 0) {
      // Si se agotaron los nombres, reiniciar la lista
      this.availableNames = [...RANDOM_NAMES];
    }

    const randomIndex = Math.floor(Math.random() * this.availableNames.length);
    const selectedName = this.availableNames[randomIndex];

    // Remover el nombre de la lista de disponibles
    this.availableNames.splice(randomIndex, 1);

    return selectedName;
  }

  /**
   * Libera un nombre cuando un jugador se desconecta
   */
  releaseName(playerName) {
    if (
      RANDOM_NAMES.includes(playerName) &&
      !this.availableNames.includes(playerName)
    ) {
      this.availableNames.push(playerName);
    }
  }

  /**
   * Añade un jugador al juego
   */
  addPlayer(playerId, playerName) {
    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      score: 0,
      wordsFound: [],
      eliminatedWords: [], // Inicializar array de palabras eliminadas
    });
  }

  /**
   * Remueve un jugador del juego
   */
  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      // Liberar el nombre para que pueda ser reutilizado
      this.releaseName(player.name);
      this.players.delete(playerId);
    }
  }

  /**
   * Inicia una nueva partida
   */
  startGame() {
    if (this.players.size < 1) return false;

    // Limpiar cualquier timer existente antes de iniciar uno nuevo
    this.clearTimers();

    const diceRolls = this.generateBoard();
    this.gameState = "playing";
    this.timeLeft = TIME_LIMIT;

    // Timer interno para decrementar el tiempo
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);

    // Timer para enviar actualizaciones a los clientes
    if (this.io) {
      this.updateTimer = setInterval(() => {
        if (this.gameState === "playing") {
          this.io.emit("timer-update", this.timeLeft);
        } else {
          // Si el juego ya no está en curso, limpiar este timer
          this.clearUpdateTimer();
        }
      }, 1000);
    }

    return { success: true, diceRolls };
  }

  /**
   * Termina la partida actual
   */
  endGame() {
    this.gameState = "finished";
    
    // Limpiar ambos timers usando el método centralizado
    this.clearTimers();

    // Eliminar palabras comunes si la opción está activada
    debugLog("ENDGAME: Verificando eliminación de palabras comunes", { 
      eliminateCommonWords: this.eliminateCommonWords 
    });
    
    if (this.eliminateCommonWords) {
      this.eliminateCommonWordsFromPlayers();
      
      // Enviar estado actualizado después de eliminar palabras comunes
      if (this.io) {
        debugLog("EMIT: game-state (after eliminating common words)", {
          playersCount: this.players.size
        });
        this.io.emit("game-state", this.getGameState());
      }
    } else {
      debugLog("ENDGAME: Eliminación de palabras comunes deshabilitada");
    }
    
    // Enviar notificación de fin de juego DESPUÉS de actualizar el estado
    if (this.io) {
      this.io.emit("game-ended", this.getGameState());
    }

    // Actualizar scoreboard con los puntajes de esta partida
    const playerScores = Array.from(this.players.values()).map((player) => ({
      name: player.name,
      score: player.score,
    }));
    const playerCount = this.players.size;

    updateScoreboard(playerScores, playerCount);
  }

  /**
   * Procesa la submisión de una palabra por un jugador
   */
  submitWord(playerId, word, path) {
    if (this.gameState !== "playing")
      return { valid: false, reason: "Juego no activo" };
    
    const player = this.players.get(playerId);
    if (!player) return { valid: false, reason: "Jugador no encontrado" };

    word = word.toLowerCase();

    // Verificar si la palabra ya fue encontrada por este jugador
    if (player.wordsFound.includes(word)) {
      return { valid: false, reason: "Palabra ya encontrada" };
    }

    // Verificar longitud mínima
    if (word.length < 3) {
      return { valid: false, reason: "Palabra muy corta" };
    }

    // Verificar si la palabra está en el diccionario
    if (!this.words.has(word)) {
      return { valid: false, reason: "Palabra no está en el diccionario" };
    }

    // Validar ruta en el tablero
    if (!this.isValidPath(path, word)) {
      return { valid: false, reason: "Ruta inválida en el tablero" };
    }

    // Agregar palabra y calcular puntuación
    player.wordsFound.push(word);
    const points = calculateWordPoints(word);
    player.score += points;

    return { valid: true, points, word };
  }

  /**
   * Valida que un camino en el tablero forme la palabra especificada
   */
  isValidPath(path, word) {
    // Construir la palabra desde el path para manejar dígrafos
    let pathWord = "";
    const used = new Set();

    for (let i = 0; i < path.length; i++) {
      const [row, col] = path[i];

      // Check bounds
      if (row < 0 || row >= 4 || col < 0 || col >= 4) return false;

      // Check if cell already used
      const cellKey = `${row},${col}`;
      if (used.has(cellKey)) return false;
      used.add(cellKey);

      // Agregar la letra/dígrafo de esta celda a la palabra del path
      const cellLetter = this.board[row][col].toLowerCase();
      pathWord += cellLetter;

      // Check adjacency (except for first cell)
      if (i > 0) {
        const [prevRow, prevCol] = path[i - 1];
        const rowDiff = Math.abs(row - prevRow);
        const colDiff = Math.abs(col - prevCol);

        if (rowDiff > 1 || colDiff > 1 || (rowDiff === 0 && colDiff === 0)) {
          return false;
        }
      }
    }

    // Comparar la palabra construida desde el path con la palabra enviada
    return pathWord === word.toLowerCase();
  }

  /**
   * Obtiene el estado actual del juego
   */
  getGameState() {
    return {
      board: this.board,
      players: Array.from(this.players.values()),
      gameState: this.gameState,
      timeLeft: this.timeLeft,
      diceRolls: this.lastDiceRolls || [],
    };
  }

  /**
   * Reinicia el juego manteniendo los jugadores
   */
  resetGame() {
    this.board = [];
    this.gameState = "waiting";
    this.timeLeft = TIME_LIMIT;
    // Limpiar todos los timers usando el método centralizado
    this.clearTimers();

    // Reset player scores but keep players
    for (const player of this.players.values()) {
      player.score = 0;
      player.wordsFound = [];
      // Asegurar que eliminatedWords existe antes de resetear
      player.eliminatedWords = player.eliminatedWords || [];
      player.eliminatedWords.length = 0; // Reset eliminated words
    }

    // Reset max score data
    this.maxScoreData = null;
  }

  /**
   * Configura si se eliminan palabras comunes al final del juego
   */
  setEliminateCommonWords(enabled) {
    this.eliminateCommonWords = enabled;
  }

  /**
   * Elimina palabras comunes entre jugadores y recalcula puntuaciones
   */
  eliminateCommonWordsFromPlayers() {
    const players = Array.from(this.players.values());
    if (players.length < 2) {
      debugLog("ELIMINATE_COMMON_WORDS: Skipping - menos de 2 jugadores", { playerCount: players.length });
      return; // No hay suficientes jugadores
    }

    debugLog("ELIMINATE_COMMON_WORDS: Iniciando eliminación", { playerCount: players.length });

    // Crear un mapa de palabras y los jugadores que las encontraron
    const wordToPlayers = new Map();

    players.forEach((player) => {
      player.wordsFound.forEach((word) => {
        if (!wordToPlayers.has(word)) {
          wordToPlayers.set(word, []);
        }
        wordToPlayers.get(word).push(player.id);
      });
    });

    // Encontrar palabras comunes (encontradas por 2 o más jugadores)
    const commonWords = new Set();
    wordToPlayers.forEach((playerIds, word) => {
      if (playerIds.length > 1) {
        commonWords.add(word);
      }
    });

    debugLog("ELIMINATE_COMMON_WORDS: Palabras comunes encontradas", { 
      commonWordsCount: commonWords.size,
      commonWords: Array.from(commonWords) 
    });

    // Eliminar palabras comunes y recalcular puntuaciones
    players.forEach((player) => {
      // Asegurar que el jugador tenga la propiedad eliminatedWords (para jugadores existentes)
      if (!player.eliminatedWords) {
        player.eliminatedWords = [];
      }

      const originalWords = [...player.wordsFound];
      const eliminatedWords = [];
      const validWords = [];

      originalWords.forEach((word) => {
        if (commonWords.has(word)) {
          eliminatedWords.push(word);
        } else {
          validWords.push(word);
        }
      });

      // Actualizar palabras encontradas y agregar información de eliminadas
      player.wordsFound = validWords;
      player.eliminatedWords = eliminatedWords;

      // Recalcular puntuación solo con palabras válidas
      const oldScore = player.score;
      player.score = validWords.reduce((total, word) => {
        return total + calculateWordPoints(word);
      }, 0);

      debugLog("ELIMINATE_COMMON_WORDS: Jugador procesado", {
        playerName: player.name,
        originalWords: originalWords.length,
        validWords: validWords.length,
        eliminatedWords: eliminatedWords.length,
        oldScore,
        newScore: player.score
      });
    });

    debugLog("ELIMINATE_COMMON_WORDS: Proceso completado");
  }

  /**
   * Rota el tablero 90 grados en sentido horario
   */
  rotateBoard() {
    const now = Date.now();

    // Verificar cooldown
    if (now - this.lastRotationTime < this.rotationCooldown) {
      const remainingTime = Math.ceil(
        (this.rotationCooldown - (now - this.lastRotationTime)) / 1000
      );
      return {
        success: false,
        reason: `Debes esperar ${remainingTime} segundos antes de rotar nuevamente`,
      };
    }

    // Solo permitir rotación durante el juego
    if (this.gameState !== "playing") {
      return {
        success: false,
        reason: "Solo se puede rotar el tablero durante el juego",
      };
    }

    // Crear nuevo tablero rotado 90 grados en sentido horario
    const rotatedBoard = [];
    for (let i = 0; i < 4; i++) {
      rotatedBoard[i] = [];
      for (let j = 0; j < 4; j++) {
        // Para rotar 90° horario: nuevo[i][j] = original[4-1-j][i]
        rotatedBoard[i][j] = this.board[4 - 1 - j][i];
      }
    }

    this.board = rotatedBoard;
    this.lastRotationTime = now;

    return { success: true, cooldownTime: this.rotationCooldown / 1000 };
  }

  /**
   * Encuentra todas las palabras posibles en el tablero actual
   */
  findAllPossibleWords() {
    const allWords = [];
    const visited = Array(4)
      .fill()
      .map(() => Array(4).fill(false));

    // Función recursiva para explorar todos los caminos posibles
    const dfs = (row, col, currentWord, currentPath) => {
      // Marcar celda como visitada
      visited[row][col] = true;

      // Agregar letra actual a la palabra
      const cellLetter = this.board[row][col].toLowerCase();
      currentWord += cellLetter;
      currentPath.push([row, col]);

      // Si la palabra tiene 3+ letras y está en el diccionario, agregarla
      if (currentWord.length >= 3 && this.words.has(currentWord)) {
        allWords.push({
          word: currentWord,
          path: [...currentPath],
          points: calculateWordPoints(currentWord),
        });
      }

      // Explorar celdas adyacentes
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue; // Skip current cell

          const newRow = row + dr;
          const newCol = col + dc;

          // Verificar límites y que no esté visitada
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

      // Desmarcar celda (backtrack)
      visited[row][col] = false;
      currentPath.pop();
    };

    // Iniciar búsqueda desde cada celda del tablero
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        dfs(row, col, "", []);
      }
    }

    // Remover duplicados (misma palabra puede encontrarse por diferentes caminos)
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