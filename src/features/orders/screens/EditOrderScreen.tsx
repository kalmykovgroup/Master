import React, {useState} from 'react';
import {StyleSheet, Text, View, Pressable} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {useOrderDetail, useUpdateOrder} from '../hooks/useOrders';
import {OrderForm} from '../components/OrderForm';
import type {OrderFormData} from '../components/OrderForm';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import type {ClientOrdersStackParamList} from '../../../types/navigation';

type RouteType = RouteProp<ClientOrdersStackParamList, 'EditOrder'>;

export function EditOrderScreen() {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const {orderId} = route.params;
  const {data: order, loading: orderLoading} = useOrderDetail(orderId);
  const {updateOrder} = useUpdateOrder();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data: OrderFormData) => {
    setSaving(true);
    const {error} = await updateOrder(orderId, {
      title: data.title,
      description: data.description,
      category: data.category,
      budget_min: data.budget_min,
      budget_max: data.budget_max,
      location: data.location || null,
    });
    setSaving(false);
    if (!error) {
      navigation.goBack();
    }
  };

  if (orderLoading && !order) {
    return <LoadingScreen />;
  }

  if (!order) {
    return null;
  }

  const initialValues: OrderFormData = {
    title: order.title,
    description: order.description,
    category: order.category,
    budget_min: order.budget_min,
    budget_max: order.budget_max,
    location: order.location ?? '',
  };

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>{'\u2190'}</Text>
          </Pressable>
          <Text style={styles.title}>{t('orders.edit')}</Text>
        </View>
        <OrderForm
          onSubmit={handleSubmit}
          loading={saving}
          initialValues={initialValues}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  backText: {
    fontSize: 24,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
});
