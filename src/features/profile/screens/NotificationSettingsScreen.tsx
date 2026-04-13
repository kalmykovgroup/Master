import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {colors} from '../../../config/colors';
import {useAccent} from '../../../shared/hooks/useAccent';
import {useNotificationSettings} from '../hooks/useNotificationSettings';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';

type SettingKey =
  | 'response_received'
  | 'master_completed'
  | 'special_offer'
  | 'response_accepted'
  | 'response_rejected'
  | 'client_completed'
  | 'new_message';

function ToggleRow({
  label,
  value,
  onToggle,
  accentColor,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  accentColor: string;
}) {
  return (
    <Pressable style={styles.row} onPress={onToggle}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View
        style={[
          styles.toggle,
          {backgroundColor: value ? accentColor : colors.separatorLight},
        ]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
    </Pressable>
  );
}

export function NotificationSettingsScreen() {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const accentColor = useAccent();
  const {settings, loading, toggle} = useNotificationSettings();

  if (loading || !settings) {
    return (
      <ScreenWrapper>
        <View style={[styles.container, {paddingTop: insets.top}]}>
          <ActivityIndicator style={styles.loader} color={accentColor} />
        </View>
      </ScreenWrapper>
    );
  }

  const clientSettings: {key: SettingKey; label: string}[] = [
    {key: 'response_received', label: t('notifications.responseReceived')},
    {key: 'master_completed', label: t('notifications.masterCompleted')},
    {key: 'special_offer', label: t('notifications.specialOffer')},
  ];

  const masterSettings: {key: SettingKey; label: string}[] = [
    {key: 'response_accepted', label: t('notifications.responseAccepted')},
    {key: 'response_rejected', label: t('notifications.responseRejected')},
    {key: 'client_completed', label: t('notifications.clientCompleted')},
  ];

  const generalSettings: {key: SettingKey; label: string}[] = [
    {key: 'new_message', label: t('notifications.newMessage')},
  ];

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Text style={styles.backBtn}>{t('common.back')}</Text>
          </Pressable>
          <Text style={styles.title}>{t('notifications.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>
            {t('notifications.clientEvents')}
          </Text>
          <View style={styles.section}>
            {clientSettings.map((s, i) => (
              <React.Fragment key={s.key}>
                {i > 0 && <View style={styles.divider} />}
                <ToggleRow
                  label={s.label}
                  value={settings[s.key]}
                  onToggle={() => toggle(s.key)}
                  accentColor={accentColor}
                />
              </React.Fragment>
            ))}
          </View>

          <Text style={styles.sectionTitle}>
            {t('notifications.masterEvents')}
          </Text>
          <View style={styles.section}>
            {masterSettings.map((s, i) => (
              <React.Fragment key={s.key}>
                {i > 0 && <View style={styles.divider} />}
                <ToggleRow
                  label={s.label}
                  value={settings[s.key]}
                  onToggle={() => toggle(s.key)}
                  accentColor={accentColor}
                />
              </React.Fragment>
            ))}
          </View>

          <Text style={styles.sectionTitle}>
            {t('notifications.general')}
          </Text>
          <View style={styles.section}>
            {generalSettings.map((s, i) => (
              <React.Fragment key={s.key}>
                {i > 0 && <View style={styles.divider} />}
                <ToggleRow
                  label={s.label}
                  value={settings[s.key]}
                  onToggle={() => toggle(s.key)}
                  accentColor={accentColor}
                />
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  backBtn: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  headerSpacer: {
    width: 50,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 16,
    marginLeft: 16,
  },
  section: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLabel: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginLeft: 16,
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
});
