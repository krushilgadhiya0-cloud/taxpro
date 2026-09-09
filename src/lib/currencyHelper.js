// Universal Multi-Currency Engine for TaxPro PMS
import { useState, useEffect } from 'react';

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', country: 'India', flag: '🇮🇳', locale: 'en-IN' },
  { code: 'USD', symbol: '$', name: 'US Dollar', country: 'United States', flag: '🇺🇸', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', country: 'European Union', flag: '🇪🇺', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', country: 'United Kingdom', flag: '🇬🇧', locale: 'en-GB' },
  { code: 'AED', symbol: 'AED ', name: 'UAE Dirham', country: 'United Arab Emirates', flag: '🇦🇪', locale: 'en-AE' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', country: 'Canada', flag: '🇨🇦', locale: 'en-CA' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', country: 'Australia', flag: '🇦🇺', locale: 'en-AU' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', country: 'Singapore', flag: '🇸🇬', locale: 'en-SG' },
  { code: 'SAR', symbol: 'SAR ', name: 'Saudi Riyal', country: 'Saudi Arabia', flag: '🇸🇦', locale: 'ar-SA' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', country: 'Japan', flag: '🇯🇵', locale: 'ja-JP' }
];

export const getActiveCurrency = () => {
  try {
    const saved = localStorage.getItem('taxpro_currency');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.code) {
        return SUPPORTED_CURRENCIES.find(c => c.code === parsed.code) || parsed;
      }
    }
  } catch (e) {}
  return SUPPORTED_CURRENCIES[0]; // Default INR (₹)
};

export const getCurrencySymbol = () => {
  return getActiveCurrency().symbol;
};

export const formatCurrency = (val, decimals = null) => {
  const curr = getActiveCurrency();
  if (val === null || val === undefined || val === '') {
    return `${curr.symbol}0`;
  }

  let num = 0;
  if (typeof val === 'number') {
    num = val;
  } else {
    const cleanStr = String(val).replace(/[^0-9.-]/g, '');
    num = parseFloat(cleanStr) || 0;
  }

  const dec = decimals !== null ? decimals : (num % 1 === 0 ? 0 : 2);
  const formattedNum = num.toLocaleString(curr.locale || 'en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });

  return `${curr.symbol}${formattedNum}`;
};

export const replaceCurrencySymbol = (val) => {
  if (val === null || val === undefined) return '';
  const curr = getActiveCurrency();
  const s = String(val);
  // Replaces known currency symbols or prefixes with active symbol
  return s.replace(/[₹$€£¥]|AED\s?|CA\$|AU\$|S\$|SAR\s?/g, curr.symbol);
};

export const setGlobalCurrency = (currencyCode) => {
  const found = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];
  localStorage.setItem('taxpro_currency', JSON.stringify(found));
  localStorage.setItem('taxpro_currency_code', found.code);
  localStorage.setItem('taxpro_currency_symbol', found.symbol);

  // Dispatch events to re-render all views in real-time
  window.dispatchEvent(new CustomEvent('taxpro_currency_updated', { detail: found }));
  window.dispatchEvent(new CustomEvent('taxpro_financial_updated'));
  window.dispatchEvent(new CustomEvent('taxpro_db_updated'));
  window.dispatchEvent(new CustomEvent('storage'));
  return found;
};

export const useCurrency = () => {
  const [currency, setCurrency] = useState(getActiveCurrency);

  useEffect(() => {
    const handleUpdate = () => {
      setCurrency(getActiveCurrency());
    };
    window.addEventListener('taxpro_currency_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('taxpro_currency_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return currency;
};
