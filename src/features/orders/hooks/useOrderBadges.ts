import {useEffect, useMemo} from 'react';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';
import {useSupabaseQuery} from '../../../shared/hooks/useSupabaseQuery';

let storage: ReturnType<typeof import('../../../config/storage').createStorage> | null = null;

function getStorage() {
  if (!storage) {
    try {
      const {createStorage} = require('../../../config/storage');
      storage = createStorage('order-badges');
    } catch {
      storage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      };
    }
  }
  return storage;
}

function getSeenIds(key: string): Set<string> {
  try {
    const raw = getStorage().getItem(key);
    if (raw) {
      return new Set(JSON.parse(raw));
    }
  } catch {}
  return new Set();
}

function saveSeenIds(key: string, ids: Set<string>) {
  try {
    getStorage().setItem(key, JSON.stringify([...ids]));
  } catch {}
}

// --- Master: new assigned orders badge ---

export function useNewMasterOrdersCount() {
  const userId = useAuthStore(s => s.session?.user.id);

  const query = useSupabaseQuery(
    () =>
      supabase
        .from('orders')
        .select('id')
        .eq('assigned_master_id', userId!)
        .eq('status', 'in_progress')
        .eq('master_completed', false),
    [userId],
  );

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`master-badge-${userId}`)
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

  const count = useMemo(() => {
    if (!query.data || !Array.isArray(query.data)) return 0;
    const seen = getSeenIds('master_seen_ids');
    return query.data.filter((o: {id: string}) => !seen.has(o.id)).length;
  }, [query.data]);

  const allIds = useMemo(() => {
    if (!query.data || !Array.isArray(query.data)) return [] as string[];
    return (query.data as {id: string}[]).map(o => o.id);
  }, [query.data]);

  return {count, allIds, refetch: query.refetch};
}

export function markMasterOrdersSeen(ids: string[]) {
  const seen = getSeenIds('master_seen_ids');
  for (const id of ids) {
    seen.add(id);
  }
  saveSeenIds('master_seen_ids', seen);
}

// --- Client: new responses badge ---

export function useNewClientResponsesCount() {
  const userId = useAuthStore(s => s.session?.user.id);

  const query = useSupabaseQuery(
    () =>
      supabase
        .from('responses')
        .select('id, order_id, status, orders!inner(client_id)')
        .eq('orders.client_id', userId!)
        .neq('status', 'rejected'),
    [userId],
  );

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`client-badge-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'responses',
        },
        () => query.refetch(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, query.refetch]);

  const count = useMemo(() => {
    if (!query.data || !Array.isArray(query.data)) return 0;
    const seen = getSeenIds('client_seen_response_ids');
    return query.data.filter((r: {id: string}) => !seen.has(r.id)).length;
  }, [query.data]);

  const allIds = useMemo(() => {
    if (!query.data || !Array.isArray(query.data)) return [] as string[];
    return (query.data as {id: string}[]).map(r => r.id);
  }, [query.data]);

  return {count, allIds, refetch: query.refetch};
}

export function markClientResponsesSeen(ids: string[]) {
  const seen = getSeenIds('client_seen_response_ids');
  for (const id of ids) {
    seen.add(id);
  }
  saveSeenIds('client_seen_response_ids', seen);
}
