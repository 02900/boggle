import { vi } from "vitest";

/** One recorded emitter per Socket.IO room name, so tests can assert where a broadcast went. */
function roomEmitters() {
  const emitters = new Map<string, { emit: ReturnType<typeof vi.fn> }>();
  return (key: string) => {
    if (!emitters.has(key)) emitters.set(key, { emit: vi.fn() });
    return emitters.get(key)!;
  };
}

export function createMockSocket(id: string, gameType = "boggle") {
  const handlers = new Map<string, Function>();
  const rooms = new Set<string>();
  const toRoom = roomEmitters();
  return {
    id,
    handshake: { query: { game: gameType } },
    on: vi.fn((event: string, handler: Function) => {
      handlers.set(event, handler);
    }),
    emit: vi.fn(),
    /** Global broadcast: handlers must never use it now that games live in rooms */
    broadcast: { emit: vi.fn() },
    rooms,
    join: vi.fn((key: string) => {
      rooms.add(key);
    }),
    leave: vi.fn((key: string) => {
      rooms.delete(key);
    }),
    /** socket.to(room).emit — everyone in the room but this socket */
    to: vi.fn((key: string) => toRoom(key)),
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
  const toRoom = roomEmitters();
  const connectedSockets = new Map<string, MockSocket>();
  return {
    on: vi.fn((event: string, handler: Function) => {
      if (event === "connection") connectionHandler = handler;
    }),
    /** Global broadcast: handlers must never use it now that games live in rooms */
    emit: vi.fn(),
    /** io.to(room).emit — memoized per room name */
    to: vi.fn((key: string) => toRoom(key)),
    sockets: { sockets: connectedSockets },
    _simulateConnection: (socket: MockSocket) => {
      connectedSockets.set(socket.id, socket);
      if (connectionHandler) connectionHandler(socket);
    },
    _addSocket: (socket: MockSocket) => {
      connectedSockets.set(socket.id, socket);
    },
  };
}

export type MockIO = ReturnType<typeof createMockIO>;

export function createMockBoggleGame() {
  const game = {
    gameType: "boggle" as const,
    gameState: "waiting" as string,
    notifyStatusChange: vi.fn(),
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
    startGame: vi.fn(() => {
      game.gameState = "playing";
      return { success: true, diceRolls: [] };
    }),
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
  return game;
}

export type MockBoggleGame = ReturnType<typeof createMockBoggleGame>;

export function createMockScrabbleGame() {
  return {
    gameType: "scrabble" as const,
    notifyStatusChange: vi.fn(),
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
    recallTile: vi.fn((): { success: boolean; reason?: string } => ({ success: true })),
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
    getCurrentTurnPlayerId: vi.fn((): string | null => null),
    resumeTurnTimer: vi.fn(),
    skipTurn: vi.fn((): { success: boolean; reason?: string; skippedPlayerId?: string } => ({
      success: true,
      skippedPlayerId: "socket-2",
    })),
  };
}

export type MockScrabbleGame = ReturnType<typeof createMockScrabbleGame>;

export const TEST_ROOM_CODE = "TEST";

/** A room around a mock game, shaped like RoomManager's Room. */
export function mockRoom<G>(game: G, gameType: "boggle" | "scrabble" = "scrabble", code = TEST_ROOM_CODE) {
  return { code, gameType, key: `${gameType}:${code}`, game, hostName: "Host", createdAt: 0, cleanupTimer: null };
}


/**
 * A light stand-in for BoggleGame / ScrabbleGame inside a real RoomManager: keeps a
 * players map and fires onStatusChange like WordGame, plus the mocks handlers call.
 */
export function createFakeRoomGame(gameType: "boggle" | "scrabble") {
  const base = gameType === "boggle" ? createMockBoggleGame() : createMockScrabbleGame();
  const game = {
    ...base,
    gameType,
    gameState: "waiting" as string,
    players: new Map<string, { id: string; name: string; isConnected: boolean }>(),
    onStatusChange: null as (() => void) | null,
    io: null as unknown,
    setIO: vi.fn((io: unknown) => {
      game.io = io;
    }),
    clearTimers: vi.fn(),
    canJoin: vi.fn((): { ok: boolean; reason?: string } => ({ ok: true })),
    eliminateCommonWords: true,
    notifyStatusChange: vi.fn(() => game.onStatusChange?.()),
    addPlayer: vi.fn((id: string, name: string) => {
      game.players.set(id, { id, name, isConnected: true });
      game.onStatusChange?.();
    }),
    removePlayer: vi.fn((id: string) => {
      game.players.delete(id);
      game.onStatusChange?.();
    }),
  };
  return game;
}

export type FakeRoomGame = ReturnType<typeof createFakeRoomGame>;
