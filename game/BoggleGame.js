import fs from "fs";
import path from "path";
import { TIME_LIMIT, ROTATION_COOLDOWN } from "../config/constants.js";
import { RANDOM_NAMES } from "../utils/names.js";
import { getDiceConfiguration, calculateWordPoints } from "./gameConfig.js";
import { updateScoreboard } from "../utils/scoreboard.js";
import { debugLog } from "../utils/debug.js";
import { streakTracker } from "../utils/streakTracker.js";

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
    this.gameHistory = new Map(); // Historial de TODOS los jugadores que participaron en la partida actual
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
        "gato",
        "perro",
        "casa",
        "mesa",
        "silla",
        "agua",
        "fuego",
        "tierra",
        "aire",
        "amor",
        "tiempo",
        "lugar",
        "cosa",
        "persona",
        "animal",
        "planta",
        "comida",
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
    const playerData = {
      id: playerId,
      name: playerName,
      score: 0,
      wordsFound: [],
      eliminatedWords: [], // Inicializar array de palabras eliminadas
      isConnected: true,
      joinedAt: Date.now(),
    };

    this.players.set(playerId, playerData);

    // También agregar al historial de la partida actual
    this.gameHistory.set(playerId, { ...playerData });

    debugLog("PLAYER_ADDED: Jugador agregado al juego y historial", {
      playerId,
      playerName,
      connectedPlayers: this.players.size,
      totalParticipants: this.gameHistory.size,
    });
  }

  /**
   * Remueve un jugador del juego (marca como desconectado pero mantiene historial)
   */
  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      // Actualizar el historial con los datos finales antes de desconectar
      const historyPlayer = this.gameHistory.get(playerId);
      if (historyPlayer) {
        historyPlayer.score = player.score;
        historyPlayer.wordsFound = [...player.wordsFound];
        historyPlayer.eliminatedWords = [...player.eliminatedWords];
        historyPlayer.isConnected = false;
        historyPlayer.disconnectedAt = Date.now();
      }

      debugLog(
        "PLAYER_REMOVED: Jugador desconectado pero mantenido en historial",
        {
          playerId,
          playerName: player.name,
          finalScore: player.score,
          wordsFound: player.wordsFound.length,
          connectedPlayers: this.players.size - 1,
          totalParticipants: this.gameHistory.size,
        }
      );

      // Liberar el nombre para que pueda ser reutilizado
      this.releaseName(player.name);

      // Remover del mapa de jugadores activos, pero mantener en historial
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
      eliminateCommonWords: this.eliminateCommonWords,
    });

    if (this.eliminateCommonWords) {
      this.eliminateCommonWordsFromPlayers();
    } else {
      debugLog("ENDGAME: Eliminación de palabras comunes deshabilitada");
    }

    // Actualizar scoreboard con los puntajes de TODOS los participantes
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

    // Actualizar rachas de victorias ANTES de emitir game-ended - solo si hay más de 1 participante
    if (totalParticipants > 1) {
      // Encontrar el/los ganador(es) (máximo puntaje)
      const maxScore = Math.max(...allParticipantScores.map((p) => p.score));
      const winners = allParticipantScores.filter(
        (p) => p.score === maxScore && p.score > 0
      );

      if (winners.length > 0) {
        debugLog("STREAK_UPDATE: Actualizando rachas de ganadores", {
          winners: winners.map((w) => w.name),
          maxScore,
        });

        // Registrar victoria para cada ganador
        winners.forEach((winner) => {
          const updatedStreak = streakTracker.recordWin(winner.name);
          debugLog("STREAK_UPDATE: Racha actualizada", {
            playerName: winner.name,
            newStreak: updatedStreak.wins,
          });
        });
      }
    }

    // Enviar notificación de fin de juego DESPUÉS de actualizar rachas
    // Incluir TODOS los participantes (conectados y desconectados) en el estado final
    if (this.io) {
      const finalGameState = this.getGameState();
      // Agregar todos los participantes al estado final
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

    // También actualizar el historial
    const historyPlayer = this.gameHistory.get(playerId);
    if (historyPlayer) {
      historyPlayer.wordsFound = [...player.wordsFound];
      historyPlayer.score = player.score;
    }

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
    const gameState = {
      board: this.board,
      players: Array.from(this.players.values()),
      gameState: this.gameState,
      timeLeft: this.timeLeft,
      diceRolls: this.lastDiceRolls || [],
    };

    // Si el juego ha terminado, incluir las rachas de todos los participantes
    if (this.gameState === "finished") {
      const allParticipants = Array.from(this.gameHistory.values());
      const playerNames = allParticipants.map((p) => p.name);
      gameState.playerStreaks = streakTracker.getPlayersStreaks(playerNames);
      
      debugLog("GET_GAME_STATE: Incluyendo rachas en estado final", {
        playerNames,
        playerStreaks: gameState.playerStreaks
      });
    }

    return gameState;
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
      player.isConnected = true; // Resetear estado de conexión
      player.joinedAt = Date.now(); // Actualizar tiempo de unión
    }

    // Limpiar el historial de la partida anterior y reiniciar con jugadores actuales
    this.gameHistory.clear();
    for (const [playerId, player] of this.players) {
      this.gameHistory.set(playerId, { ...player });
    }

    debugLog("GAME_RESET: Juego reiniciado y historial limpiado", {
      connectedPlayers: this.players.size,
      totalParticipants: this.gameHistory.size,
    });

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
    // Usar TODOS los jugadores que participaron (conectados y desconectados)
    const allParticipants = Array.from(this.gameHistory.values());
    if (allParticipants.length < 2) {
      debugLog("ELIMINATE_COMMON_WORDS: Skipping - menos de 2 participantes", {
        participantCount: allParticipants.length,
      });
      return; // No hay suficientes participantes
    }

    debugLog("ELIMINATE_COMMON_WORDS: Iniciando eliminación", {
      participantCount: allParticipants.length,
      connectedPlayers: this.players.size,
      disconnectedPlayers: allParticipants.length - this.players.size,
    });

    // Crear un mapa de palabras y los jugadores que las encontraron
    const wordToPlayers = new Map();

    allParticipants.forEach((player) => {
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
      commonWords: Array.from(commonWords),
    });

    // Eliminar palabras comunes y recalcular puntuaciones para TODOS los participantes
    allParticipants.forEach((historyPlayer) => {
      // Asegurar que el jugador tenga la propiedad eliminatedWords
      if (!historyPlayer.eliminatedWords) {
        historyPlayer.eliminatedWords = [];
      }

      const originalWords = [...historyPlayer.wordsFound];
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
      historyPlayer.wordsFound = validWords;
      historyPlayer.eliminatedWords = eliminatedWords;

      // Recalcular puntuación solo con palabras válidas
      const oldScore = historyPlayer.score;
      historyPlayer.score = validWords.reduce((total, word) => {
        return total + calculateWordPoints(word);
      }, 0);

      // Si el jugador está actualmente conectado, también actualizar su data activa
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
