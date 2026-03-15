import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupScrabbleHandlers } from "../scrabbleHandlers";

vi.mock("../../../utils/debug", () => ({ debugLog: vi.fn() }));
vi.mock("../../../game/scrabble/gameSessionStore", () => ({
  saveSession: vi.fn(),
  loadSession: vi.fn(() => null),
  deleteSession: vi.fn(),
}));

function createMockSocket(id: string) {
  const handlers = new Map<string, Function>();
  return {
    id,
    on: vi.fn((event: string, handler: Function) => {
      handlers.set(event, handler);
    }),
    emit: vi.fn(),
    broadcast: { emit: vi.fn() },
    _trigger: (event: string, ...args: any[]) => {
      const h = handlers.get(event);
      if (h) h(...args);
    },
  };
}

function createMockIO() {
  return {
    on: vi.fn(),
    emit: vi.fn(),
    to: vi.fn(() => ({ emit: vi.fn() })),
  };
}

function createMockGame() {
  return {
    startGame: vi.fn(() => ({ success: true })),
    placeTiles: vi.fn((): { success: boolean; reason?: string } => ({ success: true })),
    recallTiles: vi.fn(() => ({ success: true })),
    submitTurn: vi.fn((): { valid: boolean; score?: number; words?: Array<{ word: string; score: number; tiles: any[] }>; reason?: string } => ({
      valid: true,
      score: 8,
      words: [{ word: "CASA", score: 8, tiles: [] }],
    })),
    passTurn: vi.fn((): { success: boolean; reason?: string } => ({ success: true })),
    exchangeTiles: vi.fn((): { success: boolean; reason?: string } => ({ success: true })),
    resetGame: vi.fn(),
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
    reconnectPlayer: vi.fn(() => true),
    serialize: vi.fn(() => ({})),
    players: new Map([["socket-1", { id: "socket-1", name: "Alice" }]]),
    gameState: "playing",
  };
}

