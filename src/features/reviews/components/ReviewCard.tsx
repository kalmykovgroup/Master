import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {StarRating} from './StarRating';
import {formatRelative} from '../../../shared/utils/formatDate';

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    reviewer?: {
      display_name: string | null;
    } | null;
  };
  testID?: string;
}

export function ReviewCard({review, testID}: ReviewCardProps) {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.name}>
          {review.reviewer?.display_name ?? ''}
        </Text>
        <Text style={styles.date}>{formatRelative(review.created_at)}</Text>
      </View>
      <StarRating rating={review.rating} readonly size={16} />
      {review.comment && (
        <Text style={styles.comment}>{review.comment}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  date: {
    fontSize: 12,
    color: '#8E8E93',
  },
  comment: {
    fontSize: 14,
    color: '#000000',
    marginTop: 6,
    lineHeight: 19,
  },
});
