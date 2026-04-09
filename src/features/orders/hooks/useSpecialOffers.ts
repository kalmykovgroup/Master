import {useCallback} from 'react';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';
import {useSupabaseQuery} from '../../../shared/hooks/useSupabaseQuery';

export function useSpecialOffer(responseId: string) {
  return useSupabaseQuery(
    () => {
      if (!responseId) {
        return Promise.resolve({data: null, error: null});
      }
      return supabase
        .from('special_offers')
        .select('*')
        .eq('response_id', responseId)
        .maybeSingle();
    },
    [responseId],
  );
}

export function useSpecialOffersForOrder(orderId: string) {
  return useSupabaseQuery(
    () =>
      supabase
        .from('special_offers')
        .select('*, response:responses!response_id(order_id)')
        .eq('response.order_id', orderId),
    [orderId],
  );
}

export function useCreateSpecialOffer() {
  const userId = useAuthStore(s => s.session?.user.id);

  const createOffer = useCallback(
    async (params: {
      responseId: string;
      clientId: string;
      message: string;
      proposedPrice?: number;
    }) => {
      if (!userId) {
        return {data: null, error: 'Not authenticated'};
      }
      const {data, error} = await supabase
        .from('special_offers')
        .insert({
          response_id: params.responseId,
          master_id: userId,
          client_id: params.clientId,
          message: params.message,
          proposed_price: params.proposedPrice ?? null,
        })
        .select()
        .single();
      return {data, error: error?.message ?? null};
    },
    [userId],
  );

  return {createOffer};
}

export function useUpdateSpecialOfferStatus() {
  const updateStatus = useCallback(
    async (offerId: string, status: 'accepted' | 'rejected') => {
      const {data, error} = await supabase
        .from('special_offers')
        .update({status})
        .eq('id', offerId)
        .select()
        .single();
      return {data, error: error?.message ?? null};
    },
    [],
  );

  return {updateStatus};
}
