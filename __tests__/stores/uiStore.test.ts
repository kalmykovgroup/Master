import {useUiStore} from '../../src/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({loading: false, toasts: [], orderCategoryFilter: null});
  });

  it('has correct initial state', () => {
    const state = useUiStore.getState();
    expect(state.loading).toBe(false);
    expect(state.toasts).toEqual([]);
    expect(state.orderCategoryFilter).toBeNull();
  });

  it('sets loading', () => {
    useUiStore.getState().setLoading(true);
    expect(useUiStore.getState().loading).toBe(true);
  });

  it('adds toast', () => {
    useUiStore.getState().addToast('Test message', 'success');
    const toasts = useUiStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Test message');
    expect(toasts[0].type).toBe('success');
  });

  it('removes toast', () => {
    useUiStore.getState().addToast('Test');
    const id = useUiStore.getState().toasts[0].id;
    useUiStore.getState().removeToast(id);
    expect(useUiStore.getState().toasts).toHaveLength(0);
  });

  it('sets category filter', () => {
    useUiStore.getState().setOrderCategoryFilter('plumbing');
    expect(useUiStore.getState().orderCategoryFilter).toBe('plumbing');
  });
});
