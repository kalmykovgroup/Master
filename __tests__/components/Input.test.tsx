import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {Input} from '../../src/shared/components/Input';

describe('Input', () => {
  it('renders label', () => {
    const {getByText} = render(<Input label="Phone" />);
    expect(getByText('Phone')).toBeTruthy();
  });

  it('renders error message', () => {
    const {getByText} = render(<Input error="Required field" />);
    expect(getByText('Required field')).toBeTruthy();
  });

  it('calls onChangeText', () => {
    const onChange = jest.fn();
    const {getByPlaceholderText} = render(
      <Input placeholder="Enter text" onChangeText={onChange} />,
    );
    fireEvent.changeText(getByPlaceholderText('Enter text'), 'hello');
    expect(onChange).toHaveBeenCalledWith('hello');
  });
});
