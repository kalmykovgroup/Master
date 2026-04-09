import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {Button} from '../../src/shared/components/Button';

describe('Button', () => {
  it('renders title', () => {
    const {getByText} = render(<Button title="Press me" onPress={() => {}} />);
    expect(getByText('Press me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const {getByText} = render(<Button title="Press me" onPress={onPress} />);
    fireEvent.press(getByText('Press me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows activity indicator when loading', () => {
    const {queryByText} = render(
      <Button title="Press me" onPress={() => {}} loading />,
    );
    expect(queryByText('Press me')).toBeNull();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const {getByText} = render(
      <Button title="Press me" onPress={onPress} disabled />,
    );
    fireEvent.press(getByText('Press me'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
