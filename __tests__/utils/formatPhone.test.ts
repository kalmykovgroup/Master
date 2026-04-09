import {formatPhone, normalizePhone} from '../../src/shared/utils/formatPhone';

describe('formatPhone', () => {
  it('formats 11-digit Russian number', () => {
    expect(formatPhone('+79991234567')).toBe('+7 (999) 123-45-67');
  });

  it('returns unformatted for non-standard numbers', () => {
    expect(formatPhone('12345')).toBe('12345');
  });
});

describe('normalizePhone', () => {
  it('normalizes 8-prefix to +7', () => {
    expect(normalizePhone('89991234567')).toBe('+79991234567');
  });

  it('normalizes 10-digit to +7', () => {
    expect(normalizePhone('9991234567')).toBe('+79991234567');
  });

  it('normalizes 7-prefix', () => {
    expect(normalizePhone('79991234567')).toBe('+79991234567');
  });

  it('strips formatting characters', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('+79991234567');
  });
});
