/**
 * Search Utilities for Invoices
 * 
 * Provides safe escaping and filter construction for PostgREST .or() queries,
 * preventing logic-tree AST injection and syntax errors (PGRST100) while
 * preserving legitimate search terms including commas, quotes, and punctuation.
 */

/**
 * Sanitizes and escapes a user search term for use inside PostgREST quoted filter values.
 * Escapes backslashes, double quotes, and SQL ILIKE wildcards (% and _) so that the term
 * is treated strictly as literal data rather than PostgREST grammar or wildcard syntax.
 * 
 * @param {string} term Raw search string from user input
 * @returns {string} Escaped string safe for PostgREST quoted ILIKE expressions
 */
export function escapePostgrestSearch(term) {
    if (!term || typeof term !== 'string') return '';
    const clean = term.trim();
    if (!clean) return '';
    
    return clean
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
}

/**
 * Constructs a safe PostgREST .or() filter string for invoice searches.
 * Encloses filter expressions in double quotes to prevent commas, parentheses, colons,
 * and logic operators inside user data from breaking the PostgREST logic tree.
 * 
 * @param {string} search Raw user search query
 * @returns {string|null} Safe PostgREST .or() filter expression, or null if empty
 */
export function buildInvoiceSearchFilter(search) {
    const escaped = escapePostgrestSearch(search);
    if (!escaped) return null;

    return `invoice_number.ilike."%${escaped}%",customer_snapshot->>name.ilike."%${escaped}%",customer_snapshot->>email.ilike."%${escaped}%"`;
}
