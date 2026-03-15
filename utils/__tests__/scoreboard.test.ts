import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

vi.mock("fs");
vi.mock("../../config/constants", () => ({
  SCOREBOARD_FILE: "scoreboard.json",
}));

import {
  loadScoreboard,
  saveScoreboard,
  updateScoreboard,
} from "../scoreboard";

describe("loadScoreboard", () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset();
    vi.mocked(fs.readFileSync).mockReset();
    vi.mocked(fs.writeFileSync).mockReset();
  });

  it("returns parsed JSON when the file exists", () => {
    const entries = [
      { name: "Alice", score: 10, date: "2026-01-01", playerCount: 2 },
    ];
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(entries));

    const result = loadScoreboard();

    expect(result).toEqual(entries);
  });

  it("creates the file and returns [] when the file does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = loadScoreboard();

    expect(result).toEqual([]);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("scoreboard.json"),
      "[]"
    );
  });

  it("returns [] on parse error", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("not valid json{{{");

    const result = loadScoreboard();

    expect(result).toEqual([]);
  });
});

describe("saveScoreboard", () => {
  beforeEach(() => {
    vi.mocked(fs.writeFileSync).mockReset();
  });

  it("writes JSON to the correct path", () => {
    const entries = [
      { name: "Alice", score: 10, date: "2026-01-01", playerCount: 2 },
    ];

    saveScoreboard(entries);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("scoreboard.json"),
      JSON.stringify(entries, null, 2)
    );
  });

  it("does not throw on write error", () => {
    vi.mocked(fs.writeFileSync).mockImplementation(() => {
      throw new Error("disk full");
    });

    expect(() => saveScoreboard([])).not.toThrow();
  });
});

describe("updateScoreboard", () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset();
    vi.mocked(fs.readFileSync).mockReset();
    vi.mocked(fs.writeFileSync).mockReset();
    // Default: existing scoreboard is empty
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("[]");
  });

  it("adds scores > 0 to the existing scoreboard", () => {
    const existing = [
      { name: "Old", score: 5, date: "2026-01-01", playerCount: 2 },
    ];
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existing));

    const result = updateScoreboard(
      [{ name: "New", score: 8 }],
      3
    );

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Old", score: 5 }),
        expect.objectContaining({ name: "New", score: 8, playerCount: 3 }),
      ])
    );
  });

  it("skips scores where score === 0", () => {
    const result = updateScoreboard(
      [
        { name: "Winner", score: 10 },
        { name: "Loser", score: 0 },
      ],
      2
    );

    const names = result.map((e) => e.name);
    expect(names).toContain("Winner");
    expect(names).not.toContain("Loser");
  });

  it("sorts by score descending", () => {
    const result = updateScoreboard(
      [
        { name: "Low", score: 1 },
        { name: "High", score: 100 },
        { name: "Mid", score: 50 },
      ],
      3
    );

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it("limits to top 50 entries", () => {
    const existing = Array.from({ length: 48 }, (_, i) => ({
      name: `Player${i}`,
      score: i + 1,
      date: "2026-01-01",
      playerCount: 2,
    }));
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existing));

    const result = updateScoreboard(
      [
        { name: "Extra1", score: 200 },
        { name: "Extra2", score: 199 },
        { name: "Extra3", score: 198 },
      ],
      4
    );

    expect(result.length).toBeLessThanOrEqual(50);
  });

  it("adds date and playerCount fields to new entries", () => {
    const result = updateScoreboard(
      [{ name: "Alice", score: 15 }],
      4
    );

    const alice = result.find((e) => e.name === "Alice");
    expect(alice).toBeDefined();
    expect(alice!.date).toBeDefined();
    expect(typeof alice!.date).toBe("string");
    expect(alice!.playerCount).toBe(4);
  });
});
