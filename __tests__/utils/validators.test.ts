import {isValidPhone, isValidOtp, isNotEmpty, isValidRating} from '../../src/shared/utils/validators';

describe('validators', () => {
  describe('isValidPhone', () => {
    it('accepts 11-digit number starting with 7', () => {
      expect(isValidPhone('+79991234567')).toBe(true);
    });

    it('accepts 11-digit number starting with 8', () => {
      expect(isValidPhone('89991234567')).toBe(true);
    });

    it('accepts 10-digit number', () => {
      expect(isValidPhone('9991234567')).toBe(true);
    });

    it('accepts formatted number', () => {
      expect(isValidPhone('+7 (999) 123-45-67')).toBe(true);
    });

    it('rejects short number', () => {
      expect(isValidPhone('12345')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidPhone('')).toBe(false);
    });
  });

  describe('isValidOtp', () => {
    it('accepts 6-digit code', () => {
      expect(isValidOtp('123456')).toBe(true);
    });

    it('rejects 5-digit code', () => {
      expect(isValidOtp('12345')).toBe(false);
    });

    it('rejects letters', () => {
      expect(isValidOtp('abc123')).toBe(false);
    });
  });

  describe('isNotEmpty', () => {
    it('returns true for non-empty string', () => {
      expect(isNotEmpty('hello')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isNotEmpty('')).toBe(false);
    });

    it('returns false for whitespace', () => {
      expect(isNotEmpty('   ')).toBe(false);
    });
  });

  describe('isValidRating', () => {
    it('accepts 1-5', () => {
      for (let i = 1; i <= 5; i++) {
        expect(isValidRating(i)).toBe(true);
      }
    });

    it('rejects 0', () => {
      expect(isValidRating(0)).toBe(false);
    });

    it('rejects 6', () => {
      expect(isValidRating(6)).toBe(false);
    });

    it('rejects decimals', () => {
      expect(isValidRating(3.5)).toBe(false);
    });
  });
});
