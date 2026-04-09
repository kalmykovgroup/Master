import {create} from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UiState {
  loading: boolean;
  toasts: Toast[];
  orderCategoryFilters: string[];

  setLoading: (loading: boolean) => void;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  toggleCategoryFilter: (category: string) => void;
  clearCategoryFilters: () => void;
}

export const useUiStore = create<UiState>()(set => ({
  loading: false,
  toasts: [],
  orderCategoryFilters: [],

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
  toggleCategoryFilter: category =>
    set(state => ({
      orderCategoryFilters: state.orderCategoryFilters.includes(category)
        ? state.orderCategoryFilters.filter(c => c !== category)
        : [...state.orderCategoryFilters, category],
    })),
  clearCategoryFilters: () => set({orderCategoryFilters: []}),
}));
