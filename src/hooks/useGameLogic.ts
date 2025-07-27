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
  };
};
