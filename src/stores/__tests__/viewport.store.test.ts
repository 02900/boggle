import { describe, it, expect, beforeEach } from "vitest";
import { useViewportStore } from "../viewport.store";

describe("useViewportStore", () => {
  beforeEach(() => {
    useViewportStore.setState({ isMobile: false });
  });

  it("has isMobile false by default", () => {
    expect(useViewportStore.getState().isMobile).toBe(false);
  });

  it("sets isMobile to true", () => {
    useViewportStore.getState().setIsMobile(true);
    expect(useViewportStore.getState().isMobile).toBe(true);
  });

  it("sets isMobile back to false", () => {
    useViewportStore.getState().setIsMobile(true);
    useViewportStore.getState().setIsMobile(false);
    expect(useViewportStore.getState().isMobile).toBe(false);
  });
});
