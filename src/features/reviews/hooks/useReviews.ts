import {useCallback} from 'react';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';
import {useSupabaseQuery} from '../../../shared/hooks/useSupabaseQuery';

export function useReviews(userId: string) {
  return useSupabaseQuery(
    () =>
      supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviewer_id(*)')
        .eq('reviewee_id', userId)
        .order('created_at', {ascending: false}),
    [userId],
  );
}

export function useCreateReview() {
  const currentUserId = useAuthStore(s => s.session?.user.id);

  const createReview = useCallback(
    async (orderId: string, revieweeId: string, rating: number, comment: string) => {
      if (!currentUserId) {
        return {data: null, error: 'Not authenticated'};
      }
      const {data, error} = await supabase
        .from('reviews')
        .insert({
          order_id: orderId,
          reviewer_id: currentUserId,
          reviewee_id: revieweeId,
          rating,
          comment: comment || null,
        })
        .select()
        .single();
      return {data, error: error?.message ?? null};
    },
    [currentUserId],
  );

  return {createReview};
}
