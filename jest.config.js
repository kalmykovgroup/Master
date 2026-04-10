module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-safe-area-context|react-native-screens|react-native-mmkv|react-native-keyboard-controller|react-native-localize|@supabase)/)',
  ],
  moduleNameMapper: {
    '@hot-updater/react-native': '<rootDir>/src/shared/mocks/hot-updater.js',
  },
};
