import React, {useCallback, useMemo} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useOrderFeed} from '../hooks/useOrders';
import {useOrderViews, useMasterResponseMap} from '../hooks/useOrderViews';
import {useUiStore} from '../../../stores/uiStore';
import {useAuthStore} from '../../../stores/authStore';
import {OrderCard} from '../components/OrderCard';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import {ORDER_CATEGORIES} from '../../../config/constants';
import type {OrderFeedStackParamList} from '../../../types/navigation';
import type {Order} from '../../../types/database';

type Nav = NativeStackNavigationProp<OrderFeedStackParamList, 'OrderFeed'>;

export function OrderFeedScreen() {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const role = useAuthStore(s => s.role);
  const userId = useAuthStore(s => s.session?.user.id);
  const categoryFilters = useUiStore(s => s.orderCategoryFilters);
  const toggleFilter = useUiStore(s => s.toggleCategoryFilter);
  const clearFilters = useUiStore(s => s.clearCategoryFilters);
  const {data, loading, refetch} = useOrderFeed(
    categoryFilters.length > 0 ? categoryFilters : undefined,
  );
  const {viewedIds, recordView} = useOrderViews();
  const {responseMap, totalCount} = useMasterResponseMap();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const isMaster = role === 'master';
  const allSelected = categoryFilters.length === 0;

  const sortedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    const orders = data as Order[];
    return [...orders].sort((a, b) => {
      const aWeight = a.status === 'open' ? 0 : 1;
      const bWeight = b.status === 'open' ? 0 : 1;
      if (aWeight !== bWeight) return aWeight - bWeight;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [data]);

  const handleOrderPress = (orderId: string) => {
    recordView(orderId);
    navigation.navigate('OrderDetail', {orderId});
  };

  if (loading && !data) {
    return <LoadingScreen />;
  }

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('orders.feed')}</Text>
          {isMaster && totalCount > 0 && (
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>
                {t('orders.myResponsesCount', {count: totalCount})}
              </Text>
            </View>
          )}
        </View>

        {/* Category filter chips - wrapping */}
        <View style={styles.filtersWrapper}>
          <Pressable
            style={[styles.filterChip, allSelected && styles.filterChipActive]}
            onPress={clearFilters}>
            <Text
              style={[
                styles.filterChipText,
                allSelected && styles.filterChipTextActive,
              ]}>
              {t('common.all')}
            </Text>
          </Pressable>
          {ORDER_CATEGORIES.map(cat => {
            const isActive = categoryFilters.includes(cat);
            return (
              <Pressable
                key={cat}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => toggleFilter(cat)}>
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}>
                  {t(`categories.${cat}` as const)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Order list */}
        <FlatList
          data={sortedData}
          keyExtractor={item => item.id}
          renderItem={({item}) => {
            const resp = isMaster ? responseMap[item.id] : undefined;
            const isAssigned = item.status === 'in_progress';
            const isMyOrder = isAssigned && item.assigned_master_id === userId;
            return (
              <OrderCard
                order={item}
                onPress={() => handleOrderPress(item.id)}
                isViewed={isMaster ? viewedIds.has(item.id) : undefined}
                detailedStatus={resp?.detailedStatus}
                hasSpecialOffer={resp?.hasSpecialOffer}
                disabled={isAssigned && !isMyOrder}
                statusLabel={
                  isAssigned
                    ? isMyOrder
                      ? t('orders.statusInProgress')
                      : t('orders.masterAssigned')
                    : undefined
                }
                statusColor={
                  isAssigned
                    ? isMyOrder
                      ? '#FF9500'
                      : '#8E8E93'
                    : undefined
                }
              />
            );
          }}
          contentContainerStyle={styles.list}
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
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  totalBadge: {
    backgroundColor: '#E5F1FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
  },
  filtersWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: 0,
    flexGrow: 1,
  },
});
