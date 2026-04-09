import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
  testID?: string;
}

export function StarRating({
  rating,
  onChange,
  size = 28,
  readonly = false,
  testID,
}: StarRatingProps) {
  return (
    <View style={styles.container} testID={testID}>
      {[1, 2, 3, 4, 5].map(star => (
        <Pressable
          key={star}
          onPress={() => !readonly && onChange?.(star)}
          disabled={readonly}
          testID={testID ? `${testID}-star-${star}` : undefined}>
          <Text style={[styles.star, {fontSize: size}]}>
            {star <= rating ? '\u2605' : '\u2606'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    color: '#F59E0B',
  },
});
