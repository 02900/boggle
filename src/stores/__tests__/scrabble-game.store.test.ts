import { describe, it, expect, beforeEach } from "vitest";
import { useScrabbleGameStore } from "../scrabble-game.store";
import type { ScrabbleGameState, ScrabbleTile, TilePlacement } from "@/interfaces/scrabble";

const mockTile: ScrabbleTile = {
  id: "tile-1",
  letter: "A",
  value: 1,
  isBlank: false,
};

const mockGameState: ScrabbleGameState = {
  board: [],
  players: [],
  gameState: "waiting",
  currentTurnPlayerId: null,
  turnTimeLeft: 120,
  tileBagCount: 100,
  consecutivePasses: 0,
};

describe("useScrabbleGameStore", () => {
  beforeEach(() => {
    useScrabbleGameStore.getState().reset();
  });

  it("has correct initial state", () => {
    const state = useScrabbleGameStore.getState();
    expect(state.socket).toBeNull();
    expect(state.isConnected).toBe(false);
    expect(state.currentPlayerId).toBeNull();
    expect(state.isJoined).toBe(false);
    expect(state.gameState).toBeNull();
    expect(state.rack).toEqual([]);
    expect(state.selectedTile).toBeNull();
    expect(state.tentativePlacements).toEqual([]);
    expect(state.notifications).toEqual([]);
    expect(state.connectionStatus).toBe("connecting");
    expect(state.disconnectedPlayers).toEqual({});
    expect(state.gameEndSummary).toBeNull();
    expect(state.gameId).toBeNull();
    expect(state.playerName).toBeNull();
  });

  it("setConnectionStatus keeps isConnected in sync", () => {
    useScrabbleGameStore.getState().setConnectionStatus("connected");
    expect(useScrabbleGameStore.getState().isConnected).toBe(true);
    useScrabbleGameStore.getState().setConnectionStatus("reconnecting");
    expect(useScrabbleGameStore.getState().isConnected).toBe(false);
    expect(useScrabbleGameStore.getState().connectionStatus).toBe("reconnecting");
  });

  describe("notifications", () => {
    it("notify appends with a default ttl per kind and returns an id", () => {
      const id = useScrabbleGameStore.getState().notify("error", "boom");
      const [n] = useScrabbleGameStore.getState().notifications;
      expect(n).toEqual({ id, kind: "error", text: "boom", ttl: 5000 });
    });

    it("notify accepts a custom ttl (0 = sticky)", () => {
      useScrabbleGameStore.getState().notify("info", "stay", 0);
      expect(useScrabbleGameStore.getState().notifications[0].ttl).toBe(0);
    });

    it("keeps only the 4 most recent notifications", () => {
      for (let i = 0; i < 6; i++) useScrabbleGameStore.getState().notify("info", `n${i}`);
      expect(useScrabbleGameStore.getState().notifications.map((n) => n.text)).toEqual(["n2", "n3", "n4", "n5"]);
    });

    it("dismissNotification removes only the given id", () => {
      const a = useScrabbleGameStore.getState().notify("info", "a");
      const b = useScrabbleGameStore.getState().notify("info", "b");
      useScrabbleGameStore.getState().dismissNotification(a);
      expect(useScrabbleGameStore.getState().notifications.map((n) => n.id)).toEqual([b]);
    });
  });

  describe("disconnected players", () => {
    it("markPlayerDisconnected stores a grace deadline", () => {
      const before = Date.now();
      useScrabbleGameStore.getState().markPlayerDisconnected("p2", "Bob", 30);
      const entry = useScrabbleGameStore.getState().disconnectedPlayers["p2"];
      expect(entry.playerName).toBe("Bob");
      expect(entry.graceEndsAt).toBeGreaterThanOrEqual(before + 30_000);
    });

    it("markPlayerReconnected removes by name (id changes on reconnect)", () => {
      useScrabbleGameStore.getState().markPlayerDisconnected("old-id", "Bob", 30);
      useScrabbleGameStore.getState().markPlayerDisconnected("p3", "Carol", 30);
      useScrabbleGameStore.getState().markPlayerReconnected("Bob");
      expect(Object.keys(useScrabbleGameStore.getState().disconnectedPlayers)).toEqual(["p3"]);
    });
  });

  describe("exchange mode", () => {
    it("toggleExchangeSelection adds and removes tile ids", () => {
      const s = useScrabbleGameStore.getState();
      s.toggleExchangeSelection("t1");
      s.toggleExchangeSelection("t2");
      s.toggleExchangeSelection("t1");
      expect([...useScrabbleGameStore.getState().selectedForExchange]).toEqual(["t2"]);
    });

    it("setExchangeMode clears the selection", () => {
      useScrabbleGameStore.getState().toggleExchangeSelection("t1");
      useScrabbleGameStore.getState().setExchangeMode(false);
      expect(useScrabbleGameStore.getState().selectedForExchange.size).toBe(0);
    });
  });

  it("sets currentPlayerId", () => {
    useScrabbleGameStore.getState().setCurrentPlayerId("p1");
    expect(useScrabbleGameStore.getState().currentPlayerId).toBe("p1");
  });

  it("sets isJoined", () => {
    useScrabbleGameStore.getState().setIsJoined(true);
    expect(useScrabbleGameStore.getState().isJoined).toBe(true);
  });

  it("sets gameState", () => {
    useScrabbleGameStore.getState().setGameState(mockGameState);
    expect(useScrabbleGameStore.getState().gameState).toEqual(mockGameState);
  });

  it("sets rack", () => {
    useScrabbleGameStore.getState().setRack([mockTile]);
    expect(useScrabbleGameStore.getState().rack).toEqual([mockTile]);
  });

  it("sets and clears selectedTile", () => {
    useScrabbleGameStore.getState().setSelectedTile(mockTile);
    expect(useScrabbleGameStore.getState().selectedTile).toEqual(mockTile);

    useScrabbleGameStore.getState().setSelectedTile(null);
    expect(useScrabbleGameStore.getState().selectedTile).toBeNull();
  });

  it("adds tentative placements", () => {
    const placement: TilePlacement = { tile: mockTile, row: 7, col: 7 };
    useScrabbleGameStore.getState().addTentativePlacement(placement);
    expect(useScrabbleGameStore.getState().tentativePlacements).toHaveLength(1);

    const placement2: TilePlacement = { tile: { ...mockTile, id: "tile-2" }, row: 7, col: 8 };
    useScrabbleGameStore.getState().addTentativePlacement(placement2);
    expect(useScrabbleGameStore.getState().tentativePlacements).toHaveLength(2);
  });

  it("clears tentative placements", () => {
    useScrabbleGameStore.getState().addTentativePlacement({ tile: mockTile, row: 7, col: 7 });
    useScrabbleGameStore.getState().clearTentativePlacements();
    expect(useScrabbleGameStore.getState().tentativePlacements).toEqual([]);
  });

  it("sets session info (gameId and playerName)", () => {
    useScrabbleGameStore.getState().setGameId("game-123");
    useScrabbleGameStore.getState().setPlayerName("Alice");
    expect(useScrabbleGameStore.getState().gameId).toBe("game-123");
    expect(useScrabbleGameStore.getState().playerName).toBe("Alice");
  });

  it("removes a single tentative placement by tileId", () => {
    const p1: TilePlacement = { tile: mockTile, row: 7, col: 7 };
    const p2: TilePlacement = { tile: { ...mockTile, id: "tile-2" }, row: 7, col: 8 };
    useScrabbleGameStore.getState().addTentativePlacement(p1);
    useScrabbleGameStore.getState().addTentativePlacement(p2);

    useScrabbleGameStore.getState().removeTentativePlacement("tile-1");

    const placements = useScrabbleGameStore.getState().tentativePlacements;
    expect(placements).toHaveLength(1);
    expect(placements[0].tile.id).toBe("tile-2");
  });

  it("setGameState supports updater function", () => {
    useScrabbleGameStore.getState().setGameState(mockGameState);
    useScrabbleGameStore.getState().setGameState((prev) =>
      prev ? { ...prev, turnTimeLeft: 60 } : prev
    );
    expect(useScrabbleGameStore.getState().gameState?.turnTimeLeft).toBe(60);
  });

  it("resets all state", () => {
    useScrabbleGameStore.getState().setConnectionStatus("connected");
    useScrabbleGameStore.getState().setIsJoined(true);
    useScrabbleGameStore.getState().setGameState(mockGameState);
    useScrabbleGameStore.getState().setRack([mockTile]);
    useScrabbleGameStore.getState().setSelectedTile(mockTile);
    useScrabbleGameStore.getState().setGameId("game-123");
    useScrabbleGameStore.getState().notify("info", "test message");
    useScrabbleGameStore.getState().markPlayerDisconnected("p2", "Bob", 30);
    useScrabbleGameStore.getState().setPlayerName("Alice");

    useScrabbleGameStore.getState().reset();

    const state = useScrabbleGameStore.getState();
    expect(state.isConnected).toBe(false);
    expect(state.isJoined).toBe(false);
    expect(state.gameState).toBeNull();
    expect(state.rack).toEqual([]);
    expect(state.selectedTile).toBeNull();
    expect(state.gameId).toBeNull();
    expect(state.notifications).toEqual([]);
    expect(state.disconnectedPlayers).toEqual({});
    expect(state.playerName).toBeNull();
  });
});
