import {useCallback, useEffect} from 'react';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';
import {useSupabaseQuery} from '../../../shared/hooks/useSupabaseQuery';

export function useOrderResponses(orderId: string) {
  const query = useSupabaseQuery(
    () =>
      supabase
        .from('responses')
        .select('*, master:profiles!master_id(id, display_name, avatar_url, master_profile:master_profiles(avg_rating))')
        .eq('order_id', orderId)
        .order('created_at', {ascending: false}),
    [orderId],
  );

  // Realtime: новые отклики на заказ
  useEffect(() => {
    const channel = supabase
      .channel(`responses-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'responses',
          filter: `order_id=eq.${orderId}`,
        },
        () => query.refetch(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, query.refetch]);

  return query;
}

export function useMyResponses() {
  const userId = useAuthStore(s => s.session?.user.id);

  const query = useSupabaseQuery(
    () =>
      supabase
        .from('responses')
        .select('*, order:orders(*)')
        .eq('master_id', userId!)
        .order('created_at', {ascending: false}),
    [userId],
  );

  // Realtime: обновления статуса моих откликов (принят/отклонён)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`my-responses-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'responses',
          filter: `master_id=eq.${userId}`,
        },
        () => query.refetch(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, query.refetch]);

  return query;
}

export function useCreateResponse() {
  const userId = useAuthStore(s => s.session?.user.id);

  const createResponse = useCallback(
    async (orderId: string, message: string, proposedPrice?: number) => {
      if (!userId) {
        return {data: null, error: 'Not authenticated'};
      }

      const {data, error} = await supabase
        .from('responses')
        .insert({
          order_id: orderId,
          master_id: userId,
          message,
          proposed_price: proposedPrice ?? null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Уже откликнулся — не ошибка
          const {data: existing} = await supabase
            .from('responses')
            .select('*')
            .eq('order_id', orderId)
            .eq('master_id', userId)
            .single();
          return {data: existing, error: null};
        }
        return {data: null, error: error.message};
      }

      // Автосоздание чата при отклике
      const {data: order} = await supabase
        .from('orders')
        .select('client_id')
        .eq('id', orderId)
        .single();

      if (order) {
        // Проверяем, не существует ли уже чат
        const {data: existingConv} = await supabase
          .from('conversations')
          .select('id')
          .eq('order_id', orderId)
          .eq('master_id', userId)
          .maybeSingle();

        let convId = existingConv?.id;
        if (!convId) {
          const {data: newConv} = await supabase
            .from('conversations')
            .insert({
              order_id: orderId,
              client_id: order.client_id,
              master_id: userId,
              status: 'pending',
            })
            .select('id')
            .single();
          convId = newConv?.id;
        }

        // Первое сообщение — текст отклика (только для нового чата)
        if (convId && message && !existingConv) {
          await supabase.from('messages').insert({
            conversation_id: convId,
            sender_id: userId,
            text: message,
          });
        }
      }

      return {data, error: null};
    },
    [userId],
  );

  return {createResponse};
}

export function useUpdateResponseStatus() {
  const updateStatus = useCallback(
    async (responseId: string, status: string) => {
      const updates: {status: string; chat_blocked?: boolean} = {status};
      if (status === 'rejected') {
        updates.chat_blocked = true;
      }
      const {data, error} = await supabase
        .from('responses')
        .update(updates)
        .eq('id', responseId)
        .select('*, order:orders(*)')
        .single();

      if (error) {
        return {data: null, error: error.message};
      }

      // When accepting: assign master to order + reject all other pending responses
      if (status === 'accepted' && data) {
        const response = data as any;
        const orderId = response.order_id;
        const masterId = response.master_id;

        // Update order → in_progress + assigned_master_id
        await supabase
          .from('orders')
          .update({status: 'in_progress', assigned_master_id: masterId})
          .eq('id', orderId);

        // Reject all other pending responses
        await supabase
          .from('responses')
          .update({status: 'rejected', chat_blocked: true})
          .eq('order_id', orderId)
          .eq('status', 'pending')
          .neq('id', responseId);

        // Activate conversation for the accepted master
        await supabase
          .from('conversations')
          .update({status: 'active'})
          .eq('order_id', orderId)
          .eq('master_id', masterId);
      }

      return {data, error: null};
    },
    [],
  );

  return {updateStatus};
}
