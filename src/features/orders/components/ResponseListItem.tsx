import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {formatCurrency} from '../../../shared/utils/formatCurrency';
import {Button} from '../../../shared/components/Button';
import type {SpecialOffer} from '../../../types/database';

interface ResponseListItemProps {
  response: {
    id: string;
    message: string | null;
    proposed_price: number | null;
    status: string;
    chat_blocked: boolean;
    master: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
      master_profile: {
        avg_rating: number | null;
      } | null;
    } | null;
  };
  specialOffer?: SpecialOffer | null;
  onPress: () => void;
  onChat: () => void;
  onAccept: () => void;
  onReject: () => void;
  onAcceptOffer?: () => void;
  onRejectOffer?: () => void;
}

export function ResponseListItem({
  response,
  specialOffer,
  onPress,
  onChat,
  onAccept,
  onReject,
  onAcceptOffer,
  onRejectOffer,
}: ResponseListItemProps) {
  const {t} = useTranslation();

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(response.master?.display_name ?? '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>
            {response.master?.display_name ?? t('profile.profile')}
          </Text>
          {response.master?.master_profile?.avg_rating != null && (
            <Text style={styles.rating}>
              {'\u2B50'} {response.master.master_profile.avg_rating.toFixed(1)}
            </Text>
          )}
        </View>
        {response.status !== 'pending' && (
          <View
            style={[
              styles.statusBadge,
              response.status === 'accepted'
                ? styles.statusAccepted
                : styles.statusRejected,
            ]}>
            <Text style={styles.statusText}>
              {response.status === 'accepted'
                ? t('orders.accepted')
                : t('orders.rejected')}
            </Text>
          </View>
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

      {response.status === 'pending' && (
        <View style={styles.actions}>
          <Button
            title={t('orders.chat')}
            onPress={onChat}
            variant="outline"
            size="small"
            style={styles.actionBtn}
          />
          <Button
            title={t('orders.selectMaster')}
            onPress={onAccept}
            size="small"
            style={styles.actionBtn}
          />
          <Button
            title={t('orders.reject')}
            onPress={onReject}
            variant="secondary"
            size="small"
            style={styles.actionBtn}
          />
        </View>
      )}

      {response.status === 'accepted' && (
        <View style={styles.actions}>
          <Button
            title={t('orders.chat')}
            onPress={onChat}
            size="small"
            style={styles.actionBtn}
          />
        </View>
      )}

      {response.status === 'rejected' && specialOffer && (
        <View style={styles.offerSection}>
          <Text style={styles.offerTitle}>{t('orders.specialOffer')}</Text>
          <Text style={styles.offerMessage}>{specialOffer.message}</Text>
          {specialOffer.proposed_price != null && (
            <Text style={styles.price}>
              {formatCurrency(specialOffer.proposed_price)}
            </Text>
          )}
          {specialOffer.status === 'pending' && (
            <View style={styles.actions}>
              <Button
                title={t('orders.accept')}
                onPress={onAcceptOffer ?? (() => {})}
                size="small"
                style={styles.actionBtn}
              />
              <Button
                title={t('orders.reject')}
                onPress={onRejectOffer ?? (() => {})}
                variant="secondary"
                size="small"
                style={styles.actionBtn}
              />
            </View>
          )}
          {specialOffer.status === 'accepted' && (
            <Text style={styles.offerStatusAccepted}>
              {t('orders.offerAccepted')}
            </Text>
          )}
          {specialOffer.status === 'rejected' && (
            <Text style={styles.offerStatusRejected}>
              {t('orders.offerRejected')}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  rating: {
    fontSize: 13,
    color: '#F59E0B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusAccepted: {
    backgroundColor: '#34C759',
  },
  statusRejected: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
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
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
  },
  offerSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9A3412',
    marginBottom: 4,
  },
  offerMessage: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  offerStatusAccepted: {
    fontSize: 13,
    fontWeight: '500',
    color: '#22C55E',
    marginTop: 8,
  },
  offerStatusRejected: {
    fontSize: 13,
    fontWeight: '500',
    color: '#EF4444',
    marginTop: 8,
  },
});
