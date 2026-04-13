import React, {useCallback, useMemo, useState} from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useOrderFeed} from '../hooks/useOrders';
import type {FeedFilter} from '../hooks/useOrders';
import {useOrderViews, useMasterResponseMap} from '../hooks/useOrderViews';
import {useSavedFilters} from '../hooks/useSavedFilters';
import {useAuthStore} from '../../../stores/authStore';
import {OrderCard} from '../components/OrderCard';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import {colors} from '../../../config/colors';
import type {OrderFeedStackParamList} from '../../../types/navigation';
import type {Order, SavedFilter} from '../../../types/database';

type Nav = NativeStackNavigationProp<OrderFeedStackParamList, 'OrderFeed'>;

export function OrderFeedScreen() {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const role = useAuthStore(s => s.role);
  const userId = useAuthStore(s => s.session?.user.id);
  const {filters, activeFilters, toggleFilter, deleteFilter, refetch: refetchFilters} = useSavedFilters();

  // Build merged FeedFilter from all active saved filters
  const feedFilter = useMemo<FeedFilter | undefined>(() => {
    if (activeFilters.length === 0) return undefined;
    const allCategories: string[] = [];
    let minBudget: number | undefined;
    let maxBudget: number | undefined;
    let loc: string | undefined;
    for (const f of activeFilters) {
      if (f.categories?.length) allCategories.push(...f.categories);
      if (f.budget_min != null) {
        minBudget = minBudget != null ? Math.min(minBudget, f.budget_min) : f.budget_min;
      }
      if (f.budget_max != null) {
        maxBudget = maxBudget != null ? Math.max(maxBudget, f.budget_max) : f.budget_max;
      }
      if (f.location) loc = f.location;
    }
    const uniqueCats = [...new Set(allCategories)];
    return {
      categories: uniqueCats.length > 0 ? uniqueCats : undefined,
      budgetMin: minBudget,
      budgetMax: maxBudget,
      location: loc,
    };
  }, [activeFilters]);

  const {data, loading, refetch} = useOrderFeed(feedFilter);
  const {viewedIds, recordView} = useOrderViews();
  const {responseMap, totalCount} = useMasterResponseMap();

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchFilters();
    }, [refetch, refetchFilters]),
  );

  const isMaster = role === 'master';

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

  const handleToggleFilter = (filter: SavedFilter) => {
    toggleFilter(filter.id, !filter.is_active);
  };

  const handleDeleteFilter = (filter: SavedFilter) => {
    Alert.alert(t('filters.deleteConfirm'), filter.name, [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteFilter(filter.id),
      },
    ]);
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
          <View style={styles.headerRight}>
            {isMaster && totalCount > 0 && (
              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeText}>
                  {t('orders.myResponsesCount', {count: totalCount})}
                </Text>
              </View>
            )}
            <Pressable
              style={styles.filterButton}
              onPress={() => navigation.navigate('CreateFilter')}>
              <Text style={styles.filterButtonText}>
                + {t('filters.filter')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Saved filter chips */}
        {filters.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersWrapper}>
            {filters.map(f => (
              <Pressable
                key={f.id}
                style={[
                  styles.filterChip,
                  f.is_active && styles.filterChipActive,
                ]}
                onPress={() => handleToggleFilter(f)}
                onLongPress={() => handleDeleteFilter(f)}>
                <Text
                  style={[
                    styles.filterChipText,
                    f.is_active && styles.filterChipTextActive,
                  ]}>
                  {f.name}
                </Text>
                <Pressable
                  style={styles.chipClose}
                  onPress={() => handleDeleteFilter(f)}
                  hitSlop={8}>
                  <Text
                    style={[
                      styles.chipCloseText,
                      f.is_active && styles.chipCloseTextActive,
                    ]}>
                    ×
                  </Text>
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>
        )}

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
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  totalBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  filterButton: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  filtersWrapper: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: colors.bgSecondary,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  chipClose: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  chipCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipCloseTextActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  list: {
    paddingHorizontal: 0,
    flexGrow: 1,
  },
});
