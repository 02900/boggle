import { describe, it, expect } from "vitest";
import { DEBUG_MODE, SCOREBOARD_FILES } from "../constants";

describe("shared constants", () => {
  it("DEBUG_MODE es booleano", () => {
    expect(typeof DEBUG_MODE).toBe("boolean");
  });

  it("cada juego tiene su scoreboard; Boggle conserva scoreboard.json", () => {
    expect(SCOREBOARD_FILES).toEqual({ boggle: "scoreboard.json", scrabble: "scoreboard-scrabble.json" });
  });
});
