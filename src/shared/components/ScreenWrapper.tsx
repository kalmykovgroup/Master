import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import type {ViewStyle} from 'react-native';

interface ScreenWrapperProps {
  children: React.ReactNode;
  maxWidth?: number;
  style?: ViewStyle;
}

export function ScreenWrapper({
  children,
  maxWidth = 600,
  style,
}: ScreenWrapperProps) {
  if (Platform.OS !== 'web') {
    return <View style={[styles.native, style]}>{children}</View>;
  }

  return (
    <View style={styles.outer}>
      <View style={[styles.container, {maxWidth}, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  native: {
    flex: 1,
  },
  outer: {
    flex: 1,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    flex: 1,
  },
});
