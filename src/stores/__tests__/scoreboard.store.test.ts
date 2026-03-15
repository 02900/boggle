import { describe, it, expect, beforeEach, vi } from "vitest";
import { useScoreboardStore, ScoreEntry } from "../scoreboard.store";

vi.mock("@/utils/socket-emitter", () => ({
  socketEmitter: {
    emitGetScoreboard: vi.fn(),
    emitGetMaxScore: vi.fn(),
  },
}));

import { socketEmitter } from "@/utils/socket-emitter";

describe("useScoreboardStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useScoreboardStore.setState({
      scoreboard: [],
      isLoading: false,
    });
  });

  it("has correct initial state", () => {
    const state = useScoreboardStore.getState();
    expect(state.scoreboard).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  it("sets scoreboard", () => {
    const entries: ScoreEntry[] = [
      { name: "Player1", score: 100, date: "2026-01-01", playerCount: 2 },
    ];
    useScoreboardStore.getState().setScoreboard(entries);
    expect(useScoreboardStore.getState().scoreboard).toEqual(entries);
  });

  it("sets isLoading", () => {
    useScoreboardStore.getState().setIsLoading(true);
    expect(useScoreboardStore.getState().isLoading).toBe(true);
  });

  it("requestScoreboard sets loading and emits event", () => {
    useScoreboardStore.getState().requestScoreboard();
    expect(useScoreboardStore.getState().isLoading).toBe(true);
    expect(socketEmitter.emitGetScoreboard).toHaveBeenCalled();
  });
});
