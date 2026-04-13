import {useEffect, useRef} from 'react';
import {useNavigation} from '@react-navigation/native';
import {useAuthStore} from '../../stores/authStore';
import {
  requestNotificationPermission,
  registerDeviceToken,
  onTokenRefresh,
  onForegroundMessage,
  getInitialNotification,
  onNotificationOpenedApp,
} from '../services/pushNotifications';

function navigateByPushData(
  navigation: any,
  data: Record<string, string>,
) {
  const eventType = data.event_type;

  if (data.conversationId) {
    navigation.navigate('MainTabs', {
      screen: 'ChatsTab',
      params: {screen: 'Chat', params: {conversationId: data.conversationId}},
    });
    return;
  }

  if (data.orderId) {
    if (
      eventType === 'response_accepted' ||
      eventType === 'response_rejected' ||
      eventType === 'client_completed'
    ) {
      navigation.navigate('MainTabs', {
        screen: 'MasterOrdersTab',
        params: {screen: 'OrderDetail', params: {orderId: data.orderId}},
      });
    } else {
      navigation.navigate('MainTabs', {
        screen: 'MyOrdersTab',
        params: {screen: 'OrderDetail', params: {orderId: data.orderId}},
      });
    }
  }
}

export function usePushNotifications() {
  const session = useAuthStore(s => s.session);
  const navigation = useNavigation();
  const initialHandled = useRef(false);

  useEffect(() => {
    if (!session?.user?.id) return;

    const userId = session.user.id;

    (async () => {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      await registerDeviceToken(userId);
    })();

    const unsubRefresh = onTokenRefresh(userId);

    const unsubForeground = onForegroundMessage(_msg => {
      // In foreground, the notification is shown by iOS natively.
      // On Android, FCM shows it automatically via notification channel.
      // No extra handling needed — Realtime handles data updates.
    });

    const unsubOpened = onNotificationOpenedApp(data => {
      navigateByPushData(navigation, data);
    });

    // Cold start: check initial notification
    if (!initialHandled.current) {
      initialHandled.current = true;
      getInitialNotification().then(data => {
        if (data) {
          navigateByPushData(navigation, data);
        }
      });
    }

    return () => {
      unsubRefresh();
      unsubForeground();
      unsubOpened();
    };
  }, [session?.user?.id, navigation]);
}
