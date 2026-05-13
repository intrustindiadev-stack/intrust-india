export function sanitizeQuery(raw) {
  if (typeof raw !== 'string') return '';
  const sanitized = raw
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 200);
  return sanitized.trim();
}

/**
 * Neutralizes characters that have special meaning in PostgREST or ILIKE patterns.
 * We neutralize:
 * - % and _ which are ILIKE wildcards.
 * - * which can be interpreted as a wildcard in some contexts.
 * - , ( ) : which are PostgREST control characters for 'or' and 'and' filters.
 */
export function escapeIlikeTerm(term) {
  if (typeof term !== 'string') return '';
  return term
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\*/g, '')
    .replace(/[,():]/g, '');
}

export function truncate(str, max = 100) {
  if (typeof str !== 'string') return '';
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
}
