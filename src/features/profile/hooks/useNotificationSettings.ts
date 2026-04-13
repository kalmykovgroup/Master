import {useState, useEffect, useCallback} from 'react';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';
import type {NotificationSettings} from '../../../types/database';

type SettingKey = keyof Pick<
  NotificationSettings,
  | 'response_received'
  | 'master_completed'
  | 'special_offer'
  | 'response_accepted'
  | 'response_rejected'
  | 'client_completed'
  | 'new_message'
>;

export function useNotificationSettings() {
  const userId = useAuthStore(s => s.session?.user?.id);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({data, error}) => {
        if (!error && data) {
          setSettings(data as NotificationSettings);
        }
        setLoading(false);
      });
  }, [userId]);

  const toggle = useCallback(
    async (key: SettingKey) => {
      if (!settings || !userId) return;

      const newValue = !settings[key];

      // Optimistic update
      setSettings(prev => (prev ? {...prev, [key]: newValue} : prev));

      const {error} = await supabase
        .from('notification_settings')
        .update({[key]: newValue, updated_at: new Date().toISOString()})
        .eq('user_id', userId);

      if (error) {
        // Revert on error
        setSettings(prev => (prev ? {...prev, [key]: !newValue} : prev));
      }
    },
    [settings, userId],
  );

  return {settings, loading, toggle};
}
