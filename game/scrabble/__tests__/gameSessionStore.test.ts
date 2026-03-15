import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";

vi.mock("fs");
vi.mock("../../../utils/debug", () => ({ debugLog: vi.fn() }));

import { saveSession, loadSession, deleteSession, listSessions } from "../gameSessionStore";
import type { SerializedScrabbleGame } from "../../../src/interfaces/scrabble";

function makeMockSession(gameId = "test-game"): SerializedScrabbleGame {
  return {
    gameId,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastUpdatedAt: "2026-01-01T00:01:00.000Z",
    board: [],
    tileBag: [],
    players: [
      { name: "Alice", score: 10, rack: [], wordsFound: ["casa"] },
      { name: "Bob", score: 5, rack: [], wordsFound: [] },
    ],
    currentTurnPlayerName: "Alice",
    turnTimeLeft: 90,
    consecutivePasses: 0,
    gameState: "playing",
    moveHistory: [],
    isFirstTurn: false,
  };
}

describe("gameSessionStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined as any);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    vi.mocked(fs.unlinkSync).mockImplementation(() => {});
  });

  describe("saveSession", () => {
    it("creates directory and writes JSON file", () => {
      saveSession("game-1", makeMockSession("game-1"));

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("game-1.json"),
        expect.any(String)
      );
    });

    it("writes valid JSON", () => {
      saveSession("game-1", makeMockSession("game-1"));

      const written = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      const parsed = JSON.parse(written);
      expect(parsed.gameId).toBe("game-1");
      expect(parsed.players).toHaveLength(2);
    });

    it("does not throw on write error", () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error("disk full");
      });

      expect(() => saveSession("game-1", makeMockSession())).not.toThrow();
    });
  });

  describe("loadSession", () => {
    it("returns parsed session when file exists", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(makeMockSession("game-1"))
      );

      const session = loadSession("game-1");
      expect(session).not.toBeNull();
      expect(session!.gameId).toBe("game-1");
      expect(session!.players).toHaveLength(2);
    });

    it("returns null when file does not exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(loadSession("nonexistent")).toBeNull();
    });

    it("returns null on parse error", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("not valid json{{{");

      expect(loadSession("corrupt")).toBeNull();
    });

    it("returns null on read error", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("read error");
      });

      expect(loadSession("error")).toBeNull();
    });
  });

  describe("deleteSession", () => {
    it("deletes file when it exists", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      deleteSession("game-1");

      expect(fs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining("game-1.json")
      );
    });

    it("does nothing when file does not exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      deleteSession("nonexistent");

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it("does not throw on delete error", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error("permission denied");
      });

      expect(() => deleteSession("game-1")).not.toThrow();
    });
  });

  describe("listSessions", () => {
    it("returns session IDs from directory", () => {
      vi.mocked(fs.readdirSync).mockReturnValue(
        ["game-1.json", "game-2.json", "readme.txt"] as any
      );

      const sessions = listSessions();
      expect(sessions).toEqual(["game-1", "game-2"]);
    });

    it("returns empty array when directory is empty", () => {
      vi.mocked(fs.readdirSync).mockReturnValue([] as any);

      expect(listSessions()).toEqual([]);
    });

    it("returns empty array on error", () => {
      vi.mocked(fs.readdirSync).mockImplementation(() => {
        throw new Error("not found");
      });

      expect(listSessions()).toEqual([]);
    });
  });

  describe("round-trip", () => {
    it("save then load preserves data", () => {
      const original = makeMockSession("roundtrip");

      // Capture what was written
      let savedData = "";
      vi.mocked(fs.writeFileSync).mockImplementation((_path, data) => {
        savedData = data as string;
      });
      saveSession("roundtrip", original);

      // Mock read to return what was saved
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(savedData);

      const loaded = loadSession("roundtrip");
      expect(loaded).not.toBeNull();
      expect(loaded!.gameId).toBe(original.gameId);
      expect(loaded!.players).toEqual(original.players);
      expect(loaded!.currentTurnPlayerName).toBe(original.currentTurnPlayerName);
      expect(loaded!.turnTimeLeft).toBe(original.turnTimeLeft);
      expect(loaded!.consecutivePasses).toBe(original.consecutivePasses);
      expect(loaded!.gameState).toBe(original.gameState);
    });
  });
});
