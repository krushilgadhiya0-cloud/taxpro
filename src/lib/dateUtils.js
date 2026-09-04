/**
 * TaxPro Universal Date Formatting Utilities
 * Enforces DD/MM/YY everywhere across the entire platform.
 */

/**
 * Formats any Date object, timestamp, or date string to DD/MM/YY.
 * Example: '2026-09-03' -> '03/09/26'
 *          '2026-08-23T18:30:00.000Z' -> '24/08/26'
 *          new Date() -> '03/09/26'
 */
export function formatDate(val, fallback = '-') {
  if (!val) return fallback;
  try {
    if (typeof val === 'string') {
      const s = val.trim();
      // Handle YYYY-MM-DD cleanly without timezone offset shift
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-');
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y.slice(-2)}`;
      }
      // Already DD/MM/YY
      if (/^\d{2}\/\d{2}\/\d{2}$/.test(s)) {
        return s;
      }
      // Handle DD/MM/YYYY -> DD/MM/YY
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [d, m, y] = s.split('/');
        return `${d}/${m}/${y.slice(-2)}`;
      }
      // Handle DD-MM-YYYY -> DD/MM/YY
      if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
        const [d, m, y] = s.split('-');
        return `${d}/${m}/${y.slice(-2)}`;
      }
    }

    const d = (val instanceof Date) ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  } catch (err) {
    return String(val);
  }
}

/**
 * Formats a date with time: DD/MM/YY, hh:mm A
 * Example: '03/09/26, 11:45 AM'
 */
export function formatDateTime(val, fallback = '-') {
  if (!val) return fallback;
  try {
    const d = (val instanceof Date) ? val : new Date(val);
    if (isNaN(d.getTime())) return formatDate(val, fallback);

    const datePart = formatDate(d);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const hoursStr = String(hours).padStart(2, '0');

    return `${datePart}, ${hoursStr}:${minutes} ${ampm}`;
  } catch (err) {
    return formatDate(val, fallback);
  }
}

/**
 * Formats a date with short weekday: e.g. "Thu, 03/09/26"
 */
export function formatDateWithWeekday(val, fallback = '-') {
  if (!val) return fallback;
  try {
    const d = (val instanceof Date) ? val : new Date(val);
    if (isNaN(d.getTime())) return formatDate(val, fallback);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = days[d.getDay()];
    return `${weekday}, ${formatDate(d)}`;
  } catch (err) {
    return formatDate(val, fallback);
  }
}

/**
 * Returns today's date in DD/MM/YY string format.
 */
export function getTodayDDMMYY() {
  return formatDate(new Date());
}

/**
 * Installs platform-wide interceptor so any standard toLocaleDateString()
 * call without single-field queries defaults to DD/MM/YY.
 */
export function installGlobalDateFormat() {
  const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
  if (root.__taxpro_date_installed) return;
  root.__taxpro_date_installed = true;

  const originalToLocaleDateString = Date.prototype.toLocaleDateString;

  Date.prototype.toLocaleDateString = function (locales, options) {
    // If the caller is specifically asking ONLY for weekday or ONLY for month name, allow it:
    if (options && (options.weekday || options.month) && !options.day && !options.year) {
      return originalToLocaleDateString.call(this, locales, options);
    }
    // In all other cases (full date, default call, en-IN/en-US, etc.), enforce DD/MM/YY:
    const day = String(this.getDate()).padStart(2, '0');
    const month = String(this.getMonth() + 1).padStart(2, '0');
    const year = String(this.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  Date.prototype.toTaxProDate = function () {
    return formatDate(this);
  };
}
