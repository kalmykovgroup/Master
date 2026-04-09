import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button} from '../../../shared/components/Button';
import {Input} from '../../../shared/components/Input';
import {usePhoneAuth} from '../hooks/usePhoneAuth';
import {isValidPhone} from '../../../shared/utils/validators';
import type {AuthStackParamList} from '../../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>;

const DEV_PHONE = '+7 (926) 012-81-87';

function formatPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let d = digits;
  if (d.startsWith('8') && d.length > 1) {
    d = '7' + d.slice(1);
  }
  if (d.startsWith('7')) {
    d = d.slice(1);
  }
  let result = '+7';
  if (d.length > 0) result += ' (' + d.slice(0, 3);
  if (d.length >= 3) result += ') ';
  if (d.length > 3) result += d.slice(3, 6);
  if (d.length > 6) result += '-' + d.slice(6, 8);
  if (d.length > 8) result += '-' + d.slice(8, 10);
  return result;
}

function extractDigits(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

export function PhoneEntryScreen({navigation}: Props) {
  const {t} = useTranslation();
  const [displayPhone, setDisplayPhone] = useState(DEV_PHONE);
  const {loading, error, sendOtp} = usePhoneAuth();
  const [validationError, setValidationError] = useState<string | null>(null);

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 11) {
      setDisplayPhone(formatPhoneMask(text));
    }
  };

  const handleSend = async () => {
    const raw = '+' + extractDigits(displayPhone);
    if (!isValidPhone(raw)) {
      setValidationError(t('auth.invalidPhone'));
      return;
    }
    setValidationError(null);
    const success = await sendOtp(raw);
    if (success) {
      navigation.navigate('OtpVerify', {phone: raw});
    }
  };

  return (
    <View style={styles.outer}>
      <View style={styles.container}>
        <Text style={styles.title}>{t('auth.phoneTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.phoneSubtitle')}</Text>
        <Input
          testID="phone-input"
          placeholder={t('auth.phonePlaceholder')}
          value={displayPhone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          autoFocus
          error={validationError ?? error ?? undefined}
        />
        <Button
          testID="send-code-btn"
          title={t('auth.sendCode')}
          onPress={handleSend}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  container: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },
});
