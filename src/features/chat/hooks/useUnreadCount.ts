import {useCallback, useEffect, useRef} from 'react';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';
import {useUnreadStore} from '../../../stores/unreadStore';

export function useUnreadCount() {
  const userId = useAuthStore(s => s.session?.user.id);
  const counts = useUnreadStore(s => s.counts);
  const statuses = useUnreadStore(s => s.conversationStatuses);
  const setCounts = useUnreadStore(s => s.setCounts);
  const increment = useUnreadStore(s => s.increment);

  const fetchCounts = useCallback(async () => {
    const {data} = await supabase.rpc('get_unread_counts');
    if (data) {
      const countMap: Record<string, number> = {};
      const statusMap: Record<string, string> = {};
      for (const row of data) {
        countMap[row.conversation_id] = row.unread_count;
        statusMap[row.conversation_id] = row.conversation_status;
      }
      setCounts(countMap, statusMap);
    }
  }, [setCounts]);

  // Fetch on mount
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Realtime: listen for new messages to increment counts
  const incrementRef = useRef(increment);
  incrementRef.current = increment;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('unread-counts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        payload => {
          const msg = payload.new as {sender_id: string; conversation_id: string};
          if (msg.sender_id !== userIdRef.current) {
            incrementRef.current(msg.conversation_id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  let activeTotal = 0;
  let archivedTotal = 0;
  for (const [convId, count] of Object.entries(counts)) {
    const status = statuses[convId];
    if (status === 'archived') {
      archivedTotal += count;
    } else {
      activeTotal += count;
    }
  }

  return {activeTotal, archivedTotal, counts};
}
