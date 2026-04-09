import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FlatList, StyleSheet, Text, View, Pressable} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useOrderResponses, useUpdateResponseStatus} from '../hooks/useResponses';
import {useGetOrCreateConversation} from '../../chat/hooks/useConversations';
import {useUpdateSpecialOfferStatus} from '../hooks/useSpecialOffers';
import {ResponseListItem} from '../components/ResponseListItem';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import {supabase} from '../../../config/supabase';
import type {Message} from '../../../types/database';
import type {ClientOrdersStackParamList, UnifiedTabParamList} from '../../../types/navigation';
import type {SpecialOffer} from '../../../types/database';

type RouteType = RouteProp<ClientOrdersStackParamList, 'ResponsesList'>;
type Nav = NativeStackNavigationProp<ClientOrdersStackParamList, 'ResponsesList'>;

export function ResponsesListScreen() {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteType>();
  const navigation = useNavigation<Nav>();
  const {orderId, orderTitle} = route.params;
  const {data: responses, loading, refetch} = useOrderResponses(orderId);
  const {updateStatus} = useUpdateResponseStatus();
  const {getOrCreate} = useGetOrCreateConversation();
  const {updateStatus: updateOfferStatus} = useUpdateSpecialOfferStatus();
  const [specialOffers, setSpecialOffers] = useState<Record<string, SpecialOffer>>({});

  // Load special offers for all responses
  const loadSpecialOffers = useCallback(async () => {
    if (!responses || !Array.isArray(responses)) return;
    const responseIds = responses.map((r: any) => r.id);
    if (responseIds.length === 0) return;
    const {data} = await supabase
      .from('special_offers')
      .select('*')
      .in('response_id', responseIds);
    if (data) {
      const map: Record<string, SpecialOffer> = {};
      data.forEach((offer: SpecialOffer) => {
        map[offer.response_id] = offer;
      });
      setSpecialOffers(map);
    }
  }, [responses]);

  useEffect(() => {
    loadSpecialOffers();
  }, [loadSpecialOffers]);

  // Stable refs for realtime callback
  const loadSpecialOffersRef = useRef(loadSpecialOffers);
  loadSpecialOffersRef.current = loadSpecialOffers;

  // Realtime: спец-предложения обновляются в реальном времени
  useEffect(() => {
    const channel = supabase
      .channel(`special-offers-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'special_offers',
        },
        () => {
          loadSpecialOffersRef.current();
          refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, refetch]);

  const handleChat = async (masterId: string, responseMessage?: string | null) => {
    const {data: conv, isNew} = await getOrCreate(orderId, masterId);
    if (conv) {
      if (isNew && responseMessage) {
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: masterId,
          text: responseMessage,
        });
      }
      const tabNav = navigation.getParent<NativeStackNavigationProp<UnifiedTabParamList>>();
      tabNav?.navigate('ChatsTab', {
        screen: 'Chat',
        params: {conversationId: conv.id, title: orderTitle},
      });
    }
  };

  const handleAccept = async (responseId: string) => {
    await updateStatus(responseId, 'accepted');
    refetch();
  };

  const handleReject = async (responseId: string) => {
    await updateStatus(responseId, 'rejected');
    refetch();
  };

  const handleAcceptOffer = async (offerId: string) => {
    await updateOfferStatus(offerId, 'accepted');
    loadSpecialOffers();
  };

  const handleRejectOffer = async (offerId: string) => {
    await updateOfferStatus(offerId, 'rejected');
    loadSpecialOffers();
  };

  if (loading && !responses) {
    return <LoadingScreen />;
  }

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>{'\u2190'}</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {orderTitle}
          </Text>
        </View>
        <FlatList
          data={responses as any[] | null}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <ResponseListItem
              response={item}
              specialOffer={specialOffers[item.id]}
              onPress={() =>
                navigation.navigate('SpecialistProfile', {
                  userId: item.master_id,
                })
              }
              onChat={() => handleChat(item.master_id, item.message)}
              onAccept={() => handleAccept(item.id)}
              onReject={() => handleReject(item.id)}
              onAcceptOffer={() => {
                const offer = specialOffers[item.id];
                if (offer) handleAcceptOffer(offer.id);
              }}
              onRejectOffer={() => {
                const offer = specialOffers[item.id];
                if (offer) handleRejectOffer(offer.id);
              }}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState message={t('orders.noResponses')} />}
          onRefresh={() => {
            refetch();
            loadSpecialOffers();
          }}
          refreshing={loading}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  backText: {
    fontSize: 24,
    color: '#000000',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
});
