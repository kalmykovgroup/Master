import {create} from 'zustand';

interface UnreadState {
  counts: Record<string, number>;
  activeConversationId: string | null;
  setCounts: (counts: Record<string, number>) => void;
  setCount: (conversationId: string, count: number) => void;
  increment: (conversationId: string) => void;
  setActiveConversation: (id: string | null) => void;
}

export const useUnreadStore = create<UnreadState>((set, get) => ({
  counts: {},
  activeConversationId: null,
  setCounts: counts => set({counts}),
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
}));
