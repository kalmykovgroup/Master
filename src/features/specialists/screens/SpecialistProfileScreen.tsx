import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useProfile} from '../../profile/hooks/useProfile';
import {useReviews} from '../../reviews/hooks/useReviews';
import {StarRating} from '../../reviews/components/StarRating';
import {ReviewCard} from '../../reviews/components/ReviewCard';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import {colors} from '../../../config/colors';
import type {SpecialistsStackParamList} from '../../../types/navigation';

type Props = NativeStackScreenProps<SpecialistsStackParamList, 'SpecialistProfile'>;

function ProfileField({label, value}: {label: string; value: string | null | undefined}) {
  const {t} = useTranslation();
  const isEmpty = !value;
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, isEmpty && styles.emptyText]}>
        {value || t('profile.notSpecified')}
      </Text>
    </View>
  );
}

export function SpecialistProfileScreen({route}: Props) {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const {userId} = route.params;
  const {data: profile, masterData: masterProfile, loading: profileLoading} = useProfile(userId);
  const {data: reviews, loading: reviewsLoading} = useReviews(userId);

  if (profileLoading && !profile) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return <EmptyState message={t('common.error')} />;
  }

  const rating = masterProfile?.avg_rating ?? 0;

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <FlatList
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profile.display_name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.name}>
                {profile.display_name ?? t('profile.notSpecified')}
              </Text>

              <ProfileField label={t('profile.bio')} value={masterProfile?.bio} />
              <ProfileField
                label={t('profile.age')}
                value={masterProfile?.age != null ? String(masterProfile.age) : null}
              />
              <ProfileField label={t('profile.citizenship')} value={masterProfile?.citizenship} />
              <ProfileField label={t('profile.workExperience')} value={masterProfile?.work_experience} />

              <View style={styles.ratingRow}>
                <StarRating rating={rating} size={20} readonly />
                <Text style={styles.ratingText}>
                  {rating.toFixed(1)} ({masterProfile?.review_count ?? 0})
                </Text>
              </View>

              <View style={styles.divider} />
              <Text style={styles.reviewsTitle}>{t('reviews.reviews')}</Text>
            </View>
          }
          data={reviews as any[] | null}
          keyExtractor={item => item.id}
          renderItem={({item}) => <ReviewCard review={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !reviewsLoading ? (
              <EmptyState message={t('reviews.noReviews')} />
            ) : null
          }
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
    paddingVertical: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  fieldBlock: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  emptyText: {
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    alignSelf: 'stretch',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
});
