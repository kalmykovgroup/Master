import React from 'react';
import {render} from '@testing-library/react-native';
import {EmptyState} from '../../src/shared/components/EmptyState';

describe('EmptyState', () => {
  it('renders message', () => {
    const {getByText} = render(<EmptyState message="No data found" />);
    expect(getByText('No data found')).toBeTruthy();
  });

  it('renders with testID', () => {
    const {getByTestId} = render(
      <EmptyState message="No data" testID="empty" />,
    );
    expect(getByTestId('empty')).toBeTruthy();
  });
});
