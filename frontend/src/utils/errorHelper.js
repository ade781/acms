/**
 * Error Helper Utilities for ARFF ACMS
 * 
 * Guarantees that any error object, rejection, Axios error, or unexpected value
 * is converted to a safe primitive string for React rendering.
 * Prevents "TypeError: Cannot convert object to primitive value" and 
 * "Objects are not valid as a React child".
 */

/**
 * Extract a human-readable, safe error message string from any value.
 * @param {any} error
 * @param {string} [fallback='Terjadi kendala operasional']
 * @returns {string} Safe string primitive
 */
export function getErrorMessage(error, fallback = 'Terjadi kendala operasional') {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error === 'number') return String(error);

  if (error instanceof Error) {
    return error.message || error.name || fallback;
  }

  if (typeof error === 'object') {
    // Check nested API response message candidates
    const candidate =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.data?.message ||
      error?.data?.error ||
      error?.message ||
      error?.msg ||
      error?.error;

    if (typeof candidate === 'string') return candidate;
    if (typeof candidate === 'number') return String(candidate);
    if (candidate && typeof candidate === 'object') {
      try {
        return JSON.stringify(candidate);
      } catch {
        // Fallback below
      }
    }

    try {
      const serialized = JSON.stringify(error);
      return serialized !== '{}' ? serialized : fallback;
    } catch {
      try {
        return Object.prototype.toString.call(error);
      } catch {
        return fallback;
      }
    }
  }

  try {
    return String(error);
  } catch {
    return fallback;
  }
}

/**
 * Safe helper for JSX rendering: {renderError(error)}
 * @param {any} error
 * @param {string} [fallback='Terjadi kesalahan sistem']
 * @returns {string|null}
 */
export function renderError(error, fallback = 'Terjadi kesalahan sistem') {
  const msg = getErrorMessage(error, fallback);
  return msg || null;
}

/**
 * Safely extract a field validation/helper message string from any value.
 * Single Source of Truth for InputField, SelectField, and TextareaField.
 * @param {any} val
 * @returns {string}
 */
export function getSafeFieldMessage(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val === true) return '';
  if (val instanceof Error) return val.message || val.name || '';
  if (typeof val === 'object') {
    const candidate = val.message || val.msg || val.error;
    if (typeof candidate === 'string') return candidate;
    try {
      return Array.isArray(val) ? val.join(', ') : JSON.stringify(val);
    } catch {
      return '';
    }
  }
  try {
    return String(val);
  } catch {
    return '';
  }
}
