/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from "react";
import { io } from "socket.io-client";
import { useBoggleGameMainStore } from "@/components/boggle/BoggleGameMain/boogle-game-main.store";
import { useGameLogic } from "@/hooks/useGameLogic";
import { useSocket } from "@/hooks/useSocket";
import { useHighlightManager } from "@/hooks/use-highlight-manager";
import { DiceRoll, GameState, WordResult } from "@/interfaces/game";
import { useGameLogicStore } from "@/stores/game-logic.store";
import { getLastSubmittedRefGlobal } from "@/stores/last-submitted-ref.store";
import { useSocketsStore } from "@/stores/sockets.store";
import { useScoreboardStore } from "@/stores/scoreboard.store";
import { useMaxScoreStore } from "@/stores/max-score.store";
import { writeRoomCodeToUrl } from "@/utils/room-url";

// listeners must be instatiate only once
export const useSocketListeners = () => {
  const { setMessage } = useGameLogicStore();
  const { triggerVibration, playSuccessSound, playErrorSound, playSkipSound } =
    useSocket();

  // Referencias para manejar la reconexión automática

  const { resetSelection, addFoundWord, resetFoundWords } = useGameLogic();
  const { showHighlight } = useHighlightManager();

  const { setIsConnected, setDiceRolling, setSocket } =
    useSocketsStore();

  const {
    setGameState,
    setRotationCooldown,
    setRotationMessage,
    setCurrentPlayerId,
    setIsJoined,
  } = useBoggleGameMainStore();

  const { setScoreboard, setIsLoading: setScoreboardLoading } =
    useScoreboardStore();

  const {
    setMaxScoreData,
    setIsLoading: setMaxScoreLoading,
    resetMaxScore,
  } = useMaxScoreStore();

  useEffect(() => {
    const newSocket = io({ query: { game: "boggle" } });
    setSocket(newSocket);

    // Connection events
    newSocket.on("connect", () => {
      setIsConnected(true);
      // Store the current player ID when socket connects
      if (newSocket.id) {
        setCurrentPlayerId(newSocket.id);
      }
      // A reconnect is a new socket, back in the lobby: return to the same room.
      // (Boggle has no seat to restore: the player rejoins as new, like before.)
      const { isJoined, roomCode } = useBoggleGameMainStore.getState();
      if (isJoined && roomCode) {
        newSocket.emit("join-room", {
          code: roomCode,
          playerName: localStorage.getItem("boggle-player-name") ?? "",
        });
      }
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });
    // Game events
    newSocket.on("dice-rolling", (diceRolls: DiceRoll[]) => {
      setDiceRolling(diceRolls);
    });

    newSocket.on("eliminate-common-words-changed", ({ enabled, eliminateCommonWords }) => {
      // Actualizar el estado local si es necesario
      console.log("Elimminate common words changed:", { enabled, eliminateCommonWords });
    });

    newSocket.on("client-side-validation-changed", ({ enabled }) => {
      // Actualizar el estado del feature flag en el store
      setGameState((prev) => ({ ...prev, clientSideValidation: enabled }));
      console.log("Client-side validation changed:", { enabled });
    });

    newSocket.on("words-revalidated", ({ totalWordsRemoved, affectedPlayers, summary }) => {
      if (totalWordsRemoved > 0) {
        setMessage(`🔍 Revalidación: ${totalWordsRemoved} palabras removidas de ${affectedPlayers} jugadores`);
        console.log("Words revalidated:", { totalWordsRemoved, affectedPlayers, summary });
      }
    });

    newSocket.on("game-state", (state: GameState) => {
      setGameState(state);
    });

    newSocket.on("game-started", (state: GameState) => {
      setGameState(state);
      setMessage("¡Juego iniciado! Encuentra palabras en el tablero.");
      resetFoundWords();
      resetSelection();
    });

    newSocket.on("timer-update", (timeLeft: number) => {
      setGameState((prev) => ({ ...prev, timeLeft }));
    });

    newSocket.on("game-ended", (state: GameState) => {
      setGameState(state);
      setMessage("¡Juego terminado! Revisa las puntuaciones finales.");
      resetSelection();
    });

    newSocket.on("word-result", (result: WordResult) => {
      // Usar el store global síncrono en lugar del estado de Zustand
      const globalLastSubmitted = getLastSubmittedRefGlobal();
      const currentPath = [...globalLastSubmitted.path];
      const currentWordToShow = globalLastSubmitted.word;

      if (result.valid && result.word) {
        // Palabra válida
        addFoundWord(result.word);
        setMessage(
          `¡Excelente! "${result.word}" vale ${result.points} puntos!`
        );

        // Mostrar highlight de éxito
        showHighlight(currentPath, "success");

        // Activar sonido y vibración
        triggerVibration();
        playSuccessSound();
      } else {
        // Palabra inválida - manejar diferentes tipos de error
        console.log(
          "Error path:",
          currentPath,
          "Word:",
          currentWordToShow,
          "Reason:",
          result.reason
        );

        if (result.reason === "Jugador no encontrado") {
          // The server no longer has this player in the room: back to the room picker
          setMessage("Perdiste tu lugar en la sala. Vuelve a unirte.");
          setTimeout(() => {
            setIsJoined(false);
            useBoggleGameMainStore.getState().setRoomCode(null);
            resetFoundWords();
            resetSelection();
          }, 2000);
        } else if (result.reason === "Palabra ya encontrada") {
          // Palabra repetida - mostrar en naranja
          setMessage(`"${currentWordToShow}" - ${result.reason}`);
          showHighlight(currentPath, "skip");
          playSkipSound();
          // Resetear selección después de un delay
          setTimeout(() => resetSelection(), 100);
        } else {
          // Otros errores - mostrar en rojo
          setMessage(
            `"${currentWordToShow}" - ${result.reason || "Palabra inválida"}`
          );
          showHighlight(currentPath, "error");
          playErrorSound();
          // Resetear selección después de un delay
          setTimeout(() => resetSelection(), 100);
        }
      }
    });

    newSocket.on("join-confirmed", ({ playerName, roomCode }) => {
      // Guardar el nombre asignado (aleatorio o personalizado) en localStorage
      localStorage.setItem("boggle-player-name", playerName);
      const store = useBoggleGameMainStore.getState();
      store.setRoomCode(roomCode);
      store.setJoinError(null);
      setIsJoined(true);
      writeRoomCodeToUrl(roomCode);
    });

    newSocket.on("join-failed", ({ reason }) => {
      const store = useBoggleGameMainStore.getState();
      // Coming back after a reconnect to a room that no longer exists
      if (store.isJoined) {
        setIsJoined(false);
        store.setRoomCode(null);
        resetFoundWords();
        resetSelection();
      }
      store.setJoinError(reason);
    });

    newSocket.on("player-joined", ({ playerName }) => {
      setMessage(`¡${playerName} se unió al juego!`);
    });

    newSocket.on("player-left", () => {
      setMessage("Un jugador abandonó el juego.");
    });

    newSocket.on("player-scored", () => {
      // No mostrar mensaje a otros jugadores para no revelar palabras válidas
      // Solo se actualiza el estado del juego automáticamente
    });

    newSocket.on("game-reset", (state: GameState) => {
      setGameState(state);
      resetFoundWords();
      resetSelection();
      setMessage("¡El juego ha sido reiniciado!");
    });

    newSocket.on(
      "board-rotated",
      ({ board, cooldownTime, rotationVersion }) => {
        setGameState((prev) => ({ ...prev, board, rotationVersion }));
        setMessage("¡Tablero rotado 90°!");
        setRotationCooldown(cooldownTime);

        // Iniciar countdown del cooldown
        let countdown = cooldownTime;
        const cooldownInterval = setInterval(() => {
          countdown--;
          setRotationCooldown(countdown);
          if (countdown <= 0) {
            clearInterval(cooldownInterval);
          }
        }, 1000);
      }
    );

    newSocket.on("rotation-error", ({ message }) => {
      setRotationMessage(message);
      setTimeout(() => setRotationMessage(""), 3000);
    });

    // Scoreboard events
    newSocket.on("scoreboard-data", (data) => {
      setScoreboard(data);
      setScoreboardLoading(false);
    });

    // Max score events
    newSocket.on("max-score-data", (data) => {
      setMaxScoreData(data);
      setMaxScoreLoading(false);
    });

    // Reset max score data when game is reset (already handled above but adding specific reset)
    newSocket.on("game-reset", () => {
      resetMaxScore();
    });

    return () => {
      newSocket.close();
    };
  }, []);
};
