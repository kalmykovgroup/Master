import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {StarRating} from '../../src/features/reviews/components/StarRating';

describe('StarRating', () => {
  it('renders 5 stars', () => {
    const {getByTestId} = render(
      <StarRating rating={3} testID="stars" />,
    );
    for (let i = 1; i <= 5; i++) {
      expect(getByTestId(`stars-star-${i}`)).toBeTruthy();
    }
  });

  it('calls onChange when star is pressed', () => {
    const onChange = jest.fn();
    const {getByTestId} = render(
      <StarRating rating={0} onChange={onChange} testID="stars" />,
    );
    fireEvent.press(getByTestId('stars-star-4'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('does not call onChange when readonly', () => {
    const onChange = jest.fn();
    const {getByTestId} = render(
      <StarRating rating={3} onChange={onChange} readonly testID="stars" />,
    );
    fireEvent.press(getByTestId('stars-star-4'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
