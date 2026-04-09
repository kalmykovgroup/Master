import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {PhoneEntryScreen} from '../features/auth/screens/PhoneEntryScreen';
import {OtpVerifyScreen} from '../features/auth/screens/OtpVerifyScreen';
import type {AuthStackParamList} from '../types/navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
    </Stack.Navigator>
  );
}
