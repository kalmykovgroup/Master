import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Button} from '../../../shared/components/Button';
import {Input} from '../../../shared/components/Input';
import {StarRating} from './StarRating';

interface ReviewFormProps {
  onSubmit: (rating: number, comment: string) => Promise<void>;
  loading?: boolean;
}

export function ReviewForm({onSubmit, loading}: ReviewFormProps) {
  const {t} = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (rating === 0) {
      setError(t('reviews.ratingRequired'));
      return;
    }
    setError(null);
    onSubmit(rating, comment);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('reviews.rating')}</Text>
      <StarRating rating={rating} onChange={setRating} testID="review-stars" />
      {error && <Text style={styles.error}>{error}</Text>}

      <Input
        label={t('reviews.comment')}
        placeholder={t('reviews.commentPlaceholder')}
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={4}
        containerStyle={styles.commentInput}
        testID="review-comment-input"
      />
      <Button
        title={t('reviews.submit')}
        onPress={handleSubmit}
        loading={loading}
        testID="submit-review-btn"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  error: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  commentInput: {
    marginTop: 16,
  },
});
