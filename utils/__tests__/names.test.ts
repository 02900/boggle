import { describe, it, expect } from "vitest";
import { RANDOM_NAMES } from "../names";

describe("RANDOM_NAMES", () => {
  it("is an array", () => {
    expect(Array.isArray(RANDOM_NAMES)).toBe(true);
  });

  it("has at least 90 names", () => {
    expect(RANDOM_NAMES.length).toBeGreaterThanOrEqual(90);
  });

  it("all names are non-empty strings", () => {
    for (const name of RANDOM_NAMES) {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("contains no duplicate names", () => {
    const unique = new Set(RANDOM_NAMES);
    expect(unique.size).toBe(RANDOM_NAMES.length);
  });
});
