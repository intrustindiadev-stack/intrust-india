/**
 * Robust, zero-dependency CSV parser.
 * Handles quoted fields, commas inside quotes, escaped quotes (""), comment
 * lines (starting with '#'), and \r\n / \n line endings.
 *
 * Shared between:
 *   - app/api/admin/shopping/bulk-upload/route.js   (server)
 *   - app/(merchant)/.../bulk/BulkCSVUploader.jsx    (client)
 *
 * @param {string} text - Raw CSV text content
 * @returns {string[][]} Array of rows, each row an array of trimmed cell strings.
 *                        Empty rows are filtered out.
 */
export function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuote = false;

    let i = 0;
    while (i < text.length) {
        const ch = text[i];

        if (ch === '"') {
            // Check if it's an escaped quote ("")
            if (inQuote && text[i + 1] === '"') {
                field += '"';
                i += 2; // skip both
            } else {
                inQuote = !inQuote;
                i++;
            }
        } else if (ch === ',' && !inQuote) {
            row.push(field.trim());
            field = '';
            i++;
        } else if ((ch === '\n' || ch === '\r') && !inQuote) {
            row.push(field.trim());
            // Filter out comment lines starting with '#'
            if (row.length > 0 && !row[0].trim().startsWith('#')) {
                rows.push(row);
            }
            row = [];
            field = '';

            // Advance past \r\n
            if (ch === '\r' && text[i + 1] === '\n') {
                i += 2;
            } else {
                i++;
            }
        } else {
            field += ch;
            i++;
        }
    }
    // Push the remaining field and row if any
    if (field || row.length > 0) {
        row.push(field.trim());
        if (row.length > 0 && !row[0].trim().startsWith('#')) {
            rows.push(row);
        }
    }

    // Clean up empty lines
    return rows.filter(r => r.length > 0 && r.some(cell => cell.trim() !== ''));
}

/**
 * Normalizes a header or alias by:
 * 1. Converting to lowercase.
 * 2. Stripping specific symbols, units, and delimiters (like (₹), %, _, -).
 * 3. Replacing multiple spaces with a single space.
 * 4. Trimming whitespace.
 *
 * @param {string} header - Raw header string
 * @returns {string} Normalized header string
 */
export function normalizeHeader(header) {
    if (!header) return '';
    return header
        .toLowerCase()
        .replace(/[\(₹\)%_\-\s]/g, '');
}

