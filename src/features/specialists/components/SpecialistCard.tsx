import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {StarRating} from '../../reviews/components/StarRating';
import {formatRelative} from '../../../shared/utils/formatDate';
import type {MasterProfile, Profile} from '../../../types/database';

export interface SpecialistItem extends MasterProfile {
  profile: Profile;
}

interface SpecialistCardProps {
  item: SpecialistItem;
  isMe?: boolean;
  onPress: () => void;
}

export function SpecialistCard({item, isMe, onPress}: SpecialistCardProps) {
  const {t} = useTranslation();

  return (
    <Pressable
      style={({pressed}) => [styles.container, isMe && styles.me, pressed && styles.pressed]}
      onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.profile.display_name ?? '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.profile.display_name ?? t('profile.profile')}
        </Text>
        <View style={styles.ratingRow}>
          {item.avg_rating != null && (
            <>
              <StarRating rating={item.avg_rating} size={14} readonly />
              <Text style={styles.reviewCount}>({item.review_count})</Text>
            </>
          )}
        </View>
        {item.last_active_at && (
          <Text style={styles.lastActive}>
            {t('specialists.lastActive')} {formatRelative(item.last_active_at)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  pressed: {
    backgroundColor: '#F2F2F7',
  },
  me: {
    backgroundColor: '#E5F2FF',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  lastActive: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
});
