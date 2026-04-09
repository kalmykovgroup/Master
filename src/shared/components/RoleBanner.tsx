import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useAuthStore} from '../../stores/authStore';
import {colors} from '../../config/colors';

export function RoleBanner() {
  const role = useAuthStore(s => s.role);
  const isMaster = role === 'master';

  return (
    <View style={[styles.banner, isMaster ? styles.masterBg : styles.clientBg]}>
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
  clientBg: {
    backgroundColor: colors.primary,
  },
  masterBg: {
    backgroundColor: colors.orange,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
