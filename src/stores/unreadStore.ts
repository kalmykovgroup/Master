import {create} from 'zustand';

interface UnreadState {
  counts: Record<string, number>;
  conversationStatuses: Record<string, string>;
  activeConversationId: string | null;
  setCounts: (counts: Record<string, number>, statuses: Record<string, string>) => void;
  setCount: (conversationId: string, count: number) => void;
  increment: (conversationId: string) => void;
  setActiveConversation: (id: string | null) => void;
  setConversationStatus: (conversationId: string, status: string) => void;
}

export const useUnreadStore = create<UnreadState>((set, get) => ({
  counts: {},
  conversationStatuses: {},
  activeConversationId: null,
  setCounts: (counts, statuses) => set({counts, conversationStatuses: statuses}),
  setCount: (conversationId, count) =>
    set(state => ({counts: {...state.counts, [conversationId]: count}})),
  increment: conversationId => {
    if (get().activeConversationId === conversationId) return;
    set(state => ({
      counts: {
        ...state.counts,
        [conversationId]: (state.counts[conversationId] ?? 0) + 1,
      },
    }));
  },
  setActiveConversation: id => set({activeConversationId: id}),
  setConversationStatus: (conversationId, status) =>
    set(state => ({
      conversationStatuses: {
        ...state.conversationStatuses,
        [conversationId]: status,
      },
    })),
}));
