/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useGameLogic } from "@/hooks/useGameLogic";
import { GameState, WordResult } from "@/interfaces/game";
import { useViewportStore } from "@/stores/viewport.store";
import { useSocketsStore } from "@/stores/sockets.store";
import { useGameLogicStore } from "@/stores/game-logic.store";
import { useBoggleGameMainStore } from "./boogle-game.main.store";

const HIGHLIGHT_DURATION = 400;

export const useBoggleGameMain = () => {
  const { currentWord, isSelecting, setMessage } = useGameLogicStore();
  const { socket } = useSocketsStore();
  const {
    joinGame,
    startGame,
    submitWord,
    resetGame,
    rotateBoard,
    clearDiceRolling,
    triggerVibration,
    playSuccessSound,
    playErrorSound,
    playSkipSound,
    toggleEliminateCommonWords,
  } = useSocket();
  const {
    handleCellMouseDown,
    handleCellMouseEnter,
    handleMouseUp,
    isCellSelected,
    resetSelection,
    addFoundWord,
    resetFoundWords,
  } = useGameLogic();

  const { setIsMobile } = useViewportStore();

  const {
    gameState,
    setGameState,
    setRotationCooldown,
    setRotationMessage,
    setHighlightedPath,
    setHighlightedErrorPath,
    setHighlightedSkipPath,
    setCurrentPlayerId,
    setIsJoined,
  } = useBoggleGameMainStore();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const lastSubmittedRef = useRef<{ path: [number, number][]; word: string }>({
    path: [],
    word: "",
  });

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Función para calcular el puntaje de una palabra
  const getWordScore = (word: string): number => {
    const length = word.length;
    if (length < 3) return 0;
    if (length <= 4) return 1;
    if (length === 5) return 2;
    if (length === 6) return 3;
    if (length === 7) return 5;
    return 11; // 8+ letras
  };

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
        const currentPath = [...lastSubmittedRef.current.path];
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
        const currentPath = [...lastSubmittedRef.current.path];
        const currentWordToShow = lastSubmittedRef.current.word || currentWord;
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
  }, [
    socket,
    currentWord,
    addFoundWord,
    setMessage,
    resetFoundWords,
    resetSelection,
    triggerVibration,
    playSuccessSound,
    playErrorSound,
  ]);

  const handleJoinGame = (playerName: string) => {
    joinGame(playerName);
    setIsJoined(true);
  };

  const handleCellMouseDownWrapper = (row: number, col: number) => {
    if (gameState.gameState !== "playing") return;
    handleCellMouseDown(row, col, gameState.board);
  };

  const handleCellMouseEnterWrapper = (row: number, col: number) => {
    if (gameState.gameState !== "playing") return;
    handleCellMouseEnter(row, col, gameState.board);
  };

  const handleMouseUpWrapper = () => {
    handleMouseUp((word, path) => {
      // Capturar el camino y palabra antes de enviar
      lastSubmittedRef.current = { path: [...path], word };
      console.log("Submitting word:", word, "with path:", path);
      submitWord(word, path);
    });
  };

  const handleMouseLeave = () => {
    if (isSelecting) {
      resetSelection();
    }
  };

  // Nueva función para manejar palabras completas desde el teclado
  const handleKeyboardWordInput = (word: string) => {
    // Buscar todas las rutas posibles para la palabra en el tablero
    const foundPath = findWordPath(word, gameState.board);

    if (foundPath) {
      // Si se encuentra una ruta válida, resaltarla y enviar la palabra
      setHighlightedPath(foundPath);
      // Capturar el camino y palabra antes de enviar
      lastSubmittedRef.current = { path: [...foundPath], word };
      console.log("Submitting keyboard word:", word, "with path:", foundPath);
      console.log(
        "States set - lastSubmittedPath:",
        [...foundPath],
        "lastSubmittedWord:",
        word
      );
      submitWord(word, foundPath);

      // Limpiar el highlight después de un tiempo
      setTimeout(() => {
        setHighlightedPath([]);
      }, HIGHLIGHT_DURATION);
    } else {
      // Si no se encuentra ruta, mostrar mensaje de error
      setMessage(`"${word}" - No se encontró ruta válida en el tablero`);
      playErrorSound();
    }
  };

  // Función para buscar una ruta válida para una palabra en el tablero
  const findWordPath = (
    word: string,
    board: string[][]
  ): [number, number][] | null => {
    const rows = board.length;
    const cols = board[0].length;
    const wordUpper = word.toUpperCase();

    // Buscar desde cada posición del tablero
    for (let startRow = 0; startRow < rows; startRow++) {
      for (let startCol = 0; startCol < cols; startCol++) {
        const path = searchFromPosition(
          wordUpper,
          board,
          startRow,
          startCol,
          [],
          0
        );
        if (path) {
          return path;
        }
      }
    }

    return null;
  };

  // Función recursiva para buscar la palabra desde una posición específica
  const searchFromPosition = (
    word: string,
    board: string[][],
    row: number,
    col: number,
    currentPath: [number, number][],
    letterIndex: number
  ): [number, number][] | null => {
    // Verificar límites
    if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
      return null;
    }

    // Verificar si la celda ya está en el path actual
    if (currentPath.some(([r, c]) => r === row && c === col)) {
      return null;
    }

    const currentLetter = board[row][col];
    const targetLetter = word[letterIndex];

    // Manejar dígrafos (CH, LL, QU)
    let letterMatch = false;
    let nextLetterIndex = letterIndex + 1;

    // Verificar si la letra actual coincide directamente
    if (currentLetter === targetLetter) {
      letterMatch = true;
    }
    // Verificar dígrafos: QU, CH, LL
    else if (letterIndex < word.length - 1) {
      const digraph = word.substring(letterIndex, letterIndex + 2);

      // Para QU: la celda contiene "QU" y la palabra necesita "QU"
      if (digraph === "QU" && currentLetter === "QU") {
        letterMatch = true;
        nextLetterIndex = letterIndex + 2;
      }
      // Para CH: la celda contiene "CH" y la palabra necesita "CH"
      else if (digraph === "CH" && currentLetter === "CH") {
        letterMatch = true;
        nextLetterIndex = letterIndex + 2;
      }
      // Para LL: la celda contiene "LL" y la palabra necesita "LL"
      else if (digraph === "LL" && currentLetter === "LL") {
        letterMatch = true;
        nextLetterIndex = letterIndex + 2;
      }
    }

    if (!letterMatch) {
      return null;
    }

    const newPath = [...currentPath, [row, col] as [number, number]];

    // Si hemos encontrado toda la palabra
    if (nextLetterIndex >= word.length) {
      return newPath;
    }

    // Buscar en todas las direcciones adyacentes (incluyendo diagonales)
    const directions = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ];

    for (const [dr, dc] of directions) {
      const nextRow = row + dr;
      const nextCol = col + dc;

      const result = searchFromPosition(
        word,
        board,
        nextRow,
        nextCol,
        newPath,
        nextLetterIndex
      );
      if (result) {
        return result;
      }
    }

    return null;
  };

  return {
    handleJoinGame,
    clearDiceRolling,
    getWordScore,
    startGame,
    rotateBoard,
    resetGame,
    handleCellMouseEnterWrapper,
    handleMouseUpWrapper,
    handleMouseLeave,
    isCellSelected,
    handleKeyboardWordInput,
    handleCellMouseDownWrapper,
    toggleEliminateCommonWords,
  };
};
