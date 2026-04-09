// Platform abstraction mocks — these replace native modules for tests
const testStore = {};
jest.mock('./src/config/storage', () => ({
  createStorage: jest.fn(() => ({
    getItem: jest.fn(key => testStore[key] ?? null),
    setItem: jest.fn((key, value) => {
      testStore[key] = value;
    }),
    removeItem: jest.fn(key => {
      delete testStore[key];
    }),
  })),
}));

jest.mock('./src/config/locale', () => ({
  getDeviceLanguage: jest.fn(() => 'ru'),
}));

// Native module mocks — prevent import crashes in test env
jest.mock('react-native-mmkv', () => {
  const store = {};
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      getString: jest.fn(key => store[key]),
      set: jest.fn((key, value) => {
        store[key] = value;
      }),
      delete: jest.fn(key => {
        delete store[key];
      }),
      contains: jest.fn(key => key in store),
    })),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({children}) => React.createElement('SafeAreaProvider', null, children),
    useSafeAreaInsets: jest.fn(() => ({top: 0, bottom: 0, left: 0, right: 0})),
  };
});

jest.mock('react-native-localize', () => ({
  getLocales: jest.fn(() => [{languageCode: 'ru', countryCode: 'RU'}]),
}));

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

jest.mock('react-native-keyboard-controller', () => ({
  KeyboardProvider: ({children}) => children,
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(() => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    })),
    useRoute: jest.fn(() => ({params: {}})),
    NavigationContainer: ({children}) => children,
  };
});

jest.mock('./src/config/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn().mockResolvedValue({data: {session: null}}),
      onAuthStateChange: jest.fn(() => ({
        data: {subscription: {unsubscribe: jest.fn()}},
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({data: null, error: null}),
      order: jest.fn().mockResolvedValue({data: [], error: null}),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({error: null}),
        getPublicUrl: jest.fn(() => ({data: {publicUrl: 'https://example.com/avatar.jpg'}})),
      })),
    },
  },
}));
