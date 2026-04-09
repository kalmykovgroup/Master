import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useMyOrders} from '../hooks/useOrders';
import {markClientResponsesSeen} from '../hooks/useOrderBadges';
import {OrderCard} from '../components/OrderCard';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import type {ClientOrdersStackParamList} from '../../../types/navigation';
import type {Order} from '../../../types/database';

type Nav = NativeStackNavigationProp<ClientOrdersStackParamList, 'MyOrders'>;
type StatusFilter = 'all' | 'open' | 'in_progress' | 'completed';

export function MyOrdersScreen() {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {data, loading, refetch} = useMyOrders();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Mark all responses as seen when tab is focused
  useFocusEffect(
    useCallback(() => {
      if (!data || !Array.isArray(data)) return;
      const allResponseIds: string[] = [];
      for (const order of data as any[]) {
        if (order.responses && Array.isArray(order.responses)) {
          for (const r of order.responses) {
            if (r.status !== 'rejected') {
              allResponseIds.push(r.id);
            }
          }
        }
      }
      if (allResponseIds.length > 0) {
        markClientResponsesSeen(allResponseIds);
      }
    }, [data]),
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const orders = data as Order[];
    if (statusFilter === 'all') return orders;
    return orders.filter(o => o.status === statusFilter);
  }, [data, statusFilter]);

  const statusFilters: {key: StatusFilter; label: string}[] = [
    {key: 'all', label: t('common.all')},
    {key: 'open', label: t('orders.filterOpen')},
    {key: 'in_progress', label: t('orders.filterInProgress')},
    {key: 'completed', label: t('orders.filterCompleted')},
  ];

  if (loading && !data) {
    return <LoadingScreen />;
  }

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('orders.myOrders')}</Text>
          <Pressable
            style={styles.addBtn}
            onPress={() => navigation.navigate('CreateOrder')}
            testID="create-order-btn">
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>
        <View style={styles.filters}>
          {statusFilters.map(f => (
            <Pressable
              key={f.key}
              style={[styles.chip, statusFilter === f.key && styles.chipActive]}
              onPress={() => setStatusFilter(f.key)}>
              <Text
                style={[
                  styles.chipText,
                  statusFilter === f.key && styles.chipTextActive,
                ]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({item}) => {
            const responses = (item as any).responses;
            const activeCount = Array.isArray(responses)
              ? responses.filter((r: any) => r.status !== 'rejected').length
              : 0;
            return (
              <OrderCard
                order={item}
                responseCount={
                  item.status === 'open' ? activeCount : undefined
                }
                onPress={() =>
                  navigation.navigate('OrderDetail', {orderId: item.id})
                }
              />
            );
          }}
          ListEmptyComponent={<EmptyState message={t('orders.noOrders')} />}
          onRefresh={refetch}
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 22,
    fontWeight: '400',
    color: '#FFFFFF',
    marginTop: -1,
  },
});
