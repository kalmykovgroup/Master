import React, {useMemo, useState} from 'react';
import {FlatList, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import i18n from '../../../i18n';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {supabase} from '../../../config/supabase';
import {colors} from '../../../config/colors';
import {useAccent} from '../../../shared/hooks/useAccent';
import {useAuthStore} from '../../../stores/authStore';
import {useProfile} from '../hooks/useProfile';
import {usePhoneAuth} from '../../auth/hooks/usePhoneAuth';
import {useReviews} from '../../reviews/hooks/useReviews';
import {ReviewCard} from '../../reviews/components/ReviewCard';
import {StarRating} from '../../reviews/components/StarRating';
import {AvatarPicker} from '../components/AvatarPicker';
import {ProfileForm} from '../components/ProfileForm';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import {formatPhone} from '../../../shared/utils/formatPhone';
import type {ProfileStackParamList} from '../../../types/navigation';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'MyProfile'>;
type ReviewFilter = 'all' | 'negative';

export function MyProfileScreen() {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const profile = useAuthStore(s => s.profile);
  const masterProfile = useAuthStore(s => s.masterProfile);
  const role = useAuthStore(s => s.role);
  const isMaster = role === 'master';
  const accentColor = useAccent();
  const {updateProfile, updateMasterProfile} = useProfile();
  const {signOut} = usePhoneAuth();
  const {data: reviews} = useReviews(profile?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const allReviews = useMemo(() => {
    if (!reviews || !Array.isArray(reviews)) return [];
    return reviews as any[];
  }, [reviews]);

  const avgRating = useMemo(() => {
    if (allReviews.length === 0) return 0;
    const sum = allReviews.reduce((acc: number, r: any) => acc + r.rating, 0);
    return sum / allReviews.length;
  }, [allReviews]);

  const filteredReviews = useMemo(() => {
    if (reviewFilter === 'negative') return allReviews.filter((r: any) => r.rating <= 2);
    return allReviews;
  }, [allReviews, reviewFilter]);

  const handleRoleToggle = async (toMaster: boolean) => {
    if (switching) return;
    if (toMaster) {
      if (!masterProfile?.profile_completed) {
        navigation.navigate('MasterOnboarding');
        return;
      }
      setSwitching(true);
      const {data, error: err} = await supabase
        .from('profiles')
        .update({role: 'master'})
        .eq('id', profile!.id)
        .select()
        .single();
      setSwitching(false);
      if (!err && data) {
        useAuthStore.getState().setProfile(data);
      }
    } else {
      setSwitching(true);
      const {data, error: err} = await supabase
        .from('profiles')
        .update({role: 'client'})
        .eq('id', profile!.id)
        .select()
        .single();
      setSwitching(false);
      if (!err && data) {
        useAuthStore.getState().setProfile(data);
      }
    }
  };

  if (!profile) {
    return <LoadingScreen />;
  }

  const handleSave = async (data: {
    display_name: string;
    bio?: string;
    age?: number | null;
    citizenship?: string | null;
    work_experience?: string | null;
  }) => {
    setSaving(true);
    await updateProfile({display_name: data.display_name});
    if (isMaster) {
      await updateMasterProfile({
        bio: data.bio ?? null,
        age: data.age ?? null,
        citizenship: data.citizenship ?? null,
        work_experience: data.work_experience ?? null,
      });
    }
    setSaving(false);
  };

  const headerComponent = (
    <>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('profile.profile')}</Text>
        <View style={styles.headerActions}>
          {/* Language toggle */}
          <View style={styles.langToggle}>
            <Pressable
              style={[styles.langBtn, i18n.language === 'ru' && styles.langBtnActive]}
              onPress={() => i18n.changeLanguage('ru')}>
              <Text style={[styles.langBtnText, i18n.language === 'ru' && styles.langBtnTextActive]}>
                RU
              </Text>
            </Pressable>
            <Pressable
              style={[styles.langBtn, i18n.language === 'en' && styles.langBtnActive]}
              onPress={() => i18n.changeLanguage('en')}>
              <Text style={[styles.langBtnText, i18n.language === 'en' && styles.langBtnTextActive]}>
                EN
              </Text>
            </Pressable>
          </View>
          {/* Edit */}
          <Pressable
            onPress={() => setEditing(e => !e)}
            hitSlop={8}
            style={styles.headerBtn}>
            <Text style={[styles.headerBtnIcon, editing && styles.headerBtnActive]}>
              {'\u270E'}
            </Text>
          </Pressable>
          {/* Logout */}
          <Pressable onPress={() => setShowLogoutConfirm(true)} hitSlop={8}>
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.avatarSection}>
        <AvatarPicker avatarUrl={profile.avatar_url} onPress={() => {}} />
        <View style={styles.avatarInfo}>
          <Text style={styles.name}>{profile.display_name ?? ''}</Text>
          <Text style={styles.phone}>{formatPhone(profile.phone)}</Text>
        </View>
      </View>

      <View style={styles.roleSwitch}>
        <Text style={styles.roleSwitchLabel}>
          {isMaster ? t('profile.masterMode') : t('profile.clientMode')}
        </Text>
        <Pressable
          onPress={() => handleRoleToggle(!isMaster)}
          disabled={switching}
          style={[
            styles.toggle,
            {backgroundColor: isMaster ? accentColor : colors.separatorLight},
          ]}>
          <View
            style={[
              styles.toggleThumb,
              isMaster && styles.toggleThumbOn,
            ]}
          />
        </Pressable>
      </View>

      {Platform.OS !== 'web' && (
        <Pressable
          style={styles.notificationsBtn}
          onPress={() => navigation.navigate('NotificationSettings')}>
          <Text style={styles.notificationsBtnText}>
            {t('notifications.title')}
          </Text>
          <Text style={styles.notificationsArrow}>{'\u203A'}</Text>
        </Pressable>
      )}

      <ProfileForm
        profile={profile}
        masterProfile={masterProfile}
        isMaster={isMaster}
        editable={editing}
        onSave={handleSave}
        onSaved={() => setEditing(false)}
        loading={saving}
      />

      {/* Reviews section */}
      <View style={styles.reviewsDivider} />
      <View style={styles.reviewsHeader}>
        <Text style={styles.reviewsTitle}>{t('reviews.reviews')}</Text>
        <View style={styles.reviewFilters}>
          <Pressable
            style={[styles.chip, reviewFilter === 'all' && styles.chipActive]}
            onPress={() => setReviewFilter('all')}>
            <Text style={[styles.chipText, reviewFilter === 'all' && styles.chipTextActive]}>
              {t('common.all')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.chip, reviewFilter === 'negative' && styles.chipActive]}
            onPress={() => setReviewFilter('negative')}>
            <Text style={[styles.chipText, reviewFilter === 'negative' && styles.chipTextActive]}>
              {t('reviews.negative')}
            </Text>
          </Pressable>
        </View>
      </View>
      {allReviews.length > 0 && (
        <View style={styles.ratingRow}>
          <StarRating rating={Math.round(avgRating)} readonly size={20} />
          <Text style={styles.ratingValue}>
            {avgRating.toFixed(1)}
          </Text>
          <Text style={styles.ratingCount}>
            ({allReviews.length})
          </Text>
        </View>
      )}
    </>
  );

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <FlatList
          ListHeaderComponent={headerComponent}
          data={filteredReviews}
          keyExtractor={item => item.id}
          renderItem={({item}) => <ReviewCard review={item} />}
          contentContainerStyle={styles.content}
          ListEmptyComponent={
            <View style={styles.emptyReviews}>
              <Text style={styles.emptyStars}>{'\u2606\u2606\u2606\u2606\u2606'}</Text>
              <Text style={styles.emptyReviewsText}>{t('reviews.noReviews')}</Text>
            </View>
          }
        />
      </View>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <Pressable
          style={styles.overlay}
          onPress={() => setShowLogoutConfirm(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('profile.logout')}</Text>
            <Text style={styles.modalMessage}>{t('profile.logoutConfirm')}</Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalBtn}
                onPress={() => setShowLogoutConfirm(false)}>
                <Text style={styles.modalBtnCancel}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnDanger]}
                onPress={() => {
                  setShowLogoutConfirm(false);
                  signOut();
                }}>
                <Text style={styles.modalBtnDangerText}>{t('profile.logout')}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langToggle: {
    flexDirection: 'row',
    gap: 2,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  langBtnActive: {
    backgroundColor: colors.primary,
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  langBtnTextActive: {
    color: '#FFFFFF',
  },
  headerBtn: {
    padding: 4,
  },
  headerBtnIcon: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  headerBtnActive: {
    color: colors.primary,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.red,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarInfo: {
    marginLeft: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  phone: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  roleSwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  roleSwitchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  notificationsBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  notificationsBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  notificationsArrow: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  reviewsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginTop: 20,
    marginBottom: 4,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  reviewFilters: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  ratingCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStars: {
    fontSize: 28,
    color: colors.separatorLight,
    letterSpacing: 4,
    marginBottom: 10,
  },
  emptyReviewsText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  // Modal
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    width: 280,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
  },
  modalBtnCancel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  modalBtnDanger: {
    backgroundColor: colors.red,
  },
  modalBtnDangerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
