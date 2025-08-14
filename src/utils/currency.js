import cfg from '@/Config/currency.json';

// Get user currency from locale, allow override via ?currency=CODE or localStorage
export function getUserCurrency() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const forced = params.get('currency') || (typeof window !== 'undefined' ? localStorage.getItem('currency') : null);
  if (forced && cfg.rates[forced]) return forced;

  const languages = (typeof navigator !== 'undefined' && navigator.languages) ? navigator.languages : [navigator.language || 'en-GB'];
  const primary = (languages && languages.length > 0) ? languages[0] : 'en-GB';
  const parts = primary.split('-');
  const region = parts[1] ? parts[1].toUpperCase() : 'GB';

  // Region → currency mapping (extend as needed)
  const regionMap = {
    GB: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', PT: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR',
    US: 'USD', CA: 'CAD', AU: 'AUD', NZ: 'NZD', SG: 'SGD', HK: 'HKD', JP: 'JPY', CN: 'CNY', IN: 'INR', ZA: 'ZAR', SE: 'SEK', NO: 'NOK', DK: 'DKK', CH: 'CHF'
  };
  const candidate = regionMap[region] || 'GBP';
  return cfg.rates[candidate] ? candidate : 'GBP';
}

export function convertFromGbp(amountGbp, currencyCode) {
  const rate = cfg.rates[currencyCode] || 1;
  return amountGbp * rate;
}

export function formatCurrency(amount, currencyCode) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currencyCode} ${Math.round(amount).toLocaleString()}`;
  }
}

export function formatFromGbp(amountGbp) {
  const currency = getUserCurrency();
  const converted = convertFromGbp(amountGbp, currency);
  return { text: formatCurrency(converted, currency), currency };
}


