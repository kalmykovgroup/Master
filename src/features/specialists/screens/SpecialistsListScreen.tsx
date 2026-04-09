import React, {useMemo} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSpecialists, useUpdateActivity} from '../hooks/useSpecialists';
import {useAuthStore} from '../../../stores/authStore';
import {SpecialistCard} from '../components/SpecialistCard';
import type {SpecialistItem} from '../components/SpecialistCard';
import {Button} from '../../../shared/components/Button';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import type {SpecialistsStackParamList} from '../../../types/navigation';

type Nav = NativeStackNavigationProp<SpecialistsStackParamList, 'SpecialistsList'>;

export function SpecialistsListScreen() {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const role = useAuthStore(s => s.role);
  const userId = useAuthStore(s => s.session?.user.id);
  const {data, loading, refetch} = useSpecialists();
  const {updateActivity} = useUpdateActivity();
  const [updating, setUpdating] = React.useState(false);

  const masters = useMemo(() => {
    if (!data || !Array.isArray(data)) return null;
    return data.filter((item: SpecialistItem) => item.profile?.role === 'master');
  }, [data]);

  const handleLookingForOrders = async () => {
    setUpdating(true);
    await updateActivity();
    setUpdating(false);
    refetch();
  };

  if (loading && !data) {
    return <LoadingScreen />;
  }

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <Text style={styles.title}>{t('specialists.title')}</Text>
        {role === 'master' && (
          <View style={styles.lookingBtn}>
            <Button
              title={t('specialists.lookingForOrders')}
              onPress={handleLookingForOrders}
              loading={updating}
            />
          </View>
        )}
        <FlatList
          data={masters as SpecialistItem[] | null}
          keyExtractor={item => item.user_id}
          renderItem={({item}) => (
            <SpecialistCard
              item={item}
              isMe={item.user_id === userId}
              onPress={() =>
                navigation.navigate('SpecialistProfile', {userId: item.user_id})
              }
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState message={t('specialists.noSpecialists')} />
          }
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
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  lookingBtn: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: {
    flexGrow: 1,
  },
});
