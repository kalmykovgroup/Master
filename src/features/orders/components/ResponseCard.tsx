import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {formatCurrency} from '../../../shared/utils/formatCurrency';
import {formatRelative} from '../../../shared/utils/formatDate';
import {Button} from '../../../shared/components/Button';

interface ResponseCardProps {
  response: {
    id: string;
    message: string | null;
    proposed_price: number | null;
    status: string;
    created_at: string;
    master?: {
      display_name: string | null;
      avg_rating: number | null;
    } | null;
  };
  isOwner?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  testID?: string;
}

export function ResponseCard({
  response,
  isOwner,
  onAccept,
  onReject,
  testID,
}: ResponseCardProps) {
  const {t, i18n} = useTranslation();

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.name}>
          {response.master?.display_name ?? t('profile.profile')}
        </Text>
        {response.master?.avg_rating != null && (
          <Text style={styles.rating}>
            {response.master.avg_rating.toFixed(1)}
          </Text>
        )}
      </View>
      {response.message && (
        <Text style={styles.message}>{response.message}</Text>
      )}
      {response.proposed_price != null && (
        <Text style={styles.price}>
          {t('orders.proposedPrice')}: {formatCurrency(response.proposed_price)}
        </Text>
      )}
      <Text style={styles.date}>
        {formatRelative(response.created_at, i18n.language)}
      </Text>
      {isOwner && response.status === 'pending' && (
        <View style={styles.actions}>
          <Button
            title={t('common.confirm')}
            onPress={onAccept ?? (() => {})}
            style={styles.actionBtn}
          />
          <Button
            title={t('common.cancel')}
            onPress={onReject ?? (() => {})}
            variant="outline"
            style={styles.actionBtn}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  rating: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F59E0B',
  },
  message: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#94A3B8',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
  },
});
