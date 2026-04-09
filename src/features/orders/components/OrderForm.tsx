import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text, Pressable, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Button} from '../../../shared/components/Button';
import {Input} from '../../../shared/components/Input';
import {ORDER_CATEGORIES} from '../../../config/constants';

export interface OrderFormData {
  title: string;
  description: string;
  category: string;
  budget_min: number | null;
  budget_max: number | null;
  location: string;
}

interface OrderFormProps {
  onSubmit: (data: OrderFormData) => Promise<void>;
  loading?: boolean;
  initialValues?: OrderFormData;
}

export function OrderForm({onSubmit, loading, initialValues}: OrderFormProps) {
  const {t} = useTranslation();
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [category, setCategory] = useState(initialValues?.category ?? '');
  const [budgetMin, setBudgetMin] = useState(
    initialValues?.budget_min ? String(initialValues.budget_min / 100) : '',
  );
  const [budgetMax, setBudgetMax] = useState(
    initialValues?.budget_max ? String(initialValues.budget_max / 100) : '',
  );
  const [location, setLocation] = useState(initialValues?.location ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) {
      e.title = t('orders.titleRequired');
    }
    if (!description.trim()) {
      e.description = t('orders.descriptionRequired');
    }
    if (!category) {
      e.category = t('orders.categoryRequired');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      budget_min: budgetMin ? parseInt(budgetMin, 10) * 100 : null,
      budget_max: budgetMax ? parseInt(budgetMax, 10) * 100 : null,
      location: location.trim(),
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Input
        label={t('orders.title')}
        value={title}
        onChangeText={setTitle}
        error={errors.title}
        testID="order-title-input"
      />
      <Input
        label={t('orders.description')}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        error={errors.description}
        testID="order-desc-input"
      />

      <Text style={styles.label}>{t('orders.category')}</Text>
      <View style={styles.categories}>
        {ORDER_CATEGORIES.map(cat => (
          <Pressable
            key={cat}
            style={[styles.chip, category === cat && styles.chipSelected]}
            onPress={() => setCategory(cat)}>
            <Text
              style={[
                styles.chipText,
                category === cat && styles.chipTextSelected,
              ]}>
              {t(`categories.${cat}`)}
            </Text>
          </Pressable>
        ))}
      </View>
      {errors.category && <Text style={styles.error}>{errors.category}</Text>}

      <View style={styles.row}>
        <Input
          label={t('orders.budgetMin')}
          value={budgetMin}
          onChangeText={setBudgetMin}
          keyboardType="numeric"
          containerStyle={styles.halfInput}
        />
        <Input
          label={t('orders.budgetMax')}
          value={budgetMax}
          onChangeText={setBudgetMax}
          keyboardType="numeric"
          containerStyle={styles.halfInput}
        />
      </View>

      <Input
        label={t('orders.location')}
        value={location}
        onChangeText={setLocation}
      />

      <Button
        title={initialValues ? t('common.save') : t('orders.publish')}
        onPress={handleSubmit}
        loading={loading}
        testID="publish-order-btn"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C6C6C8',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E5F1FF',
  },
  chipText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  chipTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  error: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: -12,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
});
