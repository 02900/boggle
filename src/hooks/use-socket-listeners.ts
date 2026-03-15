/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useBoggleGameMainStore } from "@/components/BoggleGameMain/boogle-game-main.store";
import { useGameLogic } from "@/hooks/useGameLogic";
import { useSocket } from "@/hooks/useSocket";
import { useHighlightManager } from "@/hooks/use-highlight-manager";
import { DiceRoll, GameState, WordResult } from "@/interfaces/game";
import { useGameLogicStore } from "@/stores/game-logic.store";
import { getLastSubmittedRefGlobal } from "@/stores/last-submitted-ref.store";
import { useSocketsStore } from "@/stores/sockets.store";
import { useScoreboardStore } from "@/stores/scoreboard.store";
import { useMaxScoreStore } from "@/stores/max-score.store";

// listeners must be instatiate only once
export const useSocketListeners = () => {
  const { setMessage } = useGameLogicStore();
  const { triggerVibration, playSuccessSound, playErrorSound, playSkipSound } =
    useSocket();

  // Referencias para manejar la reconexión automática
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);

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
      // Si estábamos en proceso de reconexión automática y recibimos un estado válido,
      // significa que la reconexión fue exitosa
      if (isReconnectingRef.current) {
        isReconnectingRef.current = false;

        // Limpiar el timeout de respaldo
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Mostrar mensaje de reconexión exitosa
        setMessage("¡Reconexión exitosa! Continuando partida...");

        // Limpiar el mensaje después de un momento
        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
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
          // Sesión perdida - intentar reconectar automáticamente
          setMessage("Sesión perdida. Reconectando automáticamente...");
          isReconnectingRef.current = true;

          // Configurar timeout de respaldo (si no se reconecta en 5 segundos, ir al formulario)
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isReconnectingRef.current) {
              isReconnectingRef.current = false;
              setMessage(
                "No se pudo reconectar. Redirigiendo al menú principal..."
              );
              setTimeout(() => {
                setIsJoined(false);
                resetFoundWords();
                resetSelection();
              }, 2000);
            }
          }, 5000);

          // Intentar reconexión automática con nombre aleatorio
          setTimeout(() => {
            if (newSocket && newSocket.connected && isReconnectingRef.current) {
              newSocket.emit("join-game", ""); // Nombre vacío = servidor asigna nombre aleatorio
            } else if (isReconnectingRef.current) {
              // Si no hay conexión, limpiar el estado de reconexión y ir al formulario
              isReconnectingRef.current = false;
              if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
              }
              setIsJoined(false);
              resetFoundWords();
              resetSelection();
            }
          }, 1000); // Reducir delay para reconexión más rápida
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

    newSocket.on("join-confirmed", ({ playerName }) => {
      // Guardar el nombre asignado (aleatorio o personalizado) en localStorage
      localStorage.setItem("boggle-player-name", playerName);
      console.log("JOIN_CONFIRMED: Nombre guardado en localStorage", { playerName });
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
      // Limpiar timeouts de reconexión al desmontar
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      isReconnectingRef.current = false;

      newSocket.close();
    };
  }, []);
};
