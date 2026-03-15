import { describe, it, expect, vi, beforeEach } from "vitest";
import { socketEmitter } from "../socket-emitter";
import { useSocketsStore } from "@/stores/sockets.store";
import type { Socket } from "socket.io-client";

function createMockSocket(emit: ReturnType<typeof vi.fn>): Socket {
  return { emit } as unknown as Socket;
}

describe("socketEmitter", () => {
  const mockEmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits get-scoreboard when socket exists", () => {
    useSocketsStore.setState({ socket: createMockSocket(mockEmit) });
    socketEmitter.emitGetScoreboard();
    expect(mockEmit).toHaveBeenCalledWith("get-scoreboard");
  });

  it("does not throw when socket is null for get-scoreboard", () => {
    useSocketsStore.setState({ socket: null } as Partial<ReturnType<typeof useSocketsStore.getState>>);
    expect(() => socketEmitter.emitGetScoreboard()).not.toThrow();
  });

  it("emits get-max-score when socket exists", () => {
    useSocketsStore.setState({ socket: createMockSocket(mockEmit) });
    socketEmitter.emitGetMaxScore();
    expect(mockEmit).toHaveBeenCalledWith("get-max-score");
  });

  it("does not throw when socket is null for get-max-score", () => {
    useSocketsStore.setState({ socket: null } as Partial<ReturnType<typeof useSocketsStore.getState>>);
    expect(() => socketEmitter.emitGetMaxScore()).not.toThrow();
  });
});
