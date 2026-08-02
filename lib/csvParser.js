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
    // Strip UTF-8 BOM (\uFEFF) produced by Excel / Windows CSV exports.
    // Without this, the first header becomes "\uFEFFcontact_name" and every
    // column index lookup returns -1, silently skipping all data rows.
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }

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

/**
 * Parses an Excel (.xlsx / .xls) file into the same string[][] format as
 * parseCSV(), so the downstream validation pipeline can be shared unchanged.
 *
 * Uses the first sheet in the workbook. Cells are serialised to strings via
 * SheetJS `sheet_to_json` with `header: 1` (row-array mode) and `defval: ''`
 * (empty cells become '' rather than undefined).
 *
 * Comment rows (first cell starting with '#') are filtered out, matching the
 * behaviour of parseCSV().
 *
 * @param {ArrayBuffer} buffer - Raw file bytes from FileReader.readAsArrayBuffer
 * @returns {string[][]} Array of rows (header row first), each row an array of
 *                       trimmed cell strings. Empty rows are filtered out.
 */
export async function parseXLSX(buffer) {
    // Dynamic import keeps SheetJS out of the initial JS bundle — it's only
    // loaded when the user actually selects an Excel file.
    const XLSX = (await import('xlsx')).default ?? (await import('xlsx'));

    const workbook = XLSX.read(buffer, { type: 'array' });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('Excel file contains no sheets.');

    const worksheet = workbook.Sheets[firstSheetName];

    // row-array mode: each entry is string[], empty cells → ''
    const rawRows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        raw: false,   // coerce all values to strings (dates, numbers, etc.)
    });

    return rawRows
        // stringify every cell and trim whitespace
        .map(row => row.map(cell => String(cell ?? '').trim()))
        // drop fully-blank rows
        .filter(row => row.some(cell => cell !== ''))
        // drop comment rows (first cell starts with '#'), matching parseCSV behaviour
        .filter(row => !row[0].startsWith('#'));
}
