import { clsx } from "clsx";

export function cn(...inputs) {
  return clsx(inputs);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function isValidUUID(uuid) {
  if (typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Normalise an optional text form value for a nullable DB column.
 * Empty / whitespace-only strings become null, so a round-tripped blank input
 * is not mistaken for a change against a column that is NULL in the database.
 */
export function toNullableText(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Return only the keys of `candidate` whose value differs from `current`
 * (the row as persisted in the database).
 *
 * Use this to build minimal "dirty" payloads before UPDATE / PATCH calls.
 * Sending the whole form back has two failure modes:
 *   1. Protected-column DB guards (e.g. merchants_sensitive_column_guard) see
 *      an unrelated column in the statement and raise "<col> is protected".
 *   2. A blank input round-tripped as '' is DISTINCT FROM a NULL column, which
 *      also trips those guards for columns the user never touched.
 *
 * @param {Object} candidate - { columnName: nextValue }
 * @param {Object} current   - the persisted row (extra keys are ignored)
 * @returns {Object} only the changed keys
 */
export function pickDirtyFields(candidate = {}, current = {}) {
  const dirty = {};
  for (const [key, nextValue] of Object.entries(candidate)) {
    if (nextValue === undefined) continue;
    const prevValue = current?.[key] ?? null;
    // Compare in normalised form: a blank string and NULL both mean "empty",
    // so a round-tripped blank input never registers as a change.
    if (normalizeForCompare(nextValue) !== normalizeForCompare(prevValue)) {
      dirty[key] = nextValue;
    }
  }
  return dirty;
}

/**
 * Internal comparison normaliser: strings are trimmed and blanks collapse to
 * null; everything else is compared as-is (so a type change is a change).
 */
function normalizeForCompare(value) {
  if (typeof value === 'string') return toNullableText(value);
  return value ?? null;
}
