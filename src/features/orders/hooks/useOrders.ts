import {useCallback, useEffect} from 'react';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';
import {useSupabaseQuery} from '../../../shared/hooks/useSupabaseQuery';
import type {InsertTables} from '../../../types/database';

export function useMyOrders() {
  const userId = useAuthStore(s => s.session?.user.id);

  const query = useSupabaseQuery(
    () =>
      supabase
        .from('orders')
        .select('*, responses(id, status)')
        .eq('client_id', userId!)
        .order('created_at', {ascending: false}),
    [userId],
  );

  // Realtime: заказы + отклики + спец-предложения
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`my-orders-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `client_id=eq.${userId}`,
        },
        () => query.refetch(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'responses',
        },
        () => query.refetch(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'special_offers',
          filter: `client_id=eq.${userId}`,
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

export function useMasterOrders() {
  const userId = useAuthStore(s => s.session?.user.id);

  const query = useSupabaseQuery(
    () =>
      supabase
        .from('orders')
        .select('*')
        .eq('assigned_master_id', userId!)
        .in('status', ['in_progress', 'completed'])
        .order('created_at', {ascending: false}),
    [userId],
  );

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`master-orders-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `assigned_master_id=eq.${userId}`,
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

export function useOrderFeed(categories?: string[]) {
  const catKey = categories && categories.length > 0 ? categories.join(',') : '';
  const query = useSupabaseQuery(() => {
    let q = supabase
      .from('orders')
      .select('*')
      .in('status', ['open', 'in_progress'])
      .order('created_at', {ascending: false});
    if (categories && categories.length > 0) {
      q = q.in('category', categories);
    }
    return q;
  }, [catKey]);

  // Realtime: новые заказы в ленте
  useEffect(() => {
    const channel = supabase
      .channel('order-feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => query.refetch(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query.refetch]);

  return query;
}

export function useOrderDetail(orderId: string) {
  const query = useSupabaseQuery(
    () => supabase.from('orders').select('*').eq('id', orderId).single(),
    [orderId],
  );

  // Realtime: обновления конкретного заказа
  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
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

export function useCreateOrder() {
  const userId = useAuthStore(s => s.session?.user.id);

  const createOrder = useCallback(
    async (order: Omit<InsertTables<'orders'>, 'client_id'>) => {
      if (!userId) {
        return {data: null, error: 'Not authenticated'};
      }
      const {data, error} = await supabase
        .from('orders')
        .insert({...order, client_id: userId})
        .select()
        .single();
      return {data, error: error?.message ?? null};
    },
    [userId],
  );

  return {createOrder};
}

export function useUpdateOrderStatus() {
  const updateStatus = useCallback(
    async (orderId: string, status: string) => {
      const {data, error} = await supabase
        .from('orders')
        .update({status})
        .eq('id', orderId)
        .select()
        .single();
      return {data, error: error?.message ?? null};
    },
    [],
  );

  return {updateStatus};
}

export function useCompleteOrderMaster() {
  const userId = useAuthStore(s => s.session?.user.id);

  const completeMaster = useCallback(
    async (orderId: string) => {
      if (!userId) {
        return {data: null, error: 'Not authenticated'};
      }
      const {data, error} = await supabase
        .from('orders')
        .update({master_completed: true})
        .eq('id', orderId)
        .eq('assigned_master_id', userId)
        .select()
        .single();
      return {data, error: error?.message ?? null};
    },
    [userId],
  );

  return {completeMaster};
}

export function useCompleteOrderClient() {
  const userId = useAuthStore(s => s.session?.user.id);

  const completeClient = useCallback(
    async (orderId: string) => {
      if (!userId) {
        return {data: null, error: 'Not authenticated'};
      }
      const {data, error} = await supabase
        .from('orders')
        .update({client_completed: true, status: 'completed'})
        .eq('id', orderId)
        .eq('client_id', userId)
        .select()
        .single();
      return {data, error: error?.message ?? null};
    },
    [userId],
  );

  return {completeClient};
}

export function useUpdateOrder() {
  const updateOrder = useCallback(
    async (
      orderId: string,
      updates: {
        title?: string;
        description?: string;
        category?: string;
        budget_min?: number | null;
        budget_max?: number | null;
        location?: string | null;
      },
    ) => {
      const {data, error} = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();
      return {data, error: error?.message ?? null};
    },
    [],
  );

  return {updateOrder};
}
