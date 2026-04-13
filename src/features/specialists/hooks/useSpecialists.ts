import {useCallback, useEffect, useRef, useState} from 'react';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';

const PAGE_SIZE = 20;
const REFETCH_INTERVAL = 60_000;

interface SpecialistsState {
  data: any[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
}

export function useSpecialists() {
  const [state, setState] = useState<SpecialistsState>({
    data: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    error: null,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const fetchRange = useCallback(async (from: number, to: number) => {
    const {data, error} = await supabase
      .from('master_profiles')
      .select('*, profile:profiles!user_id!inner(*)')
      .eq('profile.role', 'master')
      .order('last_active_at', {ascending: false, nullsFirst: false})
      .order('avg_rating', {ascending: false, nullsFirst: false})
      .range(from, to);
    return {data, error};
  }, []);

  const refetch = useCallback(async () => {
    const loadedCount = Math.max(stateRef.current.data.length, PAGE_SIZE);
    setState(prev => ({...prev, loading: true, error: null}));
    const {data, error} = await fetchRange(0, loadedCount - 1);
    setState({
      data: data ?? [],
      loading: false,
      loadingMore: false,
      hasMore: (data?.length ?? 0) >= loadedCount,
      error: error?.message ?? null,
    });
  }, [fetchRange]);

  const loadMore = useCallback(async () => {
    const {loadingMore, hasMore, loading, data} = stateRef.current;
    if (loadingMore || !hasMore || loading) return;

    setState(prev => ({...prev, loadingMore: true}));
    const from = data.length;
    const to = from + PAGE_SIZE - 1;
    const {data: newData, error} = await fetchRange(from, to);

    setState(prev => ({
      ...prev,
      data: [...prev.data, ...(newData ?? [])],
      loadingMore: false,
      hasMore: (newData?.length ?? 0) >= PAGE_SIZE,
      error: error?.message ?? prev.error,
    }));
  }, [fetchRange]);

  // Stable ref for interval and realtime callbacks
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  // Initial load
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Periodic refetch every 60s
  useEffect(() => {
    const id = setInterval(() => refetchRef.current(), REFETCH_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('specialists-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'master_profiles',
        },
        () => refetchRef.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    loadingMore: state.loadingMore,
    hasMore: state.hasMore,
    error: state.error,
    loadMore,
    refetch,
  };
}

export function useUpdateActivity() {
  const userId = useAuthStore(s => s.session?.user.id);

  const updateActivity = useCallback(async () => {
    if (!userId) {
      return {error: 'Not authenticated'};
    }
    const now = new Date().toISOString();
    const {data, error} = await supabase
      .from('master_profiles')
      .update({last_active_at: now})
      .eq('user_id', userId)
      .select()
      .single();
    if (data) {
      useAuthStore.getState().setMasterProfile(data);
    }
    return {data, error: error?.message ?? null};
  }, [userId]);

  return {updateActivity};
}
