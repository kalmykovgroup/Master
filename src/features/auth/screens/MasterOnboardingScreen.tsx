import React, {useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';
import {Button} from '../../../shared/components/Button';
import {Input} from '../../../shared/components/Input';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import {colors} from '../../../config/colors';

export function MasterOnboardingScreen() {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const userId = useAuthStore(s => s.session?.user.id);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [citizenship, setCitizenship] = useState('');
  const [workExperience, setWorkExperience] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{name?: string; bio?: string}>({});

  const handleSubmit = async () => {
    const newErrors: {name?: string; bio?: string} = {};
    if (!displayName.trim()) {
      newErrors.name = t('auth.displayNameRequired');
    }
    if (!bio.trim()) {
      newErrors.bio = t('auth.bioRequired');
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    // Update base profile (display_name + role='master')
    const {data: profileData, error: profileError} = await supabase
      .from('profiles')
      .update({display_name: displayName.trim(), role: 'master'})
      .eq('id', userId!)
      .select()
      .single();

    if (profileError) {
      setLoading(false);
      Alert.alert(t('common.error'), profileError.message);
      return;
    }

    // Update master_profiles (bio, age, citizenship, work_experience, profile_completed)
    const {data: masterData, error: masterError} = await supabase
      .from('master_profiles')
      .update({
        bio: bio.trim(),
        age: age ? parseInt(age, 10) : null,
        citizenship: citizenship.trim() || null,
        work_experience: workExperience.trim() || null,
        profile_completed: true,
      })
      .eq('user_id', userId!)
      .select()
      .single();

    setLoading(false);

    if (masterError) {
      Alert.alert(t('common.error'), masterError.message);
      return;
    }

    useAuthStore.getState().setProfile(profileData);
    useAuthStore.getState().setMasterProfile(masterData);
    navigation.goBack();
  };

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('auth.onboardingTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.onboardingSubtitle')}</Text>

        <Input
          label={t('profile.displayName')}
          placeholder={t('profile.namePlaceholder')}
          value={displayName}
          onChangeText={setDisplayName}
          error={errors.name}
        />
        <Input
          label={t('profile.bio')}
          placeholder={t('profile.bioPlaceholder')}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          error={errors.bio}
        />
        <Input
          label={t('profile.age')}
          placeholder={t('profile.agePlaceholder')}
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />
        <Input
          label={t('profile.citizenship')}
          placeholder={t('profile.citizenshipPlaceholder')}
          value={citizenship}
          onChangeText={setCitizenship}
        />
        <Input
          label={t('profile.workExperience')}
          placeholder={t('profile.workExperiencePlaceholder')}
          value={workExperience}
          onChangeText={setWorkExperience}
          multiline
          numberOfLines={3}
        />

        <Button
          title={t('auth.continue')}
          onPress={handleSubmit}
          loading={loading}
          style={styles.button}
        />
        <Button
          title={t('common.back')}
          onPress={() => navigation.goBack()}
          variant="outline"
          style={styles.backButton}
        />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  button: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 10,
  },
});
