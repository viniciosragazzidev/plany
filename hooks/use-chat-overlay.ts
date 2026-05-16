import { create } from 'zustand';

interface ChatOverlayState {
  isOpen: boolean;
  isMaximized: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleMaximize: () => void;
  toggleChat: () => void;
}

export const useChatOverlay = create<ChatOverlayState>((set) => ({
  isOpen: false,
  isMaximized: false,
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false, isMaximized: false }),
  toggleMaximize: () => set((state) => ({ isMaximized: !state.isMaximized })),
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen, isMaximized: state.isOpen ? false : state.isMaximized })),
}));
