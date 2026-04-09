import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useMyResponses} from '../hooks/useResponses';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import {supabase} from '../../../config/supabase';
import {formatCurrency} from '../../../shared/utils/formatCurrency';
import {formatRelative} from '../../../shared/utils/formatDate';
import type {SpecialOffer} from '../../../types/database';
import type {OrderFeedStackParamList} from '../../../types/navigation';

type Nav = NativeStackNavigationProp<OrderFeedStackParamList>;

export function MyResponsesScreen() {
  const {t, i18n} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {data, loading, refetch} = useMyResponses();
  const [specialOffers, setSpecialOffers] = useState<
    Record<string, SpecialOffer>
  >({});

  const totalCount = Array.isArray(data) ? data.length : 0;

  const loadOffers = useCallback(async () => {
    if (!data || !Array.isArray(data)) return;
    const ids = data.map((r: any) => r.id);
    if (ids.length === 0) return;
    const {data: offers} = await supabase
      .from('special_offers')
      .select('*')
      .in('response_id', ids);
    if (offers) {
      const map: Record<string, SpecialOffer> = {};
      offers.forEach((o: SpecialOffer) => {
        map[o.response_id] = o;
      });
      setSpecialOffers(map);
    }
  }, [data]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const loadOffersRef = useRef(loadOffers);
  loadOffersRef.current = loadOffers;

  if (loading && !data) {
    return <LoadingScreen />;
  }

  const STATUS_COLORS: Record<string, {bg: string; text: string}> = {
    pending: {bg: '#E5F1FF', text: '#007AFF'},
    accepted: {bg: '#E8FAE8', text: '#34C759'},
    rejected: {bg: '#FEE', text: '#FF3B30'},
  };

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <Text style={styles.title}>
          {t('orders.myResponsesCount', {count: totalCount})}
        </Text>
        <FlatList
          data={data as any[] | null}
          keyExtractor={item => item.id}
          renderItem={({item}) => {
            const statusConfig = STATUS_COLORS[item.status] ?? STATUS_COLORS.pending;
            const offer = specialOffers[item.id];
            return (
              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.orderTitle} numberOfLines={1}>
                    {item.order?.title ?? t('orders.detail')}
                  </Text>
                  <Text style={styles.date}>
                    {formatRelative(item.created_at, i18n.language)}
                  </Text>
                </View>

                <View style={styles.row}>
                  {item.proposed_price != null && (
                    <Text style={styles.price}>
                      {formatCurrency(item.proposed_price)}
                    </Text>
                  )}
                  <View style={[styles.statusBadge, {backgroundColor: statusConfig.bg}]}>
                    <Text style={[styles.statusText, {color: statusConfig.text}]}>
                      {item.status === 'accepted'
                        ? t('orders.accepted')
                        : item.status === 'rejected'
                          ? t('orders.rejected')
                          : t('orders.offerPending')}
                    </Text>
                  </View>
                </View>

                {item.message && (
                  <Text style={styles.message} numberOfLines={2}>
                    {item.message}
                  </Text>
                )}

                {offer && (
                  <View style={styles.offerRow}>
                    <Text style={styles.offerLabel}>{t('orders.specialOffer')}:</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            (STATUS_COLORS[offer.status] ?? STATUS_COLORS.pending).bg,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              (STATUS_COLORS[offer.status] ?? STATUS_COLORS.pending).text,
                          },
                        ]}>
                        {offer.status === 'accepted'
                          ? t('orders.offerAccepted')
                          : offer.status === 'rejected'
                            ? t('orders.offerRejected')
                            : t('orders.offerPending')}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState message={t('orders.noResponses')} />}
          onRefresh={() => {
            refetch();
            loadOffers();
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  list: {
    flexGrow: 1,
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  message: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  offerLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
  },
  date: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
