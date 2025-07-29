/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useBoggleGameMainStore } from '@/components/BoggleGameMain/boogle-game.main.store';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useSocket } from '@/hooks/useSocket';
import { useHighlightManager } from '@/hooks/use-highlight-manager';
import { DiceRoll, GameState, WordResult } from '@/interfaces/game';
import { useGameLogicStore } from '@/stores/game-logic.store';
import { getLastSubmittedRefGlobal } from '@/stores/last-submitted-ref.store';
import { useSocketsStore } from '@/stores/sockets.store';

// listeners must be instatiate only once
export const useSocketListeners = () => {
  const { currentWord, setMessage } = useGameLogicStore();
  const { triggerVibration, playSuccessSound, playErrorSound, playSkipSound } =
    useSocket();

  const { resetSelection, addFoundWord, resetFoundWords } = useGameLogic();
  const { showHighlight } = useHighlightManager();

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
    setCurrentPlayerId,
    setIsJoined,
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
      // Usar el store global síncrono en lugar del estado de Zustand
      const globalLastSubmitted = getLastSubmittedRefGlobal();
      const currentPath = [...globalLastSubmitted.path];
      const currentWordToShow = globalLastSubmitted.word || currentWord;
      
      if (result.valid && result.word) {
        // Palabra válida
        addFoundWord(result.word);
        setMessage(
          `¡Excelente! "${result.word}" vale ${result.points} puntos!`
        );
        
        // Mostrar highlight de éxito
        showHighlight(currentPath, 'success');
        
        // Activar sonido y vibración
        triggerVibration();
        playSuccessSound();
      } else {
        // Palabra inválida - manejar diferentes tipos de error
        console.log(
          "Error path:", currentPath,
          "Word:", currentWordToShow,
          "Reason:", result.reason
        );

        if (result.reason === "Jugador no encontrado") {
          // Sesión perdida
          setMessage("Sesión perdida. Redirigiendo al menú principal...");
          setTimeout(() => {
            setIsJoined(false);
            resetFoundWords();
            resetSelection();
          }, 2000);
        } else if (result.reason === "Palabra ya encontrada") {
          // Palabra repetida - mostrar en naranja
          setMessage(`"${currentWordToShow}" - ${result.reason}`);
          showHighlight(currentPath, 'skip');
          playSkipSound();
          // Resetear selección después de un delay
          setTimeout(() => resetSelection(), 100);
        } else {
          // Otros errores - mostrar en rojo
          setMessage(
            `"${currentWordToShow}" - ${result.reason || "Palabra inválida"}`
          );
          showHighlight(currentPath, 'error');
          playErrorSound();
          // Resetear selección después de un delay
          setTimeout(() => resetSelection(), 100);
        }
      }
    });

    socket.on("player-joined", ({ playerName }) => {
      setMessage(`¡${playerName} se unió al juego!`);
    });

    socket.on("player-left", () => {
      setMessage("Un jugador abandonó el juego.");
    });

    socket.on("player-scored", ({ playerId: _playerId, word: _word, points: _points }) => {
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
