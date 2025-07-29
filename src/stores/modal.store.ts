import { create } from "zustand";

export enum ModalType {
  None,
  Settings,
  Instructions,
  MaxScore,
}

interface ModalStore {
  modalType: ModalType | null;
  setModalType: (modalType: ModalType | null) => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  modalType: null,
  setModalType: (modalType: ModalType | null) => set({ modalType }),
}));
