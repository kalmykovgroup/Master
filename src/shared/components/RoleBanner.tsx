import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useAuthStore} from '../../stores/authStore';
import {useAccent} from '../hooks/useAccent';

export function RoleBanner() {
  const role = useAuthStore(s => s.role);
  const accentColor = useAccent();
  const isMaster = role === 'master';

  return (
    <View style={[styles.banner, {backgroundColor: accentColor}]}>
      <Text style={styles.text}>
        {isMaster ? '\u{1F527} \u041C\u0410\u0421\u0422\u0415\u0420' : '\u{1F464} \u041A\u041B\u0418\u0415\u041D\u0422'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
