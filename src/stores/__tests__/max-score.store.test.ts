import { describe, it, expect, beforeEach, vi } from "vitest";
import { useMaxScoreStore, MaxScoreData } from "../max-score.store";

vi.mock("@/utils/socket-emitter", () => ({
  socketEmitter: {
    emitGetScoreboard: vi.fn(),
    emitGetMaxScore: vi.fn(),
  },
}));

import { socketEmitter } from "@/utils/socket-emitter";

describe("useMaxScoreStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMaxScoreStore.setState({
      maxScoreData: null,
      isLoading: false,
    });
  });

  it("has correct initial state", () => {
    const state = useMaxScoreStore.getState();
    expect(state.maxScoreData).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it("sets maxScoreData", () => {
    const data: MaxScoreData = {
      words: [{ word: "casa", points: 1, path: [[0, 0], [0, 1], [0, 2], [0, 3]] }],
      maxScore: 1,
      totalWords: 1,
    };
    useMaxScoreStore.getState().setMaxScoreData(data);
    expect(useMaxScoreStore.getState().maxScoreData).toEqual(data);
  });

  it("requestMaxScore sets loading, clears data, and emits event", () => {
    useMaxScoreStore.getState().setMaxScoreData({ words: [], maxScore: 0, totalWords: 0 });
    useMaxScoreStore.getState().requestMaxScore();
    expect(useMaxScoreStore.getState().maxScoreData).toBeNull();
    expect(useMaxScoreStore.getState().isLoading).toBe(true);
    expect(socketEmitter.emitGetMaxScore).toHaveBeenCalled();
  });

  it("resetMaxScore clears data and loading", () => {
    useMaxScoreStore.getState().setMaxScoreData({ words: [], maxScore: 0, totalWords: 0 });
    useMaxScoreStore.getState().setIsLoading(true);
    useMaxScoreStore.getState().resetMaxScore();
    expect(useMaxScoreStore.getState().maxScoreData).toBeNull();
    expect(useMaxScoreStore.getState().isLoading).toBe(false);
  });
});
