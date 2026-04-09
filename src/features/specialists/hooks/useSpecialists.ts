import {useCallback, useEffect} from 'react';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';
import {useSupabaseQuery} from '../../../shared/hooks/useSupabaseQuery';

export function useSpecialists() {
  const query = useSupabaseQuery(
    () =>
      supabase
        .from('master_profiles')
        .select('*, profile:profiles!user_id(*)')
        .order('last_active_at', {ascending: false, nullsFirst: false})
        .order('avg_rating', {ascending: false, nullsFirst: false}),
    [],
  );

  // Realtime: обновление списка при изменении master_profiles
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
        () => query.refetch(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query.refetch]);

  return query;
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
