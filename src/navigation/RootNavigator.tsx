import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {supabase} from '../config/supabase';
import {useAuthStore} from '../stores/authStore';
import {usePushNotifications} from '../shared/hooks/usePushNotifications';
import {LoadingScreen} from '../shared/components/LoadingScreen';
import {AuthStack} from './AuthStack';
import {UnifiedTabs} from './UnifiedTabs';
import type {RootStackParamList} from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

function clearSession() {
  const {reset, setInitialized} = useAuthStore.getState();
  reset();
  setInitialized(true);
}

function loadProfileAndMaster(userId: string) {
  const {setProfile, setMasterProfile, setInitialized} =
    useAuthStore.getState();

  supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
    .then(({data, error}) => {
      if (error || !data) {
        supabase.auth.signOut().catch(() => {});
        clearSession();
        return;
      }
      setProfile(data);

      // Load master_profiles for ALL users (dual accounts)
      supabase
        .from('master_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
        .then(({data: mp}) => {
          setMasterProfile(mp ?? null);
          setInitialized(true);
        })
        .catch(() => {
          setMasterProfile(null);
          setInitialized(true);
        });
    })
    .catch(() => {
      supabase.auth.signOut().catch(() => {});
      clearSession();
    });
}

export function RootNavigator() {
  const session = useAuthStore(s => s.session);
  const role = useAuthStore(s => s.role);
  const initialized = useAuthStore(s => s.initialized);
  const setSession = useAuthStore(s => s.setSession);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({data: {session: s}}) => {
        if (!s) {
          clearSession();
          return;
        }
        setSession(s);
        loadProfileAndMaster(s.user.id);
      })
      .catch(() => clearSession());

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        clearSession();
      } else {
        loadProfileAndMaster(s.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  if (!initialized) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <PushNotificationHandler />
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!session || !role ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <Stack.Screen name="MainTabs" component={UnifiedTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function PushNotificationHandler() {
  usePushNotifications();
  return null;
}
