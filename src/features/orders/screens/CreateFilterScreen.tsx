import React, {useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useSavedFilters} from '../hooks/useSavedFilters';
import {Input} from '../../../shared/components/Input';
import {Button} from '../../../shared/components/Button';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import {ORDER_CATEGORIES} from '../../../config/constants';
import {colors} from '../../../config/colors';

export function CreateFilterScreen() {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {createFilter} = useSavedFilters();

  const [name, setName] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleCategory = (cat: string) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat],
    );
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) {
      e.name = t('filters.filterName');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    const {error} = await createFilter({
      name: name.trim(),
      categories,
      budget_min: budgetMin ? parseInt(budgetMin, 10) * 100 : null,
      budget_max: budgetMax ? parseInt(budgetMax, 10) * 100 : null,
      location: location.trim() || null,
    });
    setLoading(false);
    if (!error) {
      navigation.goBack();
    }
  };

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </Pressable>
          <Text style={styles.title}>{t('filters.filter')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <Input
            label={t('filters.filterName')}
            value={name}
            onChangeText={setName}
            placeholder={t('filters.filterNamePlaceholder')}
            error={errors.name}
          />

          <Text style={styles.label}>{t('filters.selectCategories')}</Text>
          <View style={styles.categories}>
            {ORDER_CATEGORIES.map(cat => {
              const isSelected = categories.includes(cat);
              return (
                <Pressable
                  key={cat}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleCategory(cat)}>
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}>
                    {t(`categories.${cat}` as const)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.row}>
            <Input
              label={t('filters.budgetFrom')}
              value={budgetMin}
              onChangeText={setBudgetMin}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
            <Input
              label={t('filters.budgetTo')}
              value={budgetMax}
              onChangeText={setBudgetMax}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
          </View>

          <Input
            label={t('filters.location')}
            value={location}
            onChangeText={setLocation}
            placeholder={t('filters.locationPlaceholder')}
          />

          <Button
            title={t('filters.save')}
            onPress={handleSave}
            loading={loading}
          />
        </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separatorLight,
  },
  backText: {
    fontSize: 16,
    color: colors.primary,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  headerSpacer: {
    width: 50,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
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
    borderColor: colors.separator,
    backgroundColor: colors.bg,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
});
