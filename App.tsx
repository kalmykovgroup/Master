import React, {useState} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {HotUpdater} from '@hot-updater/react-native';
import {ErrorBoundary} from './src/shared/components/ErrorBoundary';
import {RootNavigator} from './src/navigation/RootNavigator';
import {UpdateDialog} from './src/shared/components/UpdateDialog';
import {useVersionCheck} from './src/shared/hooks/useVersionCheck';
import {SUPABASE_URL} from './src/config/supabase';
import './src/i18n';

function AppContent() {
  const {updateType, storeUrl, latestVersion} = useVersionCheck();
  const [dismissed, setDismissed] = useState(false);
  const showDialog = updateType && !(updateType === 'optional' && dismissed);

  return (
    <>
      <RootNavigator />
      {showDialog && storeUrl && latestVersion && (
        <UpdateDialog
          updateType={updateType}
          storeUrl={storeUrl}
          latestVersion={latestVersion}
          onDismiss={() => setDismissed(true)}
        />
      )}
    </>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default HotUpdater.wrap(App, {
  baseURL: SUPABASE_URL + '/functions/v1/check-update',
  updateStrategy: 'appVersion',
});
