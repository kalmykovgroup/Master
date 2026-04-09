import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

interface EmptyStateProps {
  message: string;
  testID?: string;
}

export function EmptyState({message, testID}: EmptyStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
