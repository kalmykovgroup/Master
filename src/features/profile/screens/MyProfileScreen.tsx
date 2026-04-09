import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Switch, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import i18n from '../../../i18n';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {supabase} from '../../../config/supabase';
import {colors} from '../../../config/colors';
import {useAuthStore} from '../../../stores/authStore';
import {useProfile} from '../hooks/useProfile';
import {usePhoneAuth} from '../../auth/hooks/usePhoneAuth';
import {AvatarPicker} from '../components/AvatarPicker';
import {ProfileForm} from '../components/ProfileForm';
import {Button} from '../../../shared/components/Button';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import {formatPhone} from '../../../shared/utils/formatPhone';
import type {ProfileStackParamList} from '../../../types/navigation';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'MyProfile'>;

export function MyProfileScreen() {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const profile = useAuthStore(s => s.profile);
  const masterProfile = useAuthStore(s => s.masterProfile);
  const role = useAuthStore(s => s.role);
  const isMaster = role === 'master';
  const {updateProfile, updateMasterProfile} = useProfile();
  const {signOut} = usePhoneAuth();
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [editing, setEditing] = useState(false);

  const handleRoleToggle = async (toMaster: boolean) => {
    if (switching) return;
    if (toMaster) {
      // Check if master profile is completed
      if (!masterProfile?.profile_completed) {
        navigation.navigate('MasterOnboarding');
        return;
      }
      // Switch to master
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
      // Switch to client
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

  return (
    <ScreenWrapper>
      <ScrollView
        style={[styles.container, {paddingTop: insets.top}]}
        contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('profile.profile')}</Text>
          <Pressable
            onPress={() => setEditing(e => !e)}
            hitSlop={8}
            style={styles.editIconBtn}>
            <Text style={[styles.editIcon, editing && styles.editIconActive]}>
              {'\u270E'}
            </Text>
          </Pressable>
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
          <Switch
            value={isMaster}
            onValueChange={handleRoleToggle}
            disabled={switching}
            trackColor={{false: colors.separatorLight, true: colors.orange}}
            thumbColor="#FFFFFF"
          />
        </View>

        {isMaster && masterProfile?.avg_rating != null && (
          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>{t('profile.rating')}:</Text>
            <Text style={styles.ratingValue}>
              {masterProfile.avg_rating.toFixed(1)} ({masterProfile.review_count})
            </Text>
          </View>
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

        <Button
          title={t('profile.reviews')}
          variant="outline"
          onPress={() => navigation.navigate('ReviewsList', {userId: profile.id})}
          style={styles.reviewsBtn}
        />

        {isMaster && (
          <Button
            title={t('profile.myResponses')}
            variant="outline"
            onPress={() => navigation.navigate('MyResponses')}
            style={styles.responsesBtn}
          />
        )}

        <View style={styles.langRow}>
          <Text style={styles.langLabel}>{t('profile.language')}</Text>
          <View style={styles.langButtons}>
            <Pressable
              style={[styles.langBtn, i18n.language === 'ru' && styles.langBtnActive]}
              onPress={() => i18n.changeLanguage('ru')}>
              <Text style={[styles.langBtnText, i18n.language === 'ru' && styles.langBtnTextActive]}>
                {t('profile.languageRu')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.langBtn, i18n.language === 'en' && styles.langBtnActive]}
              onPress={() => i18n.changeLanguage('en')}>
              <Text style={[styles.langBtnText, i18n.language === 'en' && styles.langBtnTextActive]}>
                {t('profile.languageEn')}
              </Text>
            </Pressable>
          </View>
        </View>

        <Button
          title={t('profile.logout')}
          variant="secondary"
          onPress={signOut}
          style={styles.logoutBtn}
          testID="logout-btn"
        />
      </ScrollView>
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
  editIconBtn: {
    padding: 4,
  },
  editIcon: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  editIconActive: {
    color: colors.primary,
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 8,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  reviewsBtn: {
    marginTop: 16,
  },
  responsesBtn: {
    marginTop: 10,
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
  },
  langLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  langButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C6C6C8',
  },
  langBtnActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
  },
  langBtnTextActive: {
    color: '#FFFFFF',
  },
  logoutBtn: {
    marginTop: 10,
  },
});
