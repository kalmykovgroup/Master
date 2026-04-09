import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useMasterOrders} from '../hooks/useOrders';
import {markMasterOrdersSeen} from '../hooks/useOrderBadges';
import {OrderCard} from '../components/OrderCard';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import type {MasterOrdersStackParamList} from '../../../types/navigation';
import type {Order} from '../../../types/database';

type Nav = NativeStackNavigationProp<MasterOrdersStackParamList, 'MasterOrders'>;

type Filter = 'in_progress' | 'completed';

const MASTER_STATUS_COLORS: Record<string, {bg: string; text: string; key: string}> = {
  in_progress: {bg: '#FF9500', text: '#FFFFFF', key: 'orders.statusInProgress'},
  not_confirmed: {bg: '#8E8E93', text: '#FFFFFF', key: 'orders.statusNotConfirmed'},
  completed: {bg: '#34C759', text: '#FFFFFF', key: 'orders.statusCompleted'},
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
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {data, loading, refetch} = useMasterOrders();
  const [filter, setFilter] = useState<Filter>('in_progress');

  useFocusEffect(
    useCallback(() => {
      if (!data || !Array.isArray(data)) return;
      const ids = (data as Order[]).map(o => o.id);
      if (ids.length > 0) {
        markMasterOrdersSeen(ids);
      }
    }, [data]),
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const orders = data as Order[];
    if (filter === 'in_progress') {
      return orders.filter(o => o.status === 'in_progress' && !o.master_completed);
    }
    // completed: master marked done (awaiting client) or fully completed
    return orders.filter(
      o => (o.status === 'in_progress' && o.master_completed) || o.status === 'completed',
    );
  }, [data, filter]);

  if (loading && !data) {
    return <LoadingScreen />;
  }

  const filters: {key: Filter; label: string}[] = [
    {key: 'in_progress', label: t('orders.filterInProgress')},
    {key: 'completed', label: t('orders.filterCompleted')},
  ];

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('tabs.inProgress')}</Text>
        </View>
        <View style={styles.filters}>
          {filters.map(f => (
            <Pressable
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => setFilter(f.key)}>
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({item}) => {
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
});
