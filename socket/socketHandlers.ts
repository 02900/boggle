import { debugLog } from "../utils/debug";
import { loadScoreboard } from "../utils/scoreboard";
import type { BoggleGame } from "../game/boggle/BoggleGame";
import type { TypedServer, TypedSocket } from "../src/interfaces/server";

export function setupSocketHandlers(io: TypedServer, game: BoggleGame): void {
  io.on("connection", (socket: TypedSocket) => {
    debugLog("EVENT: connection", null, socket.id);

    socket.on("join-game", (playerName: string) => {
      debugLog("EVENT: join-game", { playerName }, socket.id);

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

      debugLog("EMIT: join-confirmed", { finalName }, socket.id);
      socket.emit("join-confirmed", {
        playerId: socket.id,
        playerName: finalName,
      });

      debugLog(
        "EMIT: eliminate-common-words-changed (initial sync)",
        {
          eliminateCommonWords: game.eliminateCommonWords,
        },
        socket.id
      );
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

    socket.on("start-game", () => {
      debugLog("EVENT: start-game", null, socket.id);

      const result = game.startGame();
      if (result && result.success) {
        debugLog("EMIT: dice-rolling (game started)", {
          diceCount: result.diceRolls.length,
        });

        io.emit("dice-rolling", result.diceRolls);

        setTimeout(() => {
          io.emit("game-started", game.getGameState());
        }, 3000);
      }
    });

    socket.on("submit-word", ({ word, path, rotationVersion }) => {
      if (typeof rotationVersion !== "number") {
        debugLog(
          "ERROR: submit-word sin rotationVersion",
          { word, rotationVersion },
          socket.id
        );
        socket.emit("word-result", {
          valid: false,
          reason: "Error de sincronización del tablero",
        });
        return;
      }

      debugLog(
        "EVENT: submit-word",
        {
          word,
          pathLength: path?.length,
          clientRotationVersion: rotationVersion,
        },
        socket.id
      );

      if (!word || !path) {
        debugLog(
          "ERROR: submit-word - parámetros faltantes",
          { word: !!word, path: !!path },
          socket.id
        );
        return;
      }

      const result = game.submitWord(socket.id, word, path, rotationVersion);

      if (!game.getClientSideValidation()) {
        debugLog(
          "EMIT: word-result (server validation mode)",
          result,
          socket.id
        );
        socket.emit("word-result", result);
      } else {
        debugLog(
          "SKIP: word-result (client validation mode)",
          result,
          socket.id
        );
      }

      if (result.valid) {
        debugLog("BROADCAST: player-scored", {
          word: result.word,
          points: result.points,
        });
        socket.broadcast.emit("player-scored", {
          playerId: socket.id,
          word: result.word!,
          points: result.points!,
        });

        debugLog("EMIT: game-state (after valid word)");
        io.emit("game-state", game.getGameState());
      }
    });

    socket.on("reset-game", () => {
      debugLog("EVENT: reset-game", null, socket.id);
      game.resetGame();
      io.emit("game-reset", game.getGameState());
    });

    socket.on("rotate-board", () => {
      debugLog("EVENT: rotate-board", null, socket.id);

      const result = game.rotateBoard();
      if (result.success) {
        debugLog("EMIT: board-rotated", {
          cooldownTime: result.cooldownTime,
          newRotationVersion: result.rotationVersion,
        });
        io.emit("board-rotated", {
          board: game.board,
          cooldownTime: result.cooldownTime!,
          rotationVersion: result.rotationVersion!,
        });
      } else {
        debugLog(
          "EMIT: rotation-error",
          { reason: result.reason },
          socket.id
        );
        socket.emit("rotation-error", {
          message: result.reason!,
        });
      }
    });

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

    socket.on("get-max-score", () => {
      debugLog("EVENT: get-max-score", null, socket.id);

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

        socket.emit("max-score-data", {
          words: [],
          maxScore: 0,
          totalWords: 0,
        });
      }
    });

    socket.on("toggle-eliminate-common-words", (enabled: boolean) => {
      debugLog(
        "EVENT: toggle-eliminate-common-words",
        { enabled },
        socket.id
      );

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

    socket.on("toggle-client-side-validation", (enabled: boolean) => {
      debugLog(
        "EVENT: toggle-client-side-validation",
        { enabled },
        socket.id
      );

      game.setClientSideValidation(enabled);

      debugLog("EMIT: client-side-validation-changed", { enabled });

      io.emit("client-side-validation-changed", {
        enabled: enabled,
      });
    });

    socket.on("disconnect", () => {
      debugLog("EVENT: disconnect", null, socket.id);

      game.removePlayer(socket.id);
      socket.broadcast.emit("player-left", socket.id);
    });
  });
}
