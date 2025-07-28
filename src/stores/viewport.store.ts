import { create } from "zustand";

interface ViewportStore {
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
}

export const useViewportStore = create<ViewportStore>((set) => ({
  isMobile: false,
  setIsMobile: (isMobile: boolean) => set({ isMobile }),
}));
