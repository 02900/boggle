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
    expect(state.message).toBe("");
    expect(state.gameId).toBeNull();
    expect(state.playerName).toBeNull();
  });

  it("sets isConnected", () => {
    useScrabbleGameStore.getState().setIsConnected(true);
    expect(useScrabbleGameStore.getState().isConnected).toBe(true);
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
    useScrabbleGameStore.getState().setIsConnected(true);
    useScrabbleGameStore.getState().setIsJoined(true);
    useScrabbleGameStore.getState().setGameState(mockGameState);
    useScrabbleGameStore.getState().setRack([mockTile]);
    useScrabbleGameStore.getState().setSelectedTile(mockTile);
    useScrabbleGameStore.getState().setGameId("game-123");
    useScrabbleGameStore.getState().setMessage("test message");
    useScrabbleGameStore.getState().setPlayerName("Alice");

    useScrabbleGameStore.getState().reset();

    const state = useScrabbleGameStore.getState();
    expect(state.isConnected).toBe(false);
    expect(state.isJoined).toBe(false);
    expect(state.gameState).toBeNull();
    expect(state.rack).toEqual([]);
    expect(state.selectedTile).toBeNull();
    expect(state.gameId).toBeNull();
    expect(state.message).toBe("");
    expect(state.playerName).toBeNull();
  });
});
