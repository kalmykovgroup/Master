export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return (
    (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) ||
    (digits.length === 10)
  );
}

export function isValidOtp(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function isValidRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}
