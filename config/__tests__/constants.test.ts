import { describe, it, expect } from "vitest";
import { TIME_LIMIT, DEBUG_MODE, SCOREBOARD_FILE, ROTATION_COOLDOWN } from "../constants";

describe("constants", () => {
  it("TIME_LIMIT es 188 (3 min + 8 seg animación)", () => {
    expect(TIME_LIMIT).toBe(188);
  });

  it("DEBUG_MODE es booleano", () => {
    expect(typeof DEBUG_MODE).toBe("boolean");
  });

  it("SCOREBOARD_FILE es scoreboard.json", () => {
    expect(SCOREBOARD_FILE).toBe("scoreboard.json");
  });

  it("ROTATION_COOLDOWN es 30000ms", () => {
    expect(ROTATION_COOLDOWN).toBe(30000);
  });
});
