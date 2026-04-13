/**
 * @format
 */

import { AppRegistry, Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

if (Platform.OS !== 'web') {
  const { setBackgroundMessageHandler } = require('./src/shared/services/pushNotifications');
  setBackgroundMessageHandler();
}

AppRegistry.registerComponent(appName, () => App);
