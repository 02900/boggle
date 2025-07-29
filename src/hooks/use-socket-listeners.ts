/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useBoggleGameMainStore } from '@/components/BoggleGameMain/boogle-game.main.store';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useSocket } from '@/hooks/useSocket';
import { DiceRoll, GameState, WordResult } from '@/interfaces/game';
import { useGameLogicStore } from '@/stores/game-logic.store';
import { useSocketsStore } from '@/stores/sockets.store';

const HIGHLIGHT_DURATION = 400;

// listeners must be instatiate only once
export const useSocketListeners = () => {
  const { currentWord, setMessage } = useGameLogicStore();
  const { triggerVibration, playSuccessSound, playErrorSound, playSkipSound } =
    useSocket();

  const { resetSelection, addFoundWord, resetFoundWords } = useGameLogic();

  const {
    socket,
    setIsConnected,
    setDiceRolling,
    setEliminateCommonWords,
    setSocket,
  } = useSocketsStore();

  const {
    setGameState,
    setRotationCooldown,
    setRotationMessage,
    setHighlightedPath,
    setHighlightedErrorPath,
    setHighlightedSkipPath,
    setCurrentPlayerId,
    setIsJoined,
    lastSubmittedRef,
  } = useBoggleGameMainStore();

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("connect", () => {
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("dice-rolling", (diceRolls: DiceRoll[]) => {
      setDiceRolling(diceRolls);
    });

    newSocket.on(
      "eliminate-common-words-changed",
      (data: { enabled: boolean; eliminateCommonWords: boolean }) => {
        setEliminateCommonWords(data.eliminateCommonWords);
      }
    );

    // El evento word-result se maneja en BoggleGameMain.tsx
    // para evitar duplicación de listeners
    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Store the current player ID when socket connects
    if (socket.id) {
      setCurrentPlayerId(socket.id);
    }

    socket.on("game-state", (state: GameState) => {
      setGameState(state);
    });

    socket.on("game-started", (state: GameState) => {
      setGameState(state);
      setMessage("¡Juego iniciado! Encuentra palabras en el tablero.");
      resetFoundWords();
      resetSelection();
    });

    socket.on("timer-update", (timeLeft: number) => {
      setGameState((prev) => ({ ...prev, timeLeft }));
    });

    socket.on("game-ended", (state: GameState) => {
      setGameState(state);
      setMessage("¡Juego terminado! Revisa las puntuaciones finales.");
      resetSelection();
    });

    socket.on("word-result", (result: WordResult) => {
      console.log("word-result recibido en BoggleGameMain:", result);
      if (result.valid && result.word) {
        addFoundWord(result.word);
        setMessage(
          `¡Excelente! "${result.word}" vale ${result.points} puntos!`
        );

        // Mostrar el camino en verde por 2 segundos para palabras válidas
        const currentPath = [...lastSubmittedRef.path];
        if (currentPath.length > 0) {
          console.log("Setting success path:", currentPath);
          setHighlightedPath(currentPath);
          setTimeout(() => {
            setHighlightedPath([]);
          }, HIGHLIGHT_DURATION);
        }

        // Activar sonido y vibración para palabras válidas
        console.log("Activando sonido y vibración para palabra válida");
        triggerVibration();
        playSuccessSound();
      } else {
        // Usar el último camino enviado para mostrarlo en color según el tipo de error
        const currentPath = [...lastSubmittedRef.path];
        const currentWordToShow = lastSubmittedRef.word || currentWord;
        console.log(
          "Error path captured:",
          currentPath,
          "Current word:",
          currentWordToShow,
          "Reason:",
          result.reason
        );

        // Si el jugador no fue encontrado, redirigir al menú principal
        if (result.reason === "Jugador no encontrado") {
          setMessage("Sesión perdida. Redirigiendo al menú principal...");
          setTimeout(() => {
            setIsJoined(false);
            resetFoundWords();
            resetSelection();
          }, 2000);
        } else if (result.reason === "Palabra ya encontrada") {
          // Caso especial: palabra válida pero ya encontrada - mostrar en naranja
          setMessage(`"${currentWordToShow}" - ${result.reason}`);
          if (currentPath.length > 0) {
            console.log("Setting skip path (orange):", currentPath);
            setHighlightedSkipPath(currentPath);
            // Resetear la selección después de un pequeño delay
            setTimeout(() => {
              resetSelection();
            }, 100);
            // Limpiar el resaltado naranja después de 2 segundos
            setTimeout(() => {
              setHighlightedSkipPath([]);
            }, HIGHLIGHT_DURATION);
          } else {
            resetSelection();
          }
          // Activar sonido de skip para palabras repetidas
          console.log("Activando sonido de skip para palabra repetida");
          playSkipSound();
        } else {
          // Otros errores - mostrar en rojo
          setMessage(
            `"${currentWordToShow}" - ${result.reason || "Palabra inválida"}`
          );
          if (currentPath.length > 0) {
            console.log("Setting error path (red):", currentPath);
            setHighlightedErrorPath(currentPath);
            // Resetear la selección después de un pequeño delay
            setTimeout(() => {
              resetSelection();
            }, 100);
            // Limpiar el resaltado de error después de 2 segundos
            setTimeout(() => {
              setHighlightedErrorPath([]);
            }, HIGHLIGHT_DURATION);
          } else {
            resetSelection();
          }
          // Activar sonido de error para palabras inválidas
          console.log("Activando sonido de error para palabra inválida");
          playErrorSound();
        }
      }
    });

    socket.on("player-joined", ({ playerName }) => {
      setMessage(`¡${playerName} se unió al juego!`);
    });

    socket.on("player-left", () => {
      setMessage("Un jugador abandonó el juego.");
    });

    socket.on("player-scored", ({ playerId, word, points }) => {
      // No mostrar mensaje a otros jugadores para no revelar palabras válidas
      // Solo se actualiza el estado del juego automáticamente
    });

    socket.on("game-reset", (state: GameState) => {
      setGameState(state);
      resetFoundWords();
      resetSelection();
      setMessage("¡El juego ha sido reiniciado!");
    });

    socket.on("board-rotated", ({ board, cooldownTime }) => {
      setGameState((prev) => ({ ...prev, board }));
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
    });

    socket.on("rotation-error", ({ message }) => {
      setRotationMessage(message);
      setTimeout(() => setRotationMessage(""), 3000);
    });

    return () => {
      socket.off("game-state");
      socket.off("game-started");
      socket.off("timer-update");
      socket.off("game-ended");
      socket.off("word-result");
      socket.off("player-joined");
      socket.off("player-left");
      socket.off("player-scored");
      socket.off("game-reset");
      socket.off("board-rotated");
      socket.off("rotation-error");
    };
  }, [socket, currentWord]);
};
