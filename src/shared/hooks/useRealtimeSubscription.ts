import {useEffect} from 'react';
import {supabase} from '../../config/supabase';

type Event = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionOptions {
  channelName: string;
  table: string;
  event?: Event;
  filter?: string;
  onData: (payload: any) => void;
}

export function useRealtimeSubscription({
  channelName,
  table,
  event = '*',
  filter,
  onData,
}: SubscriptionOptions) {
  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          ...(filter ? {filter} : {}),
        },
        payload => onData(payload),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, table, event, filter, onData]);
}
