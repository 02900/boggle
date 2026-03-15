import { describe, it, expect, beforeEach } from "vitest";
import { useBoggleGameMainStore } from "../boogle-game-main.store";
import type { GameState } from "@/interfaces/game";

const initialGameState: GameState = {
  board: [],
  players: [],
  gameState: "waiting",
  timeLeft: 180,
  diceRolls: [],
  rotationVersion: 0,
  clientSideValidation: true,
};

describe("useBoggleGameMainStore", () => {
  beforeEach(() => {
    useBoggleGameMainStore.setState({
      gameState: { ...initialGameState },
      rotationCooldown: 0,
      rotationMessage: "",
      highlightedPath: [],
      highlightedErrorPath: [],
      highlightedSkipPath: [],
      currentPlayerId: null,
      isJoined: false,
    });
  });

  it("has correct initial state", () => {
    const state = useBoggleGameMainStore.getState();
    expect(state.gameState).toEqual(initialGameState);
    expect(state.rotationCooldown).toBe(0);
    expect(state.rotationMessage).toBe("");
    expect(state.highlightedPath).toEqual([]);
    expect(state.highlightedErrorPath).toEqual([]);
    expect(state.highlightedSkipPath).toEqual([]);
    expect(state.currentPlayerId).toBeNull();
    expect(state.isJoined).toBe(false);
  });

  describe("setGameState", () => {
    it("sets with direct value", () => {
      const newState: GameState = { ...initialGameState, gameState: "playing" };
      useBoggleGameMainStore.getState().setGameState(newState);
      expect(useBoggleGameMainStore.getState().gameState.gameState).toBe("playing");
    });

    it("sets with updater function", () => {
      useBoggleGameMainStore.getState().setGameState((prev) => ({
        ...prev,
        timeLeft: 120,
      }));
      expect(useBoggleGameMainStore.getState().gameState.timeLeft).toBe(120);
    });
  });

  describe("setRotationCooldown", () => {
    it("sets with direct value", () => {
      useBoggleGameMainStore.getState().setRotationCooldown(5);
      expect(useBoggleGameMainStore.getState().rotationCooldown).toBe(5);
    });

    it("sets with updater function", () => {
      useBoggleGameMainStore.getState().setRotationCooldown(5);
      useBoggleGameMainStore.getState().setRotationCooldown((prev) => prev - 1);
      expect(useBoggleGameMainStore.getState().rotationCooldown).toBe(4);
    });
  });

  describe("setRotationMessage", () => {
    it("sets with direct value", () => {
      useBoggleGameMainStore.getState().setRotationMessage("Rotating...");
      expect(useBoggleGameMainStore.getState().rotationMessage).toBe("Rotating...");
    });

    it("sets with updater function", () => {
      useBoggleGameMainStore.getState().setRotationMessage("Hello");
      useBoggleGameMainStore.getState().setRotationMessage((prev) => prev + " World");
      expect(useBoggleGameMainStore.getState().rotationMessage).toBe("Hello World");
    });
  });

  describe("highlight paths", () => {
    it("sets highlightedPath", () => {
      const path: [number, number][] = [[0, 0], [1, 1]];
      useBoggleGameMainStore.getState().setHighlightedPath(path);
      expect(useBoggleGameMainStore.getState().highlightedPath).toEqual(path);
    });

    it("sets highlightedErrorPath", () => {
      const path: [number, number][] = [[2, 2]];
      useBoggleGameMainStore.getState().setHighlightedErrorPath(path);
      expect(useBoggleGameMainStore.getState().highlightedErrorPath).toEqual(path);
    });

    it("sets highlightedSkipPath", () => {
      const path: [number, number][] = [[3, 3]];
      useBoggleGameMainStore.getState().setHighlightedSkipPath(path);
      expect(useBoggleGameMainStore.getState().highlightedSkipPath).toEqual(path);
    });

    it("sets highlight path with updater function", () => {
      useBoggleGameMainStore.getState().setHighlightedPath([[0, 0]]);
      useBoggleGameMainStore.getState().setHighlightedPath((prev) => [...prev, [1, 1]]);
      expect(useBoggleGameMainStore.getState().highlightedPath).toEqual([[0, 0], [1, 1]]);
    });
  });

  describe("setCurrentPlayerId", () => {
    it("sets with direct value", () => {
      useBoggleGameMainStore.getState().setCurrentPlayerId("player-123");
      expect(useBoggleGameMainStore.getState().currentPlayerId).toBe("player-123");
    });

    it("sets to null", () => {
      useBoggleGameMainStore.getState().setCurrentPlayerId("player-123");
      useBoggleGameMainStore.getState().setCurrentPlayerId(null);
      expect(useBoggleGameMainStore.getState().currentPlayerId).toBeNull();
    });

    it("sets with updater function", () => {
      useBoggleGameMainStore.getState().setCurrentPlayerId("old");
      useBoggleGameMainStore.getState().setCurrentPlayerId(() => "new");
      expect(useBoggleGameMainStore.getState().currentPlayerId).toBe("new");
    });
  });

  describe("setIsJoined", () => {
    it("sets with direct value", () => {
      useBoggleGameMainStore.getState().setIsJoined(true);
      expect(useBoggleGameMainStore.getState().isJoined).toBe(true);
    });

    it("sets with updater function", () => {
      useBoggleGameMainStore.getState().setIsJoined((prev) => !prev);
      expect(useBoggleGameMainStore.getState().isJoined).toBe(true);
    });
  });
});
