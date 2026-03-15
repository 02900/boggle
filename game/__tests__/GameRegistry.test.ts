import { describe, it, expect, vi } from "vitest";
import { GameRegistry } from "../GameRegistry";

function createMockGame() {
  return {
    players: new Map(),
    gameState: "waiting" as const,
    timeLeft: 100,
    words: new Set<string>(),
    addPlayer: vi.fn(),
    removePlayer: vi.fn(),
    getRandomName: vi.fn(() => "Test"),
    startGame: vi.fn(),
    endGame: vi.fn(),
    getGameState: vi.fn(),
    resetGame: vi.fn(),
    setIO: vi.fn(),
    clearTimers: vi.fn(),
  };
}

describe("GameRegistry", () => {
  it("starts empty", () => {
    const registry = new GameRegistry();
    expect(registry.getGameTypes()).toEqual([]);
  });

  it("registers a game", () => {
    const registry = new GameRegistry();
    const game = createMockGame();
    registry.registerGame("boggle", game as any);
    expect(registry.hasGame("boggle")).toBe(true);
  });

  it("retrieves a registered game", () => {
    const registry = new GameRegistry();
    const game = createMockGame();
    registry.registerGame("boggle", game as any);
    expect(registry.getGame("boggle")).toBe(game);
  });

  it("returns undefined for unregistered game", () => {
    const registry = new GameRegistry();
    expect(registry.getGame("scrabble")).toBeUndefined();
  });

  it("hasGame returns false for unregistered game", () => {
    const registry = new GameRegistry();
    expect(registry.hasGame("unknown")).toBe(false);
  });

  it("lists all registered game types", () => {
    const registry = new GameRegistry();
    registry.registerGame("boggle", createMockGame() as any);
    registry.registerGame("scrabble", createMockGame() as any);
    expect(registry.getGameTypes()).toEqual(["boggle", "scrabble"]);
  });

  it("supports multiple games independently", () => {
    const registry = new GameRegistry();
    const boggle = createMockGame();
    const scrabble = createMockGame();
    registry.registerGame("boggle", boggle as any);
    registry.registerGame("scrabble", scrabble as any);
    expect(registry.getGame("boggle")).toBe(boggle);
    expect(registry.getGame("scrabble")).toBe(scrabble);
  });

  it("overwrites a game if registered with the same type", () => {
    const registry = new GameRegistry();
    const game1 = createMockGame();
    const game2 = createMockGame();
    registry.registerGame("boggle", game1 as any);
    registry.registerGame("boggle", game2 as any);
    expect(registry.getGame("boggle")).toBe(game2);
  });
});
