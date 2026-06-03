export const getCurrencySymbol = (code: string): string => {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    AUD: 'A$',
    '$': '$',
    '€': '€',
    '£': '£',
    '₹': '₹',
    'A$': 'A$'
  };
  return symbols[code] || '$';
};
