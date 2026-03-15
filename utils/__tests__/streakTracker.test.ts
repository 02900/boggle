import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

vi.mock("fs");

const STREAK_FILE_PATH = path.join(process.cwd(), "data", "player-streaks.json");
const SESSION_DURATION = 6 * 60 * 60 * 1000; // 6 hours

import { StreakTracker } from "../streakTracker";

describe("StreakTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function createTracker(): StreakTracker {
    return new StreakTracker();
  }

  describe("constructor / loadStreaks", () => {
    it("initializes with empty Map when no file exists", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const tracker = createTracker();
      expect(tracker.streaks.size).toBe(0);
    });

    it("loads existing streaks from JSON when file exists", () => {
      const now = Date.now();
      const data: Record<string, { wins: number; lastWinTime: number; sessionStartTime: number }> = {
        Alice: { wins: 3, lastWinTime: now, sessionStartTime: now - 1000 },
      };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(data));

      const tracker = createTracker();
      expect(tracker.streaks.has("Alice")).toBe(true);
      expect(tracker.streaks.get("Alice")!.wins).toBe(3);
    });

    it("filters expired sessions during load", () => {
      const now = Date.now();
      const data: Record<string, { wins: number; lastWinTime: number; sessionStartTime: number }> = {
        Active: { wins: 2, lastWinTime: now, sessionStartTime: now - 1000 },
        Expired: { wins: 5, lastWinTime: now - SESSION_DURATION - 1, sessionStartTime: now - SESSION_DURATION - 5000 },
      };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(data));

      const tracker = createTracker();
      expect(tracker.streaks.has("Active")).toBe(true);
      expect(tracker.streaks.has("Expired")).toBe(false);
    });

    it("handles corrupt JSON gracefully", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("not valid json {{{");

      const tracker = createTracker();
      expect(tracker.streaks.size).toBe(0);
    });
  });

  describe("isSessionActive", () => {
    it("returns true within 6 hours", () => {
      const tracker = createTracker();
      const recentTime = Date.now() - (SESSION_DURATION - 1000);
      expect(tracker.isSessionActive(recentTime)).toBe(true);
    });

    it("returns false after 6 hours", () => {
      const tracker = createTracker();
      const oldTime = Date.now() - SESSION_DURATION - 1;
      expect(tracker.isSessionActive(oldTime)).toBe(false);
    });

    it("returns false for undefined or 0", () => {
      const tracker = createTracker();
      expect(tracker.isSessionActive(undefined)).toBe(false);
      expect(tracker.isSessionActive(0)).toBe(false);
    });
  });

  describe("recordWin", () => {
    it("creates entry with wins=1 for a new player", () => {
      const tracker = createTracker();
      const result = tracker.recordWin("NewPlayer");
      expect(result.wins).toBe(1);
      expect(tracker.streaks.has("NewPlayer")).toBe(true);
    });

    it("increments wins for existing active player", () => {
      const now = Date.now();
      const tracker = createTracker();
      tracker.streaks.set("Alice", { wins: 2, lastWinTime: now, sessionStartTime: now - 1000 });

      const result = tracker.recordWin("Alice");
      expect(result.wins).toBe(3);
    });

    it("resets to wins=1 for existing expired player", () => {
      const now = Date.now();
      const tracker = createTracker();
      tracker.streaks.set("Bob", {
        wins: 5,
        lastWinTime: now - SESSION_DURATION - 1,
        sessionStartTime: now - SESSION_DURATION - 5000,
      });

      const result = tracker.recordWin("Bob");
      expect(result.wins).toBe(1);
    });

    it("calls saveStreaks after recording", () => {
      const tracker = createTracker();
      vi.mocked(fs.writeFileSync).mockClear();

      tracker.recordWin("Player");
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe("getPlayerStreak", () => {
    it("returns wins for active player", () => {
      const now = Date.now();
      const tracker = createTracker();
      tracker.streaks.set("Alice", { wins: 4, lastWinTime: now, sessionStartTime: now - 1000 });

      expect(tracker.getPlayerStreak("Alice")).toBe(4);
    });

    it("returns 0 for unknown player", () => {
      const tracker = createTracker();
      expect(tracker.getPlayerStreak("Nobody")).toBe(0);
    });

    it("returns 0 for expired player", () => {
      const now = Date.now();
      const tracker = createTracker();
      tracker.streaks.set("OldPlayer", {
        wins: 10,
        lastWinTime: now - SESSION_DURATION - 1,
        sessionStartTime: now - SESSION_DURATION - 5000,
      });

      expect(tracker.getPlayerStreak("OldPlayer")).toBe(0);
    });
  });

  describe("getPlayersStreaks", () => {
    it("returns object mapping names to streaks", () => {
      const now = Date.now();
      const tracker = createTracker();
      tracker.streaks.set("Alice", { wins: 3, lastWinTime: now, sessionStartTime: now - 1000 });
      tracker.streaks.set("Bob", { wins: 7, lastWinTime: now, sessionStartTime: now - 2000 });

      const result = tracker.getPlayersStreaks(["Alice", "Bob"]);
      expect(result).toEqual({ Alice: 3, Bob: 7 });
    });

    it("returns 0 for unknown players", () => {
      const tracker = createTracker();
      const result = tracker.getPlayersStreaks(["Ghost"]);
      expect(result).toEqual({ Ghost: 0 });
    });

    it("works with empty array", () => {
      const tracker = createTracker();
      const result = tracker.getPlayersStreaks([]);
      expect(result).toEqual({});
    });
  });

  describe("cleanExpiredSessions", () => {
    it("removes expired entries", () => {
      const now = Date.now();
      const tracker = createTracker();
      tracker.streaks.set("Active", { wins: 2, lastWinTime: now, sessionStartTime: now - 1000 });
      tracker.streaks.set("Expired", {
        wins: 5,
        lastWinTime: now - SESSION_DURATION - 1,
        sessionStartTime: now - SESSION_DURATION - 5000,
      });

      tracker.cleanExpiredSessions();
      expect(tracker.streaks.has("Active")).toBe(true);
      expect(tracker.streaks.has("Expired")).toBe(false);
    });

    it("returns count of cleaned entries", () => {
      const now = Date.now();
      const tracker = createTracker();
      tracker.streaks.set("Expired1", {
        wins: 1,
        lastWinTime: now - SESSION_DURATION - 1,
        sessionStartTime: now - SESSION_DURATION - 5000,
      });
      tracker.streaks.set("Expired2", {
        wins: 2,
        lastWinTime: now - SESSION_DURATION - 1,
        sessionStartTime: now - SESSION_DURATION - 5000,
      });

      const count = tracker.cleanExpiredSessions();
      expect(count).toBe(2);
    });

    it("saves when entries are cleaned", () => {
      const now = Date.now();
      const tracker = createTracker();
      tracker.streaks.set("Expired", {
        wins: 1,
        lastWinTime: now - SESSION_DURATION - 1,
        sessionStartTime: now - SESSION_DURATION - 5000,
      });
      vi.mocked(fs.writeFileSync).mockClear();

      tracker.cleanExpiredSessions();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("returns 0 when nothing to clean", () => {
      const tracker = createTracker();
      const count = tracker.cleanExpiredSessions();
      expect(count).toBe(0);
    });
  });

  describe("getSessionStats", () => {
    it("returns correct totalActivePlayers", () => {
      const now = Date.now();
      const tracker = createTracker();
      tracker.streaks.set("Alice", { wins: 3, lastWinTime: now, sessionStartTime: now - 1000 });
      tracker.streaks.set("Bob", { wins: 1, lastWinTime: now, sessionStartTime: now - 2000 });

      const stats = tracker.getSessionStats();
      expect(stats.totalActivePlayers).toBe(2);
    });

    it("returns players sorted by wins descending", () => {
      const now = Date.now();
      const tracker = createTracker();
      tracker.streaks.set("Low", { wins: 1, lastWinTime: now, sessionStartTime: now - 1000 });
      tracker.streaks.set("High", { wins: 10, lastWinTime: now, sessionStartTime: now - 2000 });
      tracker.streaks.set("Mid", { wins: 5, lastWinTime: now, sessionStartTime: now - 3000 });

      const stats = tracker.getSessionStats();
      expect(stats.players[0].name).toBe("High");
      expect(stats.players[0].wins).toBe(10);
      expect(stats.players[1].name).toBe("Mid");
      expect(stats.players[1].wins).toBe(5);
      expect(stats.players[2].name).toBe("Low");
      expect(stats.players[2].wins).toBe(1);
    });

    it("calls cleanExpiredSessions first", () => {
      const now = Date.now();
      const tracker = createTracker();
      tracker.streaks.set("Active", { wins: 2, lastWinTime: now, sessionStartTime: now - 1000 });
      tracker.streaks.set("Expired", {
        wins: 8,
        lastWinTime: now - SESSION_DURATION - 1,
        sessionStartTime: now - SESSION_DURATION - 5000,
      });

      const stats = tracker.getSessionStats();
      expect(stats.totalActivePlayers).toBe(1);
      expect(stats.players).toHaveLength(1);
      expect(stats.players[0].name).toBe("Active");
    });
  });
});
