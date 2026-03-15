import { describe, it, expect } from "vitest";
import { TIME_LIMIT, ROTATION_COOLDOWN } from "../boggleConstants";

describe("boggle constants", () => {
  it("TIME_LIMIT es 188 (3 min + 8 seg animación)", () => {
    expect(TIME_LIMIT).toBe(188);
  });

  it("ROTATION_COOLDOWN es 30000ms", () => {
    expect(ROTATION_COOLDOWN).toBe(30000);
  });
});
