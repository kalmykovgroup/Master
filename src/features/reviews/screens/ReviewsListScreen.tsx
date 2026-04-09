import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useReviews} from '../hooks/useReviews';
import {ReviewCard} from '../components/ReviewCard';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import type {ProfileStackParamList} from '../../../types/navigation';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ReviewsList'>;

export function ReviewsListScreen({route}: Props) {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const {userId} = route.params;
  const {data, loading, refetch} = useReviews(userId);

  if (loading && !data) {
    return <LoadingScreen />;
  }

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <Text style={styles.title}>{t('reviews.reviews')}</Text>
        <FlatList
          data={data as any[] | null}
          keyExtractor={item => item.id}
          renderItem={({item}) => <ReviewCard review={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState message={t('reviews.noReviews')} />}
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
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
});
