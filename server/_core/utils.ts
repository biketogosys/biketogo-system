/**
 * Sanitization utilities for PostgreSQL inserts/updates.
 *
 * PostgreSQL rejects empty strings ("") for typed columns (numeric, timestamp,
 * enum, boolean). These helpers convert empty strings and "undefined" literals
 * to null so Drizzle ORM passes the correct value to the database driver.
 */

/**
 * Converts "", "undefined", undefined, or null to null.
 * All other values are returned as-is.
 */
export function sanitize(val: unknown): unknown {
  if (val === "" || val === "undefined" || val === undefined || val === null) {
    return null;
  }
  return val;
}

/**
 * Converts a date string to a Date object, or null if the value is empty/invalid.
 * Use for `timestamp` columns in Drizzle (e.g. returnedAt, createdAt).
 * Accepts ISO 8601 strings (e.g. "2025-06-15T10:00:00Z").
 */
export function sanitizeDate(val: unknown): Date | null {
  if (val === "" || val === "undefined" || val === undefined || val === null) {
    return null;
  }
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Converts a date string to a YYYY-MM-DD string, or null if the value is empty/invalid.
 * Use for `date` columns in Drizzle (e.g. startDate, endDate, birthDate).
 * PostgreSQL `date` columns expect strings, not Date objects.
 */
export function sanitizeDateString(val: unknown): string | null {
  if (val === "" || val === "undefined" || val === undefined || val === null) {
    return null;
  }
  const s = String(val).trim();
  // Accept YYYY-MM-DD directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Try to parse and extract date part
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Converts a numeric string to a string suitable for Drizzle numeric columns,
 * or null if the value is empty/invalid.
 * Drizzle's numeric() columns accept string values — this just ensures
 * empty strings don't reach the DB.
 */
export function sanitizeNumeric(val: unknown): string | null {
  if (val === "" || val === "undefined" || val === undefined || val === null) {
    return null;
  }
  const n = Number(val);
  if (isNaN(n)) return null;
  return String(val);
}

/**
 * Sanitizes a phone number for WhatsApp/Z-API:
 * - Removes all non-numeric characters (spaces, (, ), -, +)
 * - Ensures the number starts with country code 55 (Brazil)
 * - Never duplicates the 55 prefix
 *
 * Examples:
 *   (43) 98820-1901       → 5543988201901
 *   +55 43 98820-1901     → 5543988201901
 *   5543988201901         → 5543988201901
 *   43988201901           → 5543988201901
 */
export function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // Add 55 prefix if not already present
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

/**
 * Sanitizes an entire object by applying sanitize() to all values.
 * Useful for bulk sanitization of optional fields before insert/update.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[key] = sanitize(obj[key]);
  }
  return result as T;
}
