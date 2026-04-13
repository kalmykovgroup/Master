import {create} from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UiState {
  loading: boolean;
  toasts: Toast[];

  setLoading: (loading: boolean) => void;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>()(set => ({
  loading: false,
  toasts: [],

  setLoading: loading => set({loading}),
  addToast: (message, type = 'info') =>
    set(state => ({
      toasts: [
        ...state.toasts,
        {id: Date.now().toString(), message, type},
      ],
    })),
  removeToast: id =>
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    })),
}));
