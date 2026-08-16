export const isIndianStock = (symbol = '', exchange = '') => {
  const symbolValue = String(symbol).trim().toUpperCase();
  const exchangeValue = String(exchange).trim().toUpperCase();

  return (
    exchangeValue.includes('NSE') ||
    exchangeValue.includes('BSE') ||
    symbolValue.endsWith('.NS') ||
    symbolValue.endsWith('.BO') ||
    symbolValue.includes('NSE') ||
    symbolValue.includes('BSE')
  );
};

export const getCurrencyCode = (symbol = '', exchange = '') =>
  isIndianStock(symbol, exchange) ? 'INR' : 'USD';

export const formatCurrencyValue = (value, symbol = '', exchange = '', options = {}) => {
  const amount = Number(value ?? 0);
  const currency = getCurrencyCode(symbol, exchange);
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
};

export const formatCompactCurrency = (value, symbol = '', exchange = '') => {
  const amount = Number(value ?? 0);
  const abs = Math.abs(amount);
  const currency = getCurrencyCode(symbol, exchange);
  const symbolText = currency === 'INR' ? '₹' : '$';

  if (abs >= 1_000_000_000_000) return `${symbolText}${(abs / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${symbolText}${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${symbolText}${(abs / 1_000_000).toFixed(2)}M`;

  return `${symbolText}${new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs)}`;
};
