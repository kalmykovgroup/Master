import {useAuthStore} from '../../src/stores/authStore';

jest.mock('react-native-mmkv', () => {
  const store: Record<string, string> = {};
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      getString: jest.fn((key: string) => store[key]),
      set: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      delete: jest.fn((key: string) => {
        delete store[key];
      }),
    })),
  };
});

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.role).toBeNull();
    expect(state.initialized).toBe(false);
  });

  it('sets session', () => {
    const mockSession = {user: {id: '123'}} as any;
    useAuthStore.getState().setSession(mockSession);
    expect(useAuthStore.getState().session).toBe(mockSession);
  });

  it('sets profile and derives role', () => {
    const mockProfile = {id: '123', role: 'client'} as any;
    useAuthStore.getState().setProfile(mockProfile);
    expect(useAuthStore.getState().profile).toBe(mockProfile);
    expect(useAuthStore.getState().role).toBe('client');
  });

  it('sets role directly', () => {
    useAuthStore.getState().setRole('master');
    expect(useAuthStore.getState().role).toBe('master');
  });

  it('sets initialized', () => {
    useAuthStore.getState().setInitialized(true);
    expect(useAuthStore.getState().initialized).toBe(true);
  });

  it('resets all state', () => {
    useAuthStore.getState().setSession({user: {id: '123'}} as any);
    useAuthStore.getState().setRole('client');
    useAuthStore.getState().reset();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().role).toBeNull();
  });
});
