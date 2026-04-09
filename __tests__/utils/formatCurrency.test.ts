import {formatCurrency, formatBudgetRange} from '../../src/shared/utils/formatCurrency';

describe('formatCurrency', () => {
  it('converts kopecks to rubles', () => {
    const result = formatCurrency(150000);
    expect(result).toContain('1');
    expect(result).toContain('500');
  });

  it('handles zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });
});

describe('formatBudgetRange', () => {
  it('formats min and max', () => {
    const result = formatBudgetRange(100000, 200000);
    expect(result).toContain('—');
  });

  it('formats only min', () => {
    const result = formatBudgetRange(100000, null);
    expect(result).toContain('от');
  });

  it('formats only max', () => {
    const result = formatBudgetRange(null, 200000);
    expect(result).toContain('до');
  });

  it('returns empty for no budget', () => {
    expect(formatBudgetRange(null, null)).toBe('');
  });
});
