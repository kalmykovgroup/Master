import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

export function LoadingScreen() {
  return (
    <View style={styles.container} testID="loading-screen">
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