describe("setupScrabbleHandlers", () => {
  let io: ReturnType<typeof createMockIO>;
  let socket: ReturnType<typeof createMockSocket>;
  let game: ReturnType<typeof createMockGame>;

  beforeEach(() => {
    io = createMockIO();
    socket = createMockSocket("socket-1");
    game = createMockGame();
    setupScrabbleHandlers(io as any, socket as any, game as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("start-game", () => {
    it("calls game.startGame and emits game-started on success", () => {
      socket._trigger("start-game");

      expect(game.startGame).toHaveBeenCalled();
      expect(io.emit).toHaveBeenCalledWith("game-started", expect.anything());
    });

    it("does not emit when startGame returns false", () => {
      game.startGame.mockReturnValue(false as any);
      socket._trigger("start-game");

      expect(io.emit).not.toHaveBeenCalledWith("game-started", expect.anything());
    });
  });

  describe("place-tiles", () => {
    it("calls game.placeTiles and emits game-state on success", () => {
      const placements = [{ tile: { id: "t1", letter: "A", value: 1, isBlank: false }, row: 7, col: 7 }];
      socket._trigger("place-tiles", { placements });

      expect(game.placeTiles).toHaveBeenCalledWith("socket-1", placements);
      expect(socket.broadcast.emit).toHaveBeenCalledWith("game-state", expect.anything());
      expect(socket.emit).toHaveBeenCalledWith("game-state", expect.anything());
    });

    it("emits error when placeTiles fails", () => {
      game.placeTiles.mockReturnValue({ success: false, reason: "No es tu turno" });
      const placements = [{ tile: { id: "t1", letter: "A", value: 1, isBlank: false }, row: 7, col: 7 }];
      socket._trigger("place-tiles", { placements });

      expect(socket.emit).toHaveBeenCalledWith("word-result", {
        valid: false,
        reason: "No es tu turno",
      });
    });

    it("rejects invalid data", () => {
      socket._trigger("place-tiles", {});

      expect(game.placeTiles).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("word-result", expect.objectContaining({ valid: false }));
    });
  });

  describe("recall-tiles", () => {
    it("calls game.recallTiles and emits game-state", () => {
      socket._trigger("recall-tiles");

      expect(game.recallTiles).toHaveBeenCalledWith("socket-1");
      expect(socket.broadcast.emit).toHaveBeenCalledWith("game-state", expect.anything());
      expect(socket.emit).toHaveBeenCalledWith("game-state", expect.anything());
    });
  });

  describe("submit-turn", () => {
    it("calls game.submitTurn and emits word-result", () => {
      socket._trigger("submit-turn");

      expect(game.submitTurn).toHaveBeenCalledWith("socket-1");
      expect(socket.emit).toHaveBeenCalledWith("word-result", expect.objectContaining({
        valid: true,
        points: 8,
      }));
    });

    it("broadcasts public state and sends private state to submitter on valid submission", () => {
      socket._trigger("submit-turn");

      expect(socket.broadcast.emit).toHaveBeenCalledWith("game-state", expect.anything());
      expect(socket.emit).toHaveBeenCalledWith("game-state", expect.anything());
    });

    it("does not emit game-state on invalid submission", () => {
      game.submitTurn.mockReturnValue({ valid: false, reason: "Palabra inválida" });
      socket._trigger("submit-turn");

      expect(io.emit).not.toHaveBeenCalledWith("game-state", expect.anything());
    });

    it("emits error reason on invalid submission", () => {
      game.submitTurn.mockReturnValue({ valid: false, reason: "No es tu turno" });
      socket._trigger("submit-turn");

      expect(socket.emit).toHaveBeenCalledWith("word-result", expect.objectContaining({
        valid: false,
        reason: "No es tu turno",
      }));
    });
  });

  describe("pass-turn", () => {
    it("calls game.passTurn and emits game-state on success", () => {
      socket._trigger("pass-turn");

      expect(game.passTurn).toHaveBeenCalledWith("socket-1");
      expect(io.emit).toHaveBeenCalledWith("game-state", expect.anything());
    });

    it("emits error on failure", () => {
      game.passTurn.mockReturnValue({ success: false, reason: "No es tu turno" });
      socket._trigger("pass-turn");

      expect(socket.emit).toHaveBeenCalledWith("word-result", {
        valid: false,
        reason: "No es tu turno",
      });
    });
  });

  describe("exchange-tiles", () => {
    it("calls game.exchangeTiles and emits states on success", () => {
      socket._trigger("exchange-tiles", { tileIds: ["t1", "t2"] });

      expect(game.exchangeTiles).toHaveBeenCalledWith("socket-1", ["t1", "t2"]);
      expect(socket.broadcast.emit).toHaveBeenCalledWith("game-state", expect.anything());
      expect(socket.emit).toHaveBeenCalledWith("game-state", expect.anything());
    });

    it("emits error on failure", () => {
      game.exchangeTiles.mockReturnValue({ success: false, reason: "Fichas insuficientes" });
      socket._trigger("exchange-tiles", { tileIds: ["t1"] });

      expect(socket.emit).toHaveBeenCalledWith("word-result", {
        valid: false,
        reason: "Fichas insuficientes",
      });
    });

    it("rejects invalid data", () => {
      socket._trigger("exchange-tiles", {});

      expect(game.exchangeTiles).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("word-result", expect.objectContaining({ valid: false }));
    });
  });

  describe("reset-game", () => {
    it("calls game.resetGame and emits game-reset", () => {
      socket._trigger("reset-game");

      expect(game.resetGame).toHaveBeenCalled();
      expect(io.emit).toHaveBeenCalledWith("game-reset", expect.anything());
    });
  });

  describe("handler registration", () => {
    it("registers all expected scrabble events", () => {
      const registeredEvents = socket.on.mock.calls.map((call: any[]) => call[0]);
      expect(registeredEvents).toContain("start-game");
      expect(registeredEvents).toContain("place-tiles");
      expect(registeredEvents).toContain("recall-tiles");
      expect(registeredEvents).toContain("submit-turn");
      expect(registeredEvents).toContain("pass-turn");
      expect(registeredEvents).toContain("exchange-tiles");
      expect(registeredEvents).toContain("reset-game");
      // submit-word should NOT be registered for Scrabble
      expect(registeredEvents).not.toContain("submit-word");
      // rejoin-game should be registered
      expect(registeredEvents).toContain("rejoin-game");
    });
  });

  describe("rejoin-game", () => {
    it("emits rejoin-failed when session not found", async () => {
      const { loadSession } = await import("../../../game/scrabble/gameSessionStore");
      vi.mocked(loadSession).mockReturnValue(null);

      socket._trigger("rejoin-game", { playerName: "Alice", gameId: "no-exist" });

      expect(socket.emit).toHaveBeenCalledWith("rejoin-failed", {
        reason: "Sesión no encontrada",
      });
    });

    it("emits rejoin-failed when player not in game", async () => {
      const { loadSession } = await import("../../../game/scrabble/gameSessionStore");
      vi.mocked(loadSession).mockReturnValue({
        gameId: "g1",
        createdAt: "",
        lastUpdatedAt: "",
        board: [],
        tileBag: [],
        players: [{ name: "Bob", score: 0, rack: [], wordsFound: [] }],
        currentTurnPlayerName: "Bob",
        turnTimeLeft: 120,
        consecutivePasses: 0,
        gameState: "playing",
        moveHistory: [],
        isFirstTurn: false,
      });

      socket._trigger("rejoin-game", { playerName: "Alice", gameId: "g1" });

      expect(socket.emit).toHaveBeenCalledWith("rejoin-failed", {
        reason: "No estás en este juego",
      });
    });

    it("calls reconnectPlayer and emits rejoin-success on valid rejoin", async () => {
      const { loadSession } = await import("../../../game/scrabble/gameSessionStore");
      vi.mocked(loadSession).mockReturnValue({
        gameId: "g1",
        createdAt: "",
        lastUpdatedAt: "",
        board: [],
        tileBag: [],
        players: [{ name: "Alice", score: 5, rack: [], wordsFound: [] }],
        currentTurnPlayerName: "Alice",
        turnTimeLeft: 120,
        consecutivePasses: 0,
        gameState: "playing",
        moveHistory: [],
        isFirstTurn: false,
      });

      socket._trigger("rejoin-game", { playerName: "Alice", gameId: "g1" });

      expect(game.reconnectPlayer).toHaveBeenCalledWith("Alice", "socket-1");
      expect(socket.emit).toHaveBeenCalledWith("rejoin-success", expect.anything());
    });

    it("broadcasts player-joined on successful rejoin", async () => {
      const { loadSession } = await import("../../../game/scrabble/gameSessionStore");
      vi.mocked(loadSession).mockReturnValue({
        gameId: "g1",
        createdAt: "",
        lastUpdatedAt: "",
        board: [],
        tileBag: [],
        players: [{ name: "Alice", score: 0, rack: [], wordsFound: [] }],
        currentTurnPlayerName: null,
        turnTimeLeft: 120,
        consecutivePasses: 0,
        gameState: "playing",
        moveHistory: [],
        isFirstTurn: false,
      });

      socket._trigger("rejoin-game", { playerName: "Alice", gameId: "g1" });

      expect(socket.broadcast.emit).toHaveBeenCalledWith("player-joined", {
        playerId: "socket-1",
        playerName: "Alice",
      });
    });

    it("emits rejoin-failed when data is missing", () => {
      socket._trigger("rejoin-game", {});

      expect(socket.emit).toHaveBeenCalledWith("rejoin-failed", {
        reason: "Datos inválidos para reconexión",
      });
    });
  });
});
