import { describe, it, expect, beforeEach } from "vitest";
import { useSocketsStore } from "../sockets.store";
import type { DiceRoll } from "@/interfaces/game";

describe("useSocketsStore", () => {
  beforeEach(() => {
    useSocketsStore.setState({
      socket: null,
      isConnected: false,
      diceRolling: null,
      eliminateCommonWords: true,
    } as Partial<ReturnType<typeof useSocketsStore.getState>>);
  });

  it("has correct initial state", () => {
    const state = useSocketsStore.getState();
    expect(state.socket).toBeNull();
    expect(state.isConnected).toBe(false);
    expect(state.diceRolling).toBeNull();
    expect(state.eliminateCommonWords).toBe(true);
  });

  it("sets isConnected", () => {
    useSocketsStore.getState().setIsConnected(true);
    expect(useSocketsStore.getState().isConnected).toBe(true);
  });

  it("sets diceRolling", () => {
    const dice: DiceRoll[] = [{
      diceNumber: 0,
      position: { row: 0, col: 0 },
      faces: ["A", "B", "C", "D", "E", "F"],
      rolledFace: 0,
      letter: "A",
    }];
    useSocketsStore.getState().setDiceRolling(dice);
    expect(useSocketsStore.getState().diceRolling).toEqual(dice);
  });

  it("clears diceRolling to null", () => {
    const dice: DiceRoll[] = [{
      diceNumber: 0,
      position: { row: 0, col: 0 },
      faces: ["A", "B", "C", "D", "E", "F"],
      rolledFace: 0,
      letter: "A",
    }];
    useSocketsStore.getState().setDiceRolling(dice);
    useSocketsStore.getState().setDiceRolling(null);
    expect(useSocketsStore.getState().diceRolling).toBeNull();
  });

  it("sets eliminateCommonWords", () => {
    useSocketsStore.getState().setEliminateCommonWords(false);
    expect(useSocketsStore.getState().eliminateCommonWords).toBe(false);
  });
});
