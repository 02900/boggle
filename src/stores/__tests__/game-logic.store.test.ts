import { describe, it, expect, beforeEach } from "vitest";
import { useGameLogicStore } from "../game-logic.store";

describe("useGameLogicStore", () => {
  beforeEach(() => {
    useGameLogicStore.setState({
      currentWord: "",
      selectedPath: [],
      isSelecting: false,
      foundWords: [],
      message: "",
    });
  });

  it("has correct initial state", () => {
    const state = useGameLogicStore.getState();
    expect(state.currentWord).toBe("");
    expect(state.selectedPath).toEqual([]);
    expect(state.isSelecting).toBe(false);
    expect(state.foundWords).toEqual([]);
    expect(state.message).toBe("");
  });

  describe("setCurrentWord", () => {
    it("sets with direct value", () => {
      useGameLogicStore.getState().setCurrentWord("hello");
      expect(useGameLogicStore.getState().currentWord).toBe("hello");
    });

    it("sets with updater function", () => {
      useGameLogicStore.getState().setCurrentWord("hel");
      useGameLogicStore.getState().setCurrentWord((prev) => prev + "lo");
      expect(useGameLogicStore.getState().currentWord).toBe("hello");
    });
  });

  describe("setSelectedPath", () => {
    it("sets with direct value", () => {
      const path: [number, number][] = [[0, 0], [0, 1]];
      useGameLogicStore.getState().setSelectedPath(path);
      expect(useGameLogicStore.getState().selectedPath).toEqual(path);
    });

    it("sets with updater function", () => {
      useGameLogicStore.getState().setSelectedPath([[0, 0]]);
      useGameLogicStore.getState().setSelectedPath((prev) => [...prev, [1, 1]]);
      expect(useGameLogicStore.getState().selectedPath).toEqual([[0, 0], [1, 1]]);
    });
  });

  describe("setIsSelecting", () => {
    it("sets with direct value", () => {
      useGameLogicStore.getState().setIsSelecting(true);
      expect(useGameLogicStore.getState().isSelecting).toBe(true);
    });

    it("sets with updater function", () => {
      useGameLogicStore.getState().setIsSelecting((prev) => !prev);
      expect(useGameLogicStore.getState().isSelecting).toBe(true);
    });
  });

  describe("setFoundWords", () => {
    it("sets with direct value", () => {
      useGameLogicStore.getState().setFoundWords(["casa", "mesa"]);
      expect(useGameLogicStore.getState().foundWords).toEqual(["casa", "mesa"]);
    });

    it("sets with updater function", () => {
      useGameLogicStore.getState().setFoundWords(["casa"]);
      useGameLogicStore.getState().setFoundWords((prev) => [...prev, "mesa"]);
      expect(useGameLogicStore.getState().foundWords).toEqual(["casa", "mesa"]);
    });
  });

  describe("setMessage", () => {
    it("sets with direct value", () => {
      useGameLogicStore.getState().setMessage("hello");
      expect(useGameLogicStore.getState().message).toBe("hello");
    });

    it("sets with updater function", () => {
      useGameLogicStore.getState().setMessage("hel");
      useGameLogicStore.getState().setMessage((prev) => prev + "lo");
      expect(useGameLogicStore.getState().message).toBe("hello");
    });
  });
});
