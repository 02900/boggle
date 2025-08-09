import { debugLog } from '../utils/debug.js';
import { loadScoreboard } from '../utils/scoreboard.js';

/**
 * Configura todos los manejadores de eventos de Socket.IO
 * @param {Server} io - Instancia del servidor Socket.IO
 * @param {BoggleGame} game - Instancia del juego Boggle
 */
export function setupSocketHandlers(io, game) {
  io.on("connection", (socket) => {
    debugLog("EVENT: connection", null, socket.id);

    // Jugador se une al juego
    socket.on("join-game", (playerName) => {
      debugLog("EVENT: join-game", { playerName }, socket.id);
      
      // Si no se proporciona nombre o está vacío, asignar uno aleatorio
      const finalName =
        playerName && playerName.trim()
          ? playerName.trim()
          : game.getRandomName();

      game.addPlayer(socket.id, finalName);
      
      debugLog(
        "EMIT: game-state (after join)",
        { playerCount: game.players.size, finalName },
        socket.id
      );
      
      socket.emit("game-state", game.getGameState());
      
      // Sincronizar configuración de eliminateCommonWords al cliente
      debugLog("EMIT: eliminate-common-words-changed (initial sync)", { 
        eliminateCommonWords: game.eliminateCommonWords 
      }, socket.id);
      socket.emit("eliminate-common-words-changed", {
        enabled: game.eliminateCommonWords,
        eliminateCommonWords: game.eliminateCommonWords,
      });
      
      debugLog("BROADCAST: player-joined", { finalName }, socket.id);
      socket.broadcast.emit("player-joined", {
        playerId: socket.id,
        playerName: finalName,
      });
    });

    // Iniciar nueva partida
    socket.on("start-game", () => {
      debugLog("EVENT: start-game", null, socket.id);
      
      const result = game.startGame();
      if (result.success) {
        debugLog("EMIT: dice-rolling (game started)", {
          diceCount: result.diceRolls.length,
        });
        
        // Primero enviar la información de los dados para la animación
        io.emit("dice-rolling", result.diceRolls);

        // Después de un breve delay, enviar el estado del juego iniciado
        setTimeout(() => {
          io.emit("game-started", game.getGameState());
        }, 3000); // 3 segundos para la animación de dados
      }
    });

    // Enviar una palabra
    socket.on("submit-word", ({ word, path }) => {
      debugLog(
        "EVENT: submit-word",
        { word, pathLength: path?.length },
        socket.id
      );
      
      const result = game.submitWord(socket.id, word, path);
      
      debugLog(
        "EMIT: word-result",
        {
          valid: result.valid,
          word: result.word,
          points: result.points,
          reason: result.reason,
        },
        socket.id
      );
      
      socket.emit("word-result", result);

      if (result.valid) {
        debugLog(
          "BROADCAST: player-scored",
          { word: result.word, points: result.points },
          socket.id
        );
        socket.broadcast.emit("player-scored", {
          playerId: socket.id,
          word: result.word,
          points: result.points,
        });
        
        debugLog("EMIT: game-state (after valid word)");
        io.emit("game-state", game.getGameState());
      }
    });

    // Reiniciar el juego
    socket.on("reset-game", () => {
      debugLog("EVENT: reset-game", null, socket.id);
      game.resetGame();
      io.emit("game-reset", game.getGameState());
    });

    // Rotar el tablero
    socket.on("rotate-board", () => {
      debugLog("EVENT: rotate-board", null, socket.id);
      
      const result = game.rotateBoard();
      if (result.success) {
        debugLog("EMIT: board-rotated", { cooldownTime: result.cooldownTime });
        // Enviar el tablero rotado a todos los jugadores
        io.emit("board-rotated", {
          board: game.board,
          cooldownTime: result.cooldownTime,
        });
      } else {
        debugLog("EMIT: rotation-error", { reason: result.reason }, socket.id);
        // Enviar mensaje de error solo al jugador que intentó rotar
        socket.emit("rotation-error", {
          message: result.reason,
        });
      }
    });

    // Obtener scoreboard
    socket.on("get-scoreboard", () => {
      debugLog("EVENT: get-scoreboard", null, socket.id);
      
      const scoreboard = loadScoreboard();
      
      debugLog(
        "EMIT: scoreboard-data",
        { count: scoreboard.length },
        socket.id
      );
      
      socket.emit("scoreboard-data", scoreboard);
    });

    // Obtener puntuación máxima posible
    socket.on("get-max-score", () => {
      debugLog("EVENT: get-max-score", null, socket.id);
      
      // Solo calcular si hay un tablero válido
      if (
        game.board &&
        game.board.length === 4 &&
        game.board[0] &&
        game.board[0].length === 4
      ) {
        const maxScoreData = game.findAllPossibleWords();
        
        debugLog(
          "EMIT: max-score-data",
          {
            totalWords: maxScoreData.totalWords,
            maxScore: maxScoreData.maxScore,
          },
          socket.id
        );
        
        socket.emit("max-score-data", maxScoreData);
      } else {
        debugLog(
          "EMIT: max-score-data (empty - no valid board)",
          null,
          socket.id
        );
        
        // Si no hay tablero válido, enviar datos vacíos
        socket.emit("max-score-data", {
          words: [],
          maxScore: 0,
          totalWords: 0,
        });
      }
    });

    // Configurar eliminación de palabras comunes
    socket.on("toggle-eliminate-common-words", (enabled) => {
      debugLog("EVENT: toggle-eliminate-common-words", { enabled }, socket.id);
      
      game.setEliminateCommonWords(enabled);
      
      debugLog("EMIT: eliminate-common-words-changed", {
        enabled,
        eliminateCommonWords: game.eliminateCommonWords,
      });
      
      io.emit("eliminate-common-words-changed", {
        enabled: enabled,
        eliminateCommonWords: game.eliminateCommonWords,
      });
    });

    // Jugador se desconecta
    socket.on("disconnect", () => {
      debugLog("EVENT: disconnect", null, socket.id);
      
      game.removePlayer(socket.id);
      socket.broadcast.emit("player-left", socket.id);
    });
  });
}