"use client";

import { useSocket } from "@/hooks/useSocket";
import { useGameLogic } from "@/hooks/useGameLogic";
import { useGameLogicStore } from "@/stores/game-logic.store";
import { setLastSubmittedRefGlobal } from "@/stores/last-submitted-ref.store";
import { useBoggleGameMainStore } from "./boogle-game.main.store";

export const useBoggleGameMain = () => {
  const { isSelecting, setMessage } = useGameLogicStore();
  const {
    joinGame,
    startGame,
    submitWord,
    resetGame,
    rotateBoard,
    clearDiceRolling,
    playErrorSound,
    toggleEliminateCommonWords,
  } = useSocket();

  const {
    handleCellMouseDown,
    handleCellMouseEnter,
    handleMouseUp,
    isCellSelected,
    resetSelection,
  } = useGameLogic();

  const { gameState, setIsJoined } = useBoggleGameMainStore();

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

  // Función unificada para submit que usan tanto mouse como keyboard
  const handleUnifiedSubmit = (word: string, path: [number, number][]) => {
    // Actualizar AMBOS: store global (síncrono) y estado Zustand (asíncrono)
    const submittedData = { path: [...path], word };
    setLastSubmittedRefGlobal(submittedData); // ✅ Actualización síncrona global
    submitWord(word, path);
  };

  const handleMouseUpWrapper = () => {
    handleMouseUp(handleUnifiedSubmit);
  };

  const handleMouseLeave = () => {
    if (isSelecting) {
      resetSelection();
    }
  };

  // Función para manejar palabras desde el teclado
  // Usa exactamente la misma lógica de submit que drag/touch
  const handleKeyboardWordInput = (word: string) => {
    // Buscar todas las rutas posibles para la palabra en el tablero
    const foundPath = findWordPath(word, gameState.board);

    if (foundPath) {
      // Usar directamente la función unificada - mismo comportamiento que mouse/touch
      handleUnifiedSubmit(word, foundPath);
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
