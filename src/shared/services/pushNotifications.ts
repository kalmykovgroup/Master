import messaging from '@react-native-firebase/messaging';
import {Platform, PermissionsAndroid} from 'react-native';
import {supabase} from '../../config/supabase';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
  }

  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function registerDeviceToken(userId: string): Promise<void> {
  try {
    const token = await messaging().getToken();
    if (!token) return;

    const platform = Platform.OS as 'android' | 'ios';

    await supabase.from('device_tokens').upsert(
      {user_id: userId, token, platform},
      {onConflict: 'user_id,token'},
    );
  } catch (err) {
    console.warn('registerDeviceToken error:', err);
  }
}

export async function unregisterDeviceToken(): Promise<void> {
  try {
    const token = await messaging().getToken();
    if (!token) return;

    await supabase.from('device_tokens').delete().eq('token', token);
  } catch (err) {
    console.warn('unregisterDeviceToken error:', err);
  }
}

export function onTokenRefresh(userId: string): () => void {
  return messaging().onTokenRefresh(async newToken => {
    try {
      const platform = Platform.OS as 'android' | 'ios';
      await supabase.from('device_tokens').upsert(
        {user_id: userId, token: newToken, platform},
        {onConflict: 'user_id,token'},
      );
    } catch (err) {
      console.warn('onTokenRefresh error:', err);
    }
  });
}

export function onForegroundMessage(
  callback: (message: {title?: string; body?: string; data?: Record<string, string>}) => void,
): () => void {
  return messaging().onMessage(async remoteMessage => {
    callback({
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
      data: remoteMessage.data as Record<string, string> | undefined,
    });
  });
}

export async function getInitialNotification(): Promise<Record<string, string> | null> {
  const message = await messaging().getInitialNotification();
  return (message?.data as Record<string, string>) ?? null;
}

export function onNotificationOpenedApp(
  callback: (data: Record<string, string>) => void,
): () => void {
  return messaging().onNotificationOpenedApp(remoteMessage => {
    if (remoteMessage.data) {
      callback(remoteMessage.data as Record<string, string>);
    }
  });
}

export function setBackgroundMessageHandler(): void {
  messaging().setBackgroundMessageHandler(async _remoteMessage => {
    // Handled by OS notification tray
  });
}
