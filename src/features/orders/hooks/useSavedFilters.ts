import {useCallback} from 'react';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';
import {useSupabaseQuery} from '../../../shared/hooks/useSupabaseQuery';
import type {SavedFilter} from '../../../types/database';

export function useSavedFilters() {
  const userId = useAuthStore(s => s.session?.user.id);

  const query = useSupabaseQuery(
    () =>
      supabase
        .from('saved_filters')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', {ascending: true}),
    [userId],
  );

  const filters = (query.data as SavedFilter[] | null) ?? [];
  const activeFilters = filters.filter(f => f.is_active);

  const createFilter = useCallback(
    async (data: {
      name: string;
      categories: string[];
      budget_min: number | null;
      budget_max: number | null;
      location: string | null;
    }) => {
      if (!userId) return {error: 'Not authenticated'};
      const {error} = await supabase.from('saved_filters').insert({
        user_id: userId,
        name: data.name,
        categories: data.categories,
        budget_min: data.budget_min,
        budget_max: data.budget_max,
        location: data.location,
      });
      if (!error) query.refetch();
      return {error: error?.message ?? null};
    },
    [userId, query.refetch],
  );

  const toggleFilter = useCallback(
    async (id: string, isActive: boolean) => {
      const {error} = await supabase
        .from('saved_filters')
        .update({is_active: isActive})
        .eq('id', id);
      if (!error) query.refetch();
      return {error: error?.message ?? null};
    },
    [query.refetch],
  );

  const deleteFilter = useCallback(
    async (id: string) => {
      const {error} = await supabase
        .from('saved_filters')
        .delete()
        .eq('id', id);
      if (!error) query.refetch();
      return {error: error?.message ?? null};
    },
    [query.refetch],
  );

  return {
    filters,
    activeFilters,
    loading: query.loading,
    refetch: query.refetch,
    createFilter,
    toggleFilter,
    deleteFilter,
  };
}
