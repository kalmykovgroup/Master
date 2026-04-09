import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {formatBudgetRange} from '../../../shared/utils/formatCurrency';
import {formatRelative} from '../../../shared/utils/formatDate';
import type {DetailedStatus} from '../hooks/useOrderViews';
import type {Order} from '../../../types/database';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  /** Number of responses (for client view) */
  responseCount?: number;
  /** Detailed response status for master */
  detailedStatus?: DetailedStatus;
  /** Whether master sent a special offer */
  hasSpecialOffer?: boolean;
  /** Whether the order was viewed by current user */
  isViewed?: boolean;
  /** Override status badge label */
  statusLabel?: string;
  /** Override status badge color */
  statusColor?: string;
  /** Disable interaction and dim the card */
  disabled?: boolean;
  testID?: string;
}

const STATUS_COLORS: Record<string, string> = {
  in_progress: '#FF9500',
  completed: '#8E8E93',
  cancelled: '#FF3B30',
};

const DETAILED_STATUS_CONFIG: Record<
  string,
  {key: string; color: string}
> = {
  sent: {key: 'orders.statusSent', color: '#007AFF'},
  reviewing: {key: 'orders.statusReviewing', color: '#FF9500'},
  client_wrote: {key: 'orders.statusClientWrote', color: '#34C759'},
  accepted: {key: 'orders.accepted', color: '#34C759'},
  rejected: {key: 'orders.rejected', color: '#FF3B30'},
};

export function OrderCard({
  order,
  onPress,
  responseCount,
  detailedStatus,
  hasSpecialOffer,
  isViewed,
  statusLabel,
  statusColor,
  disabled,
  testID,
}: OrderCardProps) {
  const {t, i18n} = useTranslation();

  const statusKey = `orders.status${order.status.charAt(0).toUpperCase()}${order.status
    .slice(1)
    .replace(/_(\w)/g, (_, c) => c.toUpperCase())}` as const;

  const statusConfig = detailedStatus
    ? DETAILED_STATUS_CONFIG[detailedStatus]
    : undefined;

  return (
    <Pressable
      testID={testID}
      style={({pressed}) => [
        styles.container,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={disabled ? undefined : onPress}>
      {/* Unviewed indicator dot */}
      {isViewed === false && <View style={styles.unviewedDot} />}

      <View style={styles.content}>
        {/* Row 1: Title + time */}
        <View style={styles.topRow}>
          <Text
            style={[styles.title, isViewed === false && styles.titleBold]}
            numberOfLines={2}>
            {order.title}
          </Text>
          <Text style={styles.time}>
            {formatRelative(order.created_at, i18n.language)}
          </Text>
        </View>

        {/* Row 2: Category + price + count */}
        <View style={styles.bottomRow}>
          <Text style={styles.category} numberOfLines={1}>
            {t(`categories.${order.category}` as const)}
            {order.budget_min || order.budget_max
              ? ` \u00B7 ${formatBudgetRange(order.budget_min, order.budget_max)}`
              : ''}
          </Text>
          <View style={styles.bottomRight}>
            {/* Status badge (non-open only) */}
            {(statusLabel || order.status !== 'open') && (
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      statusColor ?? STATUS_COLORS[order.status] ?? '#8E8E93',
                  },
                ]}>
                <Text style={styles.statusText}>{statusLabel ?? t(statusKey)}</Text>
              </View>
            )}
            {/* Response count badge */}
            {responseCount != null && responseCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{responseCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Detailed response status text */}
        {statusConfig && (
          <Text style={[styles.detailedStatusText, {color: statusConfig.color}]}>
            {t(statusConfig.key)}
          </Text>
        )}

        {/* Special offer pending text */}
        {detailedStatus === 'rejected' && hasSpecialOffer && (
          <Text style={styles.offerPendingText}>{t('orders.offerPending')}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  pressed: {
    backgroundColor: '#F2F2F7',
  },
  disabled: {
    opacity: 0.5,
  },
  unviewedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    flex: 1,
    marginRight: 8,
    lineHeight: 21,
  },
  titleBold: {
    fontWeight: '600',
  },
  time: {
    fontSize: 14,
    color: '#8E8E93',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  bottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailedStatusText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  offerPendingText: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 2,
    fontWeight: '500',
  },
});
