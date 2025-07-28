import { useState, useCallback } from 'react';
import { GameState, WordResult } from '@/interfaces/game';

interface UseGameLogicReturn {
  currentWord: string;
  selectedPath: [number, number][];
  isSelecting: boolean;
  foundWords: string[];
  message: string;
  handleCellMouseDown: (row: number, col: number, board: string[][]) => void;
  handleCellMouseEnter: (row: number, col: number, board: string[][]) => void;
  handleMouseUp: (onSubmitWord: (word: string, path: [number, number][]) => void) => void;
  isCellSelected: (row: number, col: number) => boolean;
  resetSelection: () => void;
  addFoundWord: (word: string) => void;
  setMessage: (message: string) => void;
  resetFoundWords: () => void;
  handleKeyboardInput: (letter: string, board: string[][]) => void;
  handleKeyboardSubmit: (onSubmitWord: (word: string, path: [number, number][]) => void) => void;
  handleKeyboardBackspace: () => void;
}

export const useGameLogic = (): UseGameLogicReturn => {
  const [currentWord, setCurrentWord] = useState('');
  const [selectedPath, setSelectedPath] = useState<[number, number][]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const handleCellMouseDown = useCallback((row: number, col: number, board: string[][]) => {
    setIsSelecting(true);
    setSelectedPath([[row, col]]);
    setCurrentWord(board[row][col]);
  }, []);

  const handleCellMouseEnter = useCallback((row: number, col: number, board: string[][]) => {
    if (!isSelecting) return;
    
    const lastCell = selectedPath[selectedPath.length - 1];
    if (!lastCell) return;
    
    const [lastRow, lastCol] = lastCell;
    const rowDiff = Math.abs(row - lastRow);
    const colDiff = Math.abs(col - lastCol);
    
    // Check if adjacent and not already in path
    if (rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0)) {
      const cellExists = selectedPath.some(([r, c]) => r === row && c === col);
      if (!cellExists) {
        const newPath = [...selectedPath, [row, col] as [number, number]];
        setSelectedPath(newPath);
        setCurrentWord(prev => prev + board[row][col]);
      }
    }
  }, [isSelecting, selectedPath]);

  const handleMouseUp = useCallback((onSubmitWord: (word: string, path: [number, number][]) => void) => {
    if (isSelecting && currentWord.length >= 3) {
      onSubmitWord(currentWord, selectedPath);
    } else if (currentWord.length < 3 && currentWord.length > 0) {
      setMessage('Words must be at least 3 letters long!');
      setCurrentWord('');
      setSelectedPath([]);
    }
    setIsSelecting(false);
  }, [isSelecting, currentWord, selectedPath]);

  const isCellSelected = useCallback((row: number, col: number) => {
    return selectedPath.some(([r, c]) => r === row && c === col);
  }, [selectedPath]);

  const resetSelection = useCallback(() => {
    setCurrentWord('');
    setSelectedPath([]);
    setIsSelecting(false);
  }, []);

  const addFoundWord = useCallback((word: string) => {
    setFoundWords(prev => [...prev, word]);
  }, []);

  const resetFoundWords = useCallback(() => {
    setFoundWords([]);
  }, []);

  // Función auxiliar para contar vecinos disponibles de una posición
  const countAvailableNeighbors = useCallback((row: number, col: number, usedPositions: [number, number][], board: string[][]) => {
    let count = 0;
    for (let r = Math.max(0, row - 1); r <= Math.min(3, row + 1); r++) {
      for (let c = Math.max(0, col - 1); c <= Math.min(3, col + 1); c++) {
        if (r !== row || c !== col) {
          const isUsed = usedPositions.some(([ur, uc]) => ur === r && uc === c);
          if (!isUsed) {
            count++;
          }
        }
      }
    }
    return count;
  }, []);

  // Funciones para manejo de teclado
  const handleKeyboardInput = useCallback((letter: string, board: string[][]) => {
    // Buscar la letra en el tablero
    const availablePositions: [number, number][] = [];
    
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        if (board[row][col] === letter) {
          // Si no hay palabra actual, cualquier posición es válida
          if (selectedPath.length === 0) {
            availablePositions.push([row, col]);
          } else {
            // Si hay palabra actual, solo posiciones adyacentes y no usadas
            const lastCell = selectedPath[selectedPath.length - 1];
            const [lastRow, lastCol] = lastCell;
            const rowDiff = Math.abs(row - lastRow);
            const colDiff = Math.abs(col - lastCol);
            const isAdjacent = rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
            const notUsed = !selectedPath.some(([r, c]) => r === row && c === col);
            
            if (isAdjacent && notUsed) {
              availablePositions.push([row, col]);
            }
          }
        }
      }
    }
    
    if (availablePositions.length > 0) {
      // Elegir la mejor posición basada en el potencial de continuación
      let bestPosition = availablePositions[0];
      let maxScore = -1;
      
      for (const [row, col] of availablePositions) {
        // Calcular puntaje basado en vecinos disponibles
        const neighborCount = countAvailableNeighbors(row, col, selectedPath, board);
        
        // Para la primera letra, priorizar posiciones centrales con más vecinos
        // Para letras siguientes, priorizar posiciones con más opciones de continuación
        let score = neighborCount;
        
        // Bonus para posiciones más centrales (evitar esquinas y bordes cuando sea posible)
        if (row > 0 && row < 3 && col > 0 && col < 3) {
          score += 2; // Posición central
        } else if ((row === 0 || row === 3) && (col === 0 || col === 3)) {
          score -= 1; // Penalizar esquinas
        }
        
        if (score > maxScore) {
          maxScore = score;
          bestPosition = [row, col];
        }
      }
      
      const [row, col] = bestPosition;
      const newPath = [...selectedPath, [row, col] as [number, number]];
      setSelectedPath(newPath);
      setCurrentWord(prev => prev + letter);
      setMessage('');
    } else {
      setMessage(`No se puede agregar '${letter}' - no hay posiciones adyacentes disponibles`);
    }
  }, [selectedPath, countAvailableNeighbors]);

  const handleKeyboardSubmit = useCallback((onSubmitWord: (word: string, path: [number, number][]) => void) => {
    if (currentWord.length >= 3) {
      onSubmitWord(currentWord, selectedPath);
      resetSelection();
    } else if (currentWord.length > 0) {
      setMessage('Las palabras deben tener al menos 3 letras');
    }
  }, [currentWord, selectedPath, resetSelection]);

  const handleKeyboardBackspace = useCallback(() => {
    if (selectedPath.length > 0) {
      const newPath = selectedPath.slice(0, -1);
      const newWord = currentWord.slice(0, -1);
      setSelectedPath(newPath);
      setCurrentWord(newWord);
      setMessage('');
    }
  }, [selectedPath, currentWord]);

  return {
    currentWord,
    selectedPath,
    isSelecting,
    foundWords,
    message,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleMouseUp,
    isCellSelected,
    resetSelection,
    addFoundWord,
    setMessage,
    resetFoundWords,
    handleKeyboardInput,
    handleKeyboardSubmit,
    handleKeyboardBackspace,
  };
};
