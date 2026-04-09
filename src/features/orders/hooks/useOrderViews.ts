import {useCallback, useEffect, useRef, useState} from 'react';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';

/**
 * Returns a Set of order IDs the current user has viewed.
 * Also provides recordView() to mark an order as viewed.
 */
export function useOrderViews() {
  const userId = useAuthStore(s => s.session?.user.id);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!userId) return;
    const {data} = await supabase
      .from('order_views')
      .select('order_id')
      .eq('user_id', userId);
    if (data) {
      setViewedIds(new Set(data.map(d => d.order_id)));
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const recordView = useCallback(
    async (orderId: string) => {
      if (!userId) return;
      // Optimistic update
      setViewedIds(prev => new Set(prev).add(orderId));
      await supabase
        .from('order_views')
        .upsert({user_id: userId, order_id: orderId, viewed_at: new Date().toISOString()})
        .select();
    },
    [userId],
  );

  return {viewedIds, recordView, refetch: load};
}

export type DetailedStatus =
  | 'sent'
  | 'reviewing'
  | 'client_wrote'
  | 'accepted'
  | 'rejected';

interface ResponseInfo {
  status: string;
  detailedStatus: DetailedStatus;
  hasSpecialOffer: boolean;
}

/**
 * Returns a map of orderId → {status, detailedStatus, hasSpecialOffer} for the master's responses.
 */
export function useMasterResponseMap() {
  const userId = useAuthStore(s => s.session?.user.id);
  const [responseMap, setResponseMap] = useState<
    Record<string, ResponseInfo>
  >({});
  const [totalCount, setTotalCount] = useState(0);

  const load = useCallback(async () => {
    if (!userId) return;
    // 1. Get responses with special offers
    const {data: responses} = await supabase
      .from('responses')
      .select('order_id, status, special_offers(id)')
      .eq('master_id', userId);
    if (!responses) return;

    // 2. Get conversations for this master's orders
    const orderIds = responses.map((r: any) => r.order_id);
    const {data: convos} = await supabase
      .from('conversations')
      .select('id, order_id')
      .eq('master_id', userId)
      .in('order_id', orderIds);

    // 3. Check which conversations have client messages
    let clientMsgConvoIds = new Set<string>();
    if (convos && convos.length > 0) {
      const convoIds = convos.map(c => c.id);
      const {data: msgs} = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convoIds)
        .neq('sender_id', userId);
      if (msgs) {
        clientMsgConvoIds = new Set(msgs.map(m => m.conversation_id));
      }
    }

    // Build convo lookup by order_id
    const convoByOrder = new Map<string, string>();
    if (convos) {
      convos.forEach(c => convoByOrder.set(c.order_id, c.id));
    }

    const map: Record<string, ResponseInfo> = {};
    responses.forEach((r: any) => {
      let detailedStatus: DetailedStatus;
      if (r.status === 'accepted') {
        detailedStatus = 'accepted';
      } else if (r.status === 'rejected') {
        detailedStatus = 'rejected';
      } else {
        const convoId = convoByOrder.get(r.order_id);
        if (!convoId) {
          detailedStatus = 'sent';
        } else if (clientMsgConvoIds.has(convoId)) {
          detailedStatus = 'client_wrote';
        } else {
          detailedStatus = 'reviewing';
        }
      }
      map[r.order_id] = {
        status: r.status,
        detailedStatus,
        hasSpecialOffer:
          Array.isArray(r.special_offers) && r.special_offers.length > 0,
      };
    });
    setResponseMap(map);
    setTotalCount(responses.length);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime for responses updates
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`master-responses-map-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'responses',
          filter: `master_id=eq.${userId}`,
        },
        () => loadRef.current(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'special_offers',
          filter: `master_id=eq.${userId}`,
        },
        () => loadRef.current(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `master_id=eq.${userId}`,
        },
        () => loadRef.current(),
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => loadRef.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {responseMap, totalCount, refetch: load};
}
