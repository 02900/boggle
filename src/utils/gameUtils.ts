/**
 * Utility functions for the Boggle game
 */

/**
 * Calculate points for a word based on its length
 */
export const calculateWordScore = (word: string): number => {
  const length = word.length;
  if (length <= 4) return 1;
  if (length === 5) return 2;
  if (length === 6) return 3;
  if (length === 7) return 5;
  return 11; // 8+ letters
};

/**
 * Format time in MM:SS format
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Check if two cells are adjacent (including diagonally)
 */
export const areAdjacent = (
  cell1: [number, number], 
  cell2: [number, number]
): boolean => {
  const [row1, col1] = cell1;
  const [row2, col2] = cell2;
  const rowDiff = Math.abs(row1 - row2);
  const colDiff = Math.abs(col1 - col2);
  
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
};

/**
 * Validate if a path is valid on the board
 */
export const isValidPath = (
  path: [number, number][], 
  board: string[][], 
  word: string
): boolean => {
  if (path.length !== word.length) return false;
  
  const used = new Set<string>();
  
  for (let i = 0; i < path.length; i++) {
    const [row, col] = path[i];
    
    // Check bounds
    if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
      return false;
    }
    
    // Check if cell already used
    const cellKey = `${row},${col}`;
    if (used.has(cellKey)) return false;
    used.add(cellKey);
    
    // Check if letter matches
    if (board[row][col].toLowerCase() !== word[i].toLowerCase()) {
      return false;
    }
    
    // Check adjacency (except for first cell)
    if (i > 0 && !areAdjacent(path[i - 1], path[i])) {
      return false;
    }
  }
  
  return true;
};

/**
 * Generate a random player name
 */
export const generateRandomPlayerName = (): string => {
  const adjectives = [
    'Swift', 'Clever', 'Bright', 'Quick', 'Sharp', 'Smart', 'Wise', 'Bold',
    'Fast', 'Keen', 'Alert', 'Agile', 'Witty', 'Savvy', 'Nimble'
  ];
  
  const nouns = [
    'Fox', 'Eagle', 'Tiger', 'Wolf', 'Hawk', 'Lion', 'Bear', 'Owl',
    'Falcon', 'Panther', 'Lynx', 'Raven', 'Phoenix', 'Dragon', 'Sphinx'
  ];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 99) + 1;
  
  return `${adjective}${noun}${number}`;
};

/**
 * Get game status emoji
 */
export const getGameStatusEmoji = (status: string): string => {
  switch (status) {
    case 'waiting':
      return '⏳';
    case 'playing':
      return '🎮';
    case 'finished':
      return '🏁';
    default:
      return '❓';
  }
};

/**
 * Get difficulty level based on board complexity
 */
export const getBoardDifficulty = (board: string[][]): 'Easy' | 'Medium' | 'Hard' => {
  if (board.length === 0) return 'Easy';
  
  // Count vowels vs consonants ratio
  let vowels = 0;
  let total = 0;
  
  for (const row of board) {
    for (const letter of row) {
      total++;
      if ('AEIOU'.includes(letter.toUpperCase())) {
        vowels++;
      }
    }
  }
  
  const vowelRatio = vowels / total;
  
  if (vowelRatio >= 0.3) return 'Easy';
  if (vowelRatio >= 0.2) return 'Medium';
  return 'Hard';
};
