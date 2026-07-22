import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ChatRole = "bot" | "user" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: number;
  page?: string;
}

interface ChatbotState {
  open: boolean;
  messages: ChatMessage[];
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp"> & { id?: string; timestamp?: number }) => void;
  clearMessages: () => void;
}

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const useChatbotStore = create<ChatbotState>()(
  persist(
    (set) => ({
      open: false,
      messages: [],
      setOpen: (open) => set({ open }),
      toggleOpen: () => set((state) => ({ open: !state.open })),
      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: message.id || makeId(),
              timestamp: message.timestamp || Date.now(),
              ...message,
            },
          ],
        })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: "sih-chatbot",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        open: state.open,
        messages: state.messages,
      }),
    }
  )
);
