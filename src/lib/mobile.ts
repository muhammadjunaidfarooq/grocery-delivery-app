// Pakistani mobile numbers: the app shows a fixed "+92" prefix and the user
// types the other 10 digits (for example 3001234567). Used by the form and by
// the server so both apply the same rules.

export const MOBILE_PREFIX = "+92";

/** Keeps digits only and removes one leading 0 (so 0300... becomes 300...). */
export function cleanMobile(input: unknown): string {
  const digits = String(input ?? "").replace(/\D/g, "");
  return digits.startsWith("0") ? digits.slice(1) : digits;
}

/** Exactly 10 digits, starting with 3. Expects a value from cleanMobile(). */
export function isValidMobile(digits: string): boolean {
  return /^3\d{9}$/.test(digits);
}

/** "3001234567" -> "+923001234567" */
export function formatMobile(digits: string): string {
  return `${MOBILE_PREFIX}${digits}`;
}
