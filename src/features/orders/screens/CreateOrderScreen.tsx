import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useCreateOrder} from '../hooks/useOrders';
import {OrderForm} from '../components/OrderForm';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';

export function CreateOrderScreen() {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {createOrder} = useCreateOrder();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: {
    title: string;
    description: string;
    category: string;
    budget_min: number | null;
    budget_max: number | null;
    location: string;
  }) => {
    setLoading(true);
    const {error} = await createOrder(data);
    setLoading(false);
    if (!error) {
      navigation.goBack();
    }
  };

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <Text style={styles.title}>{t('orders.create')}</Text>
        <OrderForm onSubmit={handleSubmit} loading={loading} />
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
});
