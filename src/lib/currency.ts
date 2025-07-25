export const CURRENCY_CONFIG = {
  currency: 'USD',
  locale: 'en-US',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

export function formatCurrency(
  amount: number | null | undefined,
  options?: Partial<typeof CURRENCY_CONFIG>
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '-';
  }
  
  const config = { ...CURRENCY_CONFIG, ...options };
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: config.minimumFractionDigits,
    maximumFractionDigits: config.maximumFractionDigits,
  }).format(amount);
}

export function parseCurrency(value: string): number {
  // Remove all non-numeric characters except decimal points and negative signs
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  // Return 0 for invalid numbers, and ensure non-negative values
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

export function validateCurrencyAmount(amount: number): boolean {
  return typeof amount === 'number' && !isNaN(amount) && amount >= 0;
}

export function roundToTwoDecimals(amount: number): number {
  return Math.round(amount * 100) / 100;
}
