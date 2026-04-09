import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ErrorBoundary} from './src/shared/components/ErrorBoundary';
import {RootNavigator} from './src/navigation/RootNavigator';
import './src/i18n';

function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <RootNavigator />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default App;
