import { describe, it, expect, beforeEach } from "vitest";
import { useModalStore, ModalType } from "../modal.store";

describe("useModalStore", () => {
  beforeEach(() => {
    useModalStore.setState({ modalType: null });
  });

  it("has null as initial modalType", () => {
    expect(useModalStore.getState().modalType).toBeNull();
  });

  it("sets modalType to Settings", () => {
    useModalStore.getState().setModalType(ModalType.Settings);
    expect(useModalStore.getState().modalType).toBe(ModalType.Settings);
  });

  it("sets modalType to Instructions", () => {
    useModalStore.getState().setModalType(ModalType.Instructions);
    expect(useModalStore.getState().modalType).toBe(ModalType.Instructions);
  });

  it("sets modalType to MaxScore", () => {
    useModalStore.getState().setModalType(ModalType.MaxScore);
    expect(useModalStore.getState().modalType).toBe(ModalType.MaxScore);
  });

  it("sets modalType to None", () => {
    useModalStore.getState().setModalType(ModalType.Settings);
    useModalStore.getState().setModalType(ModalType.None);
    expect(useModalStore.getState().modalType).toBe(ModalType.None);
  });

  it("clears modalType to null", () => {
    useModalStore.getState().setModalType(ModalType.Settings);
    useModalStore.getState().setModalType(null);
    expect(useModalStore.getState().modalType).toBeNull();
  });
});
