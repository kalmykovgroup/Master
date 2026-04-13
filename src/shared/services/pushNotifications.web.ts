// Web no-op: push notifications are not supported on web.
// Real-time updates on web are handled by Supabase Realtime.

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function registerDeviceToken(_userId: string): Promise<void> {}

export async function unregisterDeviceToken(): Promise<void> {}

export function onTokenRefresh(_userId: string): () => void {
  return () => {};
}

export function onForegroundMessage(
  _callback: (message: {title?: string; body?: string; data?: Record<string, string>}) => void,
): () => void {
  return () => {};
}

export async function getInitialNotification(): Promise<Record<string, string> | null> {
  return null;
}

export function onNotificationOpenedApp(
  _callback: (data: Record<string, string>) => void,
): () => void {
  return () => {};
}

export function setBackgroundMessageHandler(): void {}
