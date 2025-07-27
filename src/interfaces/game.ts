export interface Player {
  id: string;
  name: string;
  score: number;
  wordsFound: string[];
}

export interface DiceRoll {
  diceNumber: number;
  position: { row: number; col: number };
  faces: string[];
  rolledFace: number;
  letter: string;
}

export interface GameState {
  board: string[][];
  players: Player[];
  gameState: 'waiting' | 'playing' | 'finished';
  timeLeft: number;
  diceRolls?: DiceRoll[];
}

export interface WordResult {
  valid: boolean;
  reason?: string;
  points?: number;
  word?: string;
}

export interface GameEvents {
  'game-state': (state: GameState) => void;
  'game-started': (state: GameState) => void;
  'dice-rolling': (diceRolls: DiceRoll[]) => void;
  'timer-update': (timeLeft: number) => void;
  'game-ended': (state: GameState) => void;
  'word-result': (result: WordResult) => void;
  'player-joined': (data: { playerName: string; playerId: string }) => void;
  'player-left': (playerId: string) => void;
  'player-scored': (data: { playerId: string; word: string; points: number }) => void;
  'game-reset': (state: GameState) => void;
}

export interface ClientEvents {
  'join-game': (playerName: string) => void;
  'start-game': () => void;
  'submit-word': (data: { word: string; path: [number, number][] }) => void;
  'reset-game': () => void;
}

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface BoardCell {
  letter: string;
  row: number;
  col: number;
  isSelected: boolean;
}

export interface WordPath {
  cells: [number, number][];
  word: string;
}
