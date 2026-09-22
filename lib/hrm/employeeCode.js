/**
 * Shared employee-code (badge) generator for HRM.
 *
 * Format: EMP + 5 digits (e.g. EMP48210) — matches the historical
 * convention in hire-candidate. Existing legacy codes (1100, INT003,
 * Intrust2000, IFSIPL0826/271, ...) are left untouched; only NEW and
 * backfilled codes use this format.
 *
 * Uniqueness is enforced by the partial unique index
 * idx_user_profiles_employee_id_unique (WHERE employee_id IS NOT NULL).
 * Callers must handle 23505 conflicts with a retry.
 */

/** Generate a single candidate code (no DB check). */
export function generateEmployeeCode() {
    return `EMP${Math.floor(10000 + Math.random() * 90000)}`;
}

/** Normalize user-supplied codes: trim + uppercase. Empty -> null. */
export function normalizeEmployeeCode(code) {
    if (code === null || code === undefined) return null;
    const t = String(code).trim().toUpperCase();
    return t === '' ? null : t;
}
