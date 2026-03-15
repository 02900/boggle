import { describe, it, expect, beforeEach, vi } from "vitest";
import { DictionaryService } from "../dictionaryService";

describe("DictionaryService", () => {
  let service: DictionaryService;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    service = new DictionaryService();
  });

  describe("initial state", () => {
    it("is not ready before loading", () => {
      expect(service.isReady()).toBe(false);
    });

    it("is not loading initially", () => {
      expect(service.isLoadingDictionary()).toBe(false);
    });

    it("has fallback dictionary size > 0", () => {
      const stats = service.getStats();
      expect(stats.hasFallback).toBe(true);
      expect(stats.fallbackSize).toBeGreaterThan(0);
    });
  });

  describe("hasWord", () => {
    it("returns false when dictionary is empty", () => {
      expect(service.hasWord("casa")).toBe(false);
    });
  });

  describe("getDictionarySize", () => {
    it("returns 0 before loading", () => {
      expect(service.getDictionarySize()).toBe(0);
    });
  });

  describe("getStats", () => {
    it("returns expected structure", () => {
      const stats = service.getStats();
      expect(stats).toHaveProperty("isLoaded");
      expect(stats).toHaveProperty("isLoading");
      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("hasFallback");
      expect(stats).toHaveProperty("fallbackSize");
    });
  });

  describe("loadDictionary", () => {
    it("loads from remote successfully", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve("casa\nmesa\nsilla\nagua\nfuego"),
        })
      );

      const result = await service.loadDictionary();
      expect(result.success).toBe(true);
      expect(result.source).toBe("remote");
      expect(result.wordsLoaded).toBe(5);
      expect(service.isReady()).toBe(true);
      expect(service.hasWord("casa")).toBe(true);
      expect(service.hasWord("mesa")).toBe(true);
    });

    it("falls back when fetch fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network error"))
      );

      const result = await service.loadDictionary();
      expect(result.success).toBe(false);
      expect(result.source).toBe("fallback");
      expect(result.wordsLoaded).toBeGreaterThan(0);
    });

    it("loads from cache when available", async () => {
      // Pre-populate cache
      const words = ["alpha", "beta", "gamma"];
      localStorage.setItem("boggle-dictionary-cache", JSON.stringify(words));
      localStorage.setItem("boggle-dictionary-version", "1.0.0");
      localStorage.setItem(
        "boggle-dictionary-cache-timestamp",
        Date.now().toString()
      );

      const result = await service.loadDictionary();
      expect(result.success).toBe(true);
      expect(result.source).toBe("cache");
      expect(result.wordsLoaded).toBe(3);
      expect(service.hasWord("alpha")).toBe(true);
    });

    it("invalidates expired cache", async () => {
      const words = ["old", "words"];
      localStorage.setItem("boggle-dictionary-cache", JSON.stringify(words));
      localStorage.setItem("boggle-dictionary-version", "1.0.0");
      // Set timestamp to 48 hours ago
      const expiredTimestamp = Date.now() - 48 * 60 * 60 * 1000;
      localStorage.setItem(
        "boggle-dictionary-cache-timestamp",
        expiredTimestamp.toString()
      );

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve("new\nwords\nhere"),
        })
      );

      const result = await service.loadDictionary();
      expect(result.source).not.toBe("cache");
    });

    it("invalidates cache with different version", async () => {
      const words = ["old", "words"];
      localStorage.setItem("boggle-dictionary-cache", JSON.stringify(words));
      localStorage.setItem("boggle-dictionary-version", "0.9.0");
      localStorage.setItem(
        "boggle-dictionary-cache-timestamp",
        Date.now().toString()
      );

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve("new\nwords\nhere"),
        })
      );

      const result = await service.loadDictionary();
      expect(result.source).not.toBe("cache");
    });

    it("returns existing promise if already loading", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve("casa\nmesa\nsilla"),
        })
      );

      const promise1 = service.loadDictionary();
      const promise2 = service.loadDictionary();
      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toEqual(result2);
    });

    it("filters words shorter than 3 characters", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve("ab\ncd\ncasa\nmesa"),
        })
      );

      const result = await service.loadDictionary();
      expect(result.wordsLoaded).toBe(2);
      expect(service.hasWord("ab")).toBe(false);
      expect(service.hasWord("casa")).toBe(true);
    });
  });

  describe("retry logic", () => {
    it("retries on transient failures and succeeds on later attempt", async () => {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Timeout"))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve("casa\nmesa\nsilla"),
        });
      vi.stubGlobal("fetch", mockFetch);

      const result = await service.loadDictionary();
      expect(result.success).toBe(true);
      expect(result.source).toBe("remote");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("falls back after exhausting all retry attempts", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      vi.stubGlobal("fetch", mockFetch);

      const result = await service.loadDictionary();
      expect(result.success).toBe(false);
      expect(result.source).toBe("fallback");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("forceReload", () => {
    it("clears cache and reloads", async () => {
      // First load and populate cache
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve("casa\nmesa\nsilla"),
        })
      );
      await service.loadDictionary();
      expect(service.isReady()).toBe(true);
      expect(localStorage.getItem("boggle-dictionary-cache")).not.toBeNull();

      // Force reload — should clear cache
      const result = await service.forceReload();
      expect(result.source).toBe("remote");
      // Verify cache was cleared and then re-populated
      expect(localStorage.getItem("boggle-dictionary-version")).toBe("1.0.0");
    });
  });
});
