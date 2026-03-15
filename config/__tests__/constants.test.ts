import { describe, it, expect } from "vitest";
import { DEBUG_MODE, SCOREBOARD_FILE } from "../constants";

describe("shared constants", () => {
  it("DEBUG_MODE es booleano", () => {
    expect(typeof DEBUG_MODE).toBe("boolean");
  });

  it("SCOREBOARD_FILE es scoreboard.json", () => {
    expect(SCOREBOARD_FILE).toBe("scoreboard.json");
  });
});
