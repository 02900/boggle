import { describe, it, expect } from "vitest";
import { getDiceConfiguration, calculateWordPoints } from "../boggleConfig";

describe("getDiceConfiguration", () => {
  const dice = getDiceConfiguration();

  it("returns exactly 16 dice", () => {
    expect(dice).toHaveLength(16);
  });

  it("each die has exactly 6 faces", () => {
    for (const die of dice) {
      expect(die).toHaveLength(6);
    }
  });

  it("all faces are non-empty strings", () => {
    for (const die of dice) {
      for (const face of die) {
        expect(typeof face).toBe("string");
        expect(face.length).toBeGreaterThan(0);
      }
    }
  });

  it("contains expected digraphs: QU, CH, LL", () => {
    const allFaces = dice.flat();
    expect(allFaces).toContain("QU");
    expect(allFaces).toContain("CH");
    expect(allFaces).toContain("LL");
  });

  it("contains the letter \u00d1", () => {
    const allFaces = dice.flat();
    expect(allFaces).toContain("\u00d1");
  });
});

describe("calculateWordPoints", () => {
  it("returns 1 point for a 3-letter word", () => {
    expect(calculateWordPoints("sol")).toBe(1);
  });

  it("returns 1 point for a 4-letter word", () => {
    expect(calculateWordPoints("casa")).toBe(1);
  });

  it("returns 2 points for a 5-letter word", () => {
    expect(calculateWordPoints("perro")).toBe(2);
  });

  it("returns 3 points for a 6-letter word", () => {
    expect(calculateWordPoints("camino")).toBe(3);
  });

  it("returns 5 points for a 7-letter word", () => {
    expect(calculateWordPoints("caminos")).toBe(5);
  });

  it("returns 11 points for an 8-letter word", () => {
    expect(calculateWordPoints("entonces")).toBe(11);
  });

  it("returns 11 points for a 10-letter word", () => {
    expect(calculateWordPoints("absolutamente".slice(0, 10))).toBe(11);
  });
});
