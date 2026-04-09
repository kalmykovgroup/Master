import {useEffect, useRef} from 'react';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';
import {useSupabaseQuery} from '../../../shared/hooks/useSupabaseQuery';

let channelCounter = 0;

export function useConversations() {
  const userId = useAuthStore(s => s.session?.user.id);
  const role = useAuthStore(s => s.role);
  const channelId = useRef(++channelCounter);

  const query = useSupabaseQuery(() => {
    const column = role === 'client' ? 'client_id' : 'master_id';
    return supabase
      .from('conversations')
      .select(
        '*, client:profiles!client_id(*), master:profiles!master_id(*), order:orders!order_id(title)',
      )
      .eq(column, userId!)
      .order('last_message_at', {ascending: false, nullsFirst: false});
  }, [userId, role]);

  // Realtime: обновление списка при новом сообщении (last_message_at меняется)
  useEffect(() => {
    if (!userId) return;
    const column = role === 'client' ? 'client_id' : 'master_id';
    const channel = supabase
      .channel(`conversations-${userId}-${channelId.current}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `${column}=eq.${userId}`,
        },
        () => query.refetch(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, role, query.refetch]);

  return query;
}

export function useGetOrCreateConversation() {
  const userId = useAuthStore(s => s.session?.user.id);
  const role = useAuthStore(s => s.role);

  const getOrCreate = async (orderId: string, otherUserId: string) => {
    const clientId = role === 'client' ? userId! : otherUserId;
    const masterId = role === 'master' ? userId! : otherUserId;

    const {data: existing} = await supabase
      .from('conversations')
      .select('*')
      .eq('order_id', orderId)
      .eq('master_id', masterId)
      .single();

    if (existing) {
      return {data: existing, isNew: false, error: null};
    }

    const {data, error} = await supabase
      .from('conversations')
      .insert({order_id: orderId, client_id: clientId, master_id: masterId})
      .select()
      .single();

    return {data, isNew: true, error: error?.message ?? null};
  };

  return {getOrCreate};
}

export async function fetchLastMessage(conversationId: string) {
  const {data} = await supabase
    .from('messages')
    .select('text')
    .eq('conversation_id', conversationId)
    .order('created_at', {ascending: false})
    .limit(1)
    .single();
  return data?.text ?? null;
}
