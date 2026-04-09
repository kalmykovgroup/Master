import React, {useState, useEffect, useRef, useCallback} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button} from '../../../shared/components/Button';
import {Input} from '../../../shared/components/Input';
import {usePhoneAuth} from '../hooks/usePhoneAuth';
import {isValidOtp} from '../../../shared/utils/validators';
import {formatPhone} from '../../../shared/utils/formatPhone';
import type {AuthStackParamList} from '../../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerify'>;

const DEV_OTP = __DEV__ ? '123456' : '';
const RESEND_COOLDOWN = 60;

export function OtpVerifyScreen({route}: Props) {
  const {t} = useTranslation();
  const {phone} = route.params;
  const [otp, setOtp] = useState(DEV_OTP);
  const {loading, error, verifyOtp, sendOtp} = usePhoneAuth();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleVerify = useCallback(async () => {
    if (loading) return;
    if (!isValidOtp(otp)) {
      setValidationError(t('auth.invalidOtp'));
      return;
    }
    setValidationError(null);
    await verifyOtp(phone, otp);
    // RootNavigator will auto-switch to MainTabs on session change
  }, [loading, otp, phone, t, verifyOtp]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || loading) return;
    await sendOtp(phone);
    setCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cooldown, loading, sendOtp, phone]);

  const resendTitle = cooldown > 0
    ? `${t('auth.resendCode')} (${cooldown})`
    : t('auth.resendCode');

  return (
    <View style={styles.outer}>
      <View style={styles.container}>
        <Text style={styles.title}>{t('auth.otpTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.otpSubtitle')} {formatPhone(phone)}
        </Text>
        <Input
          testID="otp-input"
          placeholder={t('auth.otpPlaceholder')}
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          error={validationError ?? error ?? undefined}
        />
        <Button
          testID="verify-btn"
          title={t('auth.verify')}
          onPress={handleVerify}
          loading={loading}
        />
        <Button
          title={resendTitle}
          onPress={handleResend}
          variant="outline"
          disabled={cooldown > 0}
          style={styles.resend}
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
  resend: {
    marginTop: 10,
  },
});
