import {useState} from 'react';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';
import {normalizePhone} from '../../../shared/utils/formatPhone';
import {unregisterDeviceToken} from '../../../shared/services/pushNotifications';
import type {UserRole} from '../../../config/constants';

export function usePhoneAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async (phone: string) => {
    setLoading(true);
    setError(null);
    const normalized = normalizePhone(phone);
    const {error: err} = await supabase.auth.signInWithOtp({phone: normalized});
    setLoading(false);
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  };

  const verifyOtp = async (phone: string, otp: string) => {
    setLoading(true);
    setError(null);
    const normalized = normalizePhone(phone);
    const {data, error: err} = await supabase.auth.verifyOtp({
      phone: normalized,
      token: otp,
      type: 'sms',
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return false;
    }
    if (data.session) {
      useAuthStore.getState().setSession(data.session);
    }
    return true;
  };

  const setRole = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    const session = useAuthStore.getState().session;
    if (!session) {
      setError('No session');
      setLoading(false);
      return false;
    }
    const {data, error: err} = await supabase
      .from('profiles')
      .update({role})
      .eq('id', session.user.id)
      .select()
      .single();
    setLoading(false);
    if (err) {
      setError(err.message);
      return false;
    }
    useAuthStore.getState().setProfile(data);
    return true;
  };

  const signOut = async () => {
    await unregisterDeviceToken();
    await supabase.auth.signOut();
    // onAuthStateChange in RootNavigator handles clearSession()
  };

  return {loading, error, sendOtp, verifyOtp, setRole, signOut};
}
