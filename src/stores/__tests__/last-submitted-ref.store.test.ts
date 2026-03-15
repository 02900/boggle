import { describe, it, expect } from "vitest";
import {
  getLastSubmittedRefGlobal,
  setLastSubmittedRefGlobal,
} from "../last-submitted-ref.store";

describe("last-submitted-ref.store", () => {
  it("returns initial empty state", () => {
    const ref = getLastSubmittedRefGlobal();
    expect(ref.path).toEqual([]);
    expect(ref.word).toBe("");
  });

  it("sets and gets values", () => {
    const data = {
      path: [[0, 0], [0, 1]] as [number, number][],
      word: "casa",
    };
    setLastSubmittedRefGlobal(data);
    const ref = getLastSubmittedRefGlobal();
    expect(ref.path).toEqual([[0, 0], [0, 1]]);
    expect(ref.word).toBe("casa");
  });

  it("creates a copy of word (does not store original reference)", () => {
    const data = {
      path: [[0, 0]] as [number, number][],
      word: "test",
    };
    setLastSubmittedRefGlobal(data);
    data.word = "modified";
    expect(getLastSubmittedRefGlobal().word).toBe("test");
  });

  it("creates a copy of path (does not store original array reference)", () => {
    const data = {
      path: [[0, 0]] as [number, number][],
      word: "test",
    };
    setLastSubmittedRefGlobal(data);
    data.path.push([9, 9]);
    expect(getLastSubmittedRefGlobal().path).toEqual([[0, 0]]);
  });
});
