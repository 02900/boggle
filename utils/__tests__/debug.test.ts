import { describe, it, expect, vi, beforeEach } from "vitest";

let mockDebugMode = true;

vi.mock("../../config/constants", () => ({
  get DEBUG_MODE() {
    return mockDebugMode;
  },
}));

import { debugLog } from "../debug";

describe("debugLog", () => {
  beforeEach(() => {
    mockDebugMode = true;
    vi.mocked(console.log).mockClear();
  });

  it("calls console.log with event name when DEBUG_MODE is true", () => {
    debugLog("test-event");

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("test-event")
    );
  });

  it("includes data in console.log when data is provided", () => {
    const data = { key: "value" };
    debugLog("test-event", data);

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("test-event"),
      data
    );
  });

  it("includes truncated socket ID when socketId is provided", () => {
    debugLog("test-event", null, "abcdefghijklmnop");

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("[Socket: abcdefgh...]")
    );
  });

  it("does not call console.log when DEBUG_MODE is false", () => {
    mockDebugMode = false;

    debugLog("test-event", { some: "data" }, "socket123456");

    expect(console.log).not.toHaveBeenCalled();
  });

  it("logs without data argument when data is not provided", () => {
    debugLog("no-data-event");

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("no-data-event")
    );
    const call = vi.mocked(console.log).mock.calls[0];
    expect(call).toHaveLength(1);
  });
});
