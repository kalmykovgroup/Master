import React, {useState, useMemo, useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Button} from '../../../shared/components/Button';
import {Input} from '../../../shared/components/Input';
import type {Profile, MasterProfile} from '../../../types/database';

interface ProfileFormProps {
  profile: Profile;
  masterProfile?: MasterProfile | null;
  isMaster: boolean;
  editable: boolean;
  onSave: (data: {
    display_name: string;
    bio?: string;
    age?: number | null;
    citizenship?: string | null;
    work_experience?: string | null;
  }) => Promise<void>;
  onSaved?: () => void;
  loading?: boolean;
}

export function ProfileForm({profile, masterProfile, isMaster, editable, onSave, onSaved, loading}: ProfileFormProps) {
  const {t} = useTranslation();

  const initial = useMemo(() => ({
    displayName: profile.display_name ?? '',
    bio: masterProfile?.bio ?? '',
    age: masterProfile?.age != null ? String(masterProfile.age) : '',
    citizenship: masterProfile?.citizenship ?? '',
    workExperience: masterProfile?.work_experience ?? '',
  }), [profile, masterProfile]);

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [age, setAge] = useState(initial.age);
  const [citizenship, setCitizenship] = useState(initial.citizenship);
  const [workExperience, setWorkExperience] = useState(initial.workExperience);

  useEffect(() => {
    setDisplayName(initial.displayName);
    setBio(initial.bio);
    setAge(initial.age);
    setCitizenship(initial.citizenship);
    setWorkExperience(initial.workExperience);
  }, [initial]);

  const isDirty = displayName !== initial.displayName
    || (isMaster && (
      bio !== initial.bio
      || age !== initial.age
      || citizenship !== initial.citizenship
      || workExperience !== initial.workExperience
    ));

  const handleSave = async () => {
    const data: {
      display_name: string;
      bio?: string;
      age?: number | null;
      citizenship?: string | null;
      work_experience?: string | null;
    } = {display_name: displayName};

    if (isMaster) {
      data.bio = bio;
      data.age = age ? parseInt(age, 10) : null;
      data.citizenship = citizenship.trim() || null;
      data.work_experience = workExperience.trim() || null;
    }

    await onSave(data);
    onSaved?.();
  };

  return (
    <View style={styles.container}>
      <Input
        label={t('profile.displayName')}
        placeholder={t('profile.namePlaceholder')}
        value={displayName}
        onChangeText={setDisplayName}
        editable={editable}
        testID="name-input"
      />
      {isMaster && (
        <>
          <Input
            label={t('profile.bio')}
            placeholder={t('profile.bioPlaceholder')}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            editable={editable}
            testID="bio-input"
          />
          <Input
            label={t('profile.age')}
            placeholder={t('profile.agePlaceholder')}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            editable={editable}
          />
          <Input
            label={t('profile.citizenship')}
            placeholder={t('profile.citizenshipPlaceholder')}
            value={citizenship}
            onChangeText={setCitizenship}
            editable={editable}
          />
          <Input
            label={t('profile.workExperience')}
            placeholder={t('profile.workExperiencePlaceholder')}
            value={workExperience}
            onChangeText={setWorkExperience}
            multiline
            numberOfLines={3}
            editable={editable}
          />
        </>
      )}
      {editable && isDirty && (
        <Button
          title={t('common.save')}
          onPress={handleSave}
          loading={loading}
          testID="save-profile-btn"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
});
