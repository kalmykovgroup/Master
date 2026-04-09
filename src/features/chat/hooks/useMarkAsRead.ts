import {useCallback, useEffect} from 'react';
import {supabase} from '../../../config/supabase';
import {useUnreadStore} from '../../../stores/unreadStore';

export function useMarkAsRead(conversationId: string) {
  const setCount = useUnreadStore(s => s.setCount);
  const setActiveConversation = useUnreadStore(s => s.setActiveConversation);

  // Register active conversation so unreadStore.increment skips it
  useEffect(() => {
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId, setActiveConversation]);

  const markRead = useCallback(async () => {
    setCount(conversationId, 0);
    await supabase.rpc('mark_messages_read', {p_conversation_id: conversationId});
  }, [conversationId, setCount]);

  return markRead;
}
