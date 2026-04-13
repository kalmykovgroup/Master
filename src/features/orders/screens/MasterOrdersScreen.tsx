import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useMasterOrders} from '../hooks/useOrders';
import {useMyResponses} from '../hooks/useResponses';
import {markMasterOrdersSeen} from '../hooks/useOrderBadges';
import {OrderCard} from '../components/OrderCard';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import {supabase} from '../../../config/supabase';
import {formatCurrency} from '../../../shared/utils/formatCurrency';
import {formatRelative} from '../../../shared/utils/formatDate';
import type {SpecialOffer, Order} from '../../../types/database';
import type {MasterOrdersStackParamList} from '../../../types/navigation';

type Nav = NativeStackNavigationProp<MasterOrdersStackParamList, 'MasterOrders'>;
type Tab = 'responses' | 'in_progress' | 'completed';

const MASTER_STATUS_COLORS: Record<string, {bg: string; text: string; key: string}> = {
  in_progress: {bg: '#007AFF', text: '#FFFFFF', key: 'orders.statusInProgress'},
  not_confirmed: {bg: '#8E8E93', text: '#FFFFFF', key: 'orders.statusNotConfirmed'},
  completed: {bg: '#34C759', text: '#FFFFFF', key: 'orders.statusCompleted'},
};

const RESPONSE_STATUS_COLORS: Record<string, {bg: string; text: string}> = {
  pending: {bg: '#E5F1FF', text: '#007AFF'},
  accepted: {bg: '#E8FAE8', text: '#34C759'},
  rejected: {bg: '#FEE', text: '#FF3B30'},
};

function getMasterStatus(order: Order): string {
  if (order.status === 'in_progress' && !order.master_completed) {
    return 'in_progress';
  }
  if (order.status === 'in_progress' && order.master_completed && !order.client_completed) {
    return 'not_confirmed';
  }
  return 'completed';
}

export function MasterOrdersScreen() {
  const {t, i18n} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {data: ordersData, loading: ordersLoading, refetch: refetchOrders} = useMasterOrders();
  const {data: responsesData, loading: responsesLoading, refetch: refetchResponses} = useMyResponses();
  const [tab, setTab] = useState<Tab>('responses');
  const [specialOffers, setSpecialOffers] = useState<Record<string, SpecialOffer>>({});

  useFocusEffect(
    useCallback(() => {
      if (!ordersData || !Array.isArray(ordersData)) return;
      const ids = (ordersData as Order[]).map(o => o.id);
      if (ids.length > 0) {
        markMasterOrdersSeen(ids);
      }
    }, [ordersData]),
  );

  const loadOffers = useCallback(async () => {
    if (!responsesData || !Array.isArray(responsesData)) return;
    const ids = responsesData.map((r: any) => r.id);
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
  }, [responsesData]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const loadOffersRef = useRef(loadOffers);
  loadOffersRef.current = loadOffers;

  const filteredOrders = useMemo(() => {
    if (!ordersData) return [];
    const orders = ordersData as Order[];
    if (tab === 'in_progress') {
      return orders.filter(o => o.status === 'in_progress' && !o.master_completed);
    }
    if (tab === 'completed') {
      return orders.filter(
        o => (o.status === 'in_progress' && o.master_completed) || o.status === 'completed',
      );
    }
    return [];
  }, [ordersData, tab]);

  const loading = tab === 'responses' ? responsesLoading : ordersLoading;
  const isInitialLoading =
    (tab === 'responses' && responsesLoading && !responsesData) ||
    (tab !== 'responses' && ordersLoading && !ordersData);

  if (isInitialLoading) {
    return <LoadingScreen />;
  }

  const tabs: {key: Tab; label: string}[] = [
    {key: 'responses', label: t('tabs.responses')},
    {key: 'in_progress', label: t('orders.filterInProgress')},
    {key: 'completed', label: t('orders.filterCompleted')},
  ];

  const handleRefresh = () => {
    if (tab === 'responses') {
      refetchResponses();
      loadOffersRef.current();
    } else {
      refetchOrders();
    }
  };

  const renderResponseItem = ({item}: {item: any}) => {
    const statusConfig = RESPONSE_STATUS_COLORS[item.status] ?? RESPONSE_STATUS_COLORS.pending;
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
                {backgroundColor: (RESPONSE_STATUS_COLORS[offer.status] ?? RESPONSE_STATUS_COLORS.pending).bg},
              ]}>
              <Text
                style={[
                  styles.statusText,
                  {color: (RESPONSE_STATUS_COLORS[offer.status] ?? RESPONSE_STATUS_COLORS.pending).text},
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
  };

  const renderOrderItem = ({item}: {item: Order}) => {
    const masterStatus = getMasterStatus(item);
    const statusConfig = MASTER_STATUS_COLORS[masterStatus];
    return (
      <OrderCard
        order={item}
        onPress={() => navigation.navigate('OrderDetail', {orderId: item.id})}
        statusLabel={statusConfig ? t(statusConfig.key) : undefined}
        statusColor={statusConfig?.bg}
      />
    );
  };

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('tabs.responses')}</Text>
        </View>
        <View style={styles.filters}>
          {tabs.map(f => (
            <Pressable
              key={f.key}
              style={[styles.chip, tab === f.key && styles.chipActive]}
              onPress={() => setTab(f.key)}>
              <Text style={[styles.chipText, tab === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {tab === 'responses' ? (
          <FlatList
            data={responsesData as any[] | null}
            keyExtractor={item => item.id}
            renderItem={renderResponseItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<EmptyState message={t('orders.noResponses')} />}
            onRefresh={handleRefresh}
            refreshing={loading}
          />
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={item => item.id}
            renderItem={renderOrderItem}
            ListEmptyComponent={<EmptyState message={t('orders.noOrders')} />}
            onRefresh={handleRefresh}
            refreshing={loading}
          />
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  chipActive: {
    backgroundColor: '#007AFF',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  list: {
    flexGrow: 1,
  },
  // Response card styles
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
