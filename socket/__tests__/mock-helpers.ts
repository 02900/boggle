import { vi } from "vitest";

export function createMockSocket(id: string, gameType = "boggle") {
  const handlers = new Map<string, Function>();
  return {
    id,
    handshake: { query: { game: gameType } },
    on: vi.fn((event: string, handler: Function) => {
      handlers.set(event, handler);
    }),
    emit: vi.fn(),
    broadcast: { emit: vi.fn() },
    disconnect: vi.fn(),
    _trigger: (event: string, ...args: unknown[]) => {
      const h = handlers.get(event);
      if (h) h(...args);
    },
  };
}

export type MockSocket = ReturnType<typeof createMockSocket>;

export function createMockIO() {
  let connectionHandler: Function | null = null;
  const toEmit = vi.fn();
  return {
    on: vi.fn((event: string, handler: Function) => {
      if (event === "connection") connectionHandler = handler;
    }),
    emit: vi.fn(),
    to: vi.fn(() => ({ emit: toEmit })),
    _simulateConnection: (socket: MockSocket) => {
      if (connectionHandler) connectionHandler(socket);
    },
    _toEmit: toEmit,
  };
}

export type MockIO = ReturnType<typeof createMockIO>;

export function createMockBoggleGame() {
  return {
    addPlayer: vi.fn(),
    removePlayer: vi.fn(),
    getGameState: vi.fn(() => ({
      board: [],
      players: [],
      gameState: "waiting",
      timeLeft: 188,
      diceRolls: [],
      rotationVersion: 0,
    })),
    getRandomName: vi.fn(() => "TestPlayer"),
    startGame: vi.fn(() => ({ success: true, diceRolls: [] })),
    submitWord: vi.fn(
      (): { valid: boolean; points?: number; word?: string; reason?: string } => ({
        valid: true,
        points: 1,
        word: "casa",
      })
    ),
    resetGame: vi.fn(),
    rotateBoard: vi.fn(
      (): { success: boolean; cooldownTime?: number; rotationVersion?: number; reason?: string } => ({
        success: true,
        cooldownTime: 30,
        rotationVersion: 1,
      })
    ),
    findAllPossibleWords: vi.fn(() => ({
      words: [],
      maxScore: 0,
      totalWords: 0,
    })),
    setEliminateCommonWords: vi.fn(),
    setClientSideValidation: vi.fn(),
    getClientSideValidation: vi.fn(() => false),
    eliminateCommonWords: true,
    board: [
      ["A", "B", "C", "D"],
      ["E", "F", "G", "H"],
      ["I", "J", "K", "L"],
      ["M", "N", "O", "P"],
    ],
    players: new Map(),
  };
}

export type MockBoggleGame = ReturnType<typeof createMockBoggleGame>;

export function createMockScrabbleGame() {
  return {
    addPlayer: vi.fn(),
    removePlayer: vi.fn(),
    getGameState: vi.fn(() => ({
      board: [],
      players: [],
      gameState: "waiting",
      currentTurnPlayerId: null,
      turnTimeLeft: 120,
      tileBagCount: 100,
      consecutivePasses: 0,
    })),
    getGameStateForPlayer: vi.fn(() => ({
      board: [],
      players: [],
      gameState: "waiting",
      currentTurnPlayerId: null,
      turnTimeLeft: 120,
      tileBagCount: 100,
      consecutivePasses: 0,
      rack: [],
    })),
    getRandomName: vi.fn(() => "TestPlayer"),
    startGame: vi.fn((): { success: boolean } | false => ({ success: true })),
    placeTiles: vi.fn((): { success: boolean; reason?: string } => ({ success: true })),
    recallTiles: vi.fn(() => ({ success: true })),
    submitTurn: vi.fn(
      (): { valid: boolean; score?: number; words?: Array<{ word: string; score: number; tiles: unknown[] }>; reason?: string } => ({
        valid: true,
        score: 8,
        words: [{ word: "CASA", score: 8, tiles: [] }],
      })
    ),
    passTurn: vi.fn((): { success: boolean; reason?: string } => ({ success: true })),
    exchangeTiles: vi.fn((): { success: boolean; reason?: string } => ({ success: true })),
    resetGame: vi.fn(),
    reconnectPlayer: vi.fn(() => true),
    serialize: vi.fn(() => ({})),
    setClientSideValidation: vi.fn(),
    getClientSideValidation: vi.fn(() => false),
    players: new Map([["socket-1", { id: "socket-1", name: "Alice" }]]),
    gameState: "playing" as string,
  };
}

export type MockScrabbleGame = ReturnType<typeof createMockScrabbleGame>;

export function createMockRegistry(game: unknown, gameType = "boggle") {
  return {
    getGame: vi.fn((type: string) => (type === gameType ? game : undefined)),
    hasGame: vi.fn((type: string) => type === gameType),
    getGameTypes: vi.fn(() => [gameType]),
    registerGame: vi.fn(),
  };
}

export type MockRegistry = ReturnType<typeof createMockRegistry>;
