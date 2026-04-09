export function formatCurrency(kopecks: number): string {
  const rubles = kopecks / 100;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rubles);
}

export function formatBudgetRange(
  min: number | null,
  max: number | null,
): string {
  if (min && max) {
    return `${formatCurrency(min)} — ${formatCurrency(max)}`;
  }
  if (min) {
    return `от ${formatCurrency(min)}`;
  }
  if (max) {
    return `до ${formatCurrency(max)}`;
  }
  return '';
}
