export interface Player {
  id: string;
  name: string;
  score: number;
  wordsFound: string[];
  eliminatedWords?: string[];
  isConnected?: boolean;
  joinedAt?: number;
  disconnectedAt?: number;
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
  gameState: "waiting" | "playing" | "finished";
  timeLeft: number;
  diceRolls?: DiceRoll[];
  allParticipants?: Player[]; // Incluye todos los participantes (conectados y desconectados)
  playerStreaks?: Record<string, number>; // Total de victorias en las últimas 6 horas por nombre de jugador
  rotationVersion: number; // Versión actual del tablero (incrementa con cada rotación)
}

export interface WordResult {
  valid: boolean;
  reason?: string;
  points?: number;
  word?: string;
}

export interface GameEvents {
  "game-state": (state: GameState) => void;
  "game-started": (state: GameState) => void;
  "dice-rolling": (diceRolls: DiceRoll[]) => void;
  "timer-update": (timeLeft: number) => void;
  "game-ended": (state: GameState) => void;
  "word-result": (result: WordResult) => void;
  "player-joined": (data: { playerName: string; playerId: string }) => void;
  "player-left": (playerId: string) => void;
  "player-scored": (data: {
    playerId: string;
    word: string;
    points: number;
  }) => void;
  "game-reset": (state: GameState) => void;
  "eliminate-common-words-changed": (data: {
    enabled: boolean;
    eliminateCommonWords: boolean;
  }) => void;
  "join-confirmed": (data: { playerName: string; playerId: string }) => void;
}

export interface ClientEvents {
  "join-game": (playerName: string) => void;
  "start-game": () => void;
  "submit-word": (data: {
    word: string;
    path: [number, number][];
    rotationVersion: number;
  }) => void;
  "reset-game": () => void;
  "toggle-eliminate-common-words": (enabled: boolean) => void;
}

export type GameStatus = "waiting" | "playing" | "finished";

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
