import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Minimal, zero-dependency CSV parser.
 * Handles quoted fields, commas inside quotes, and \r\n / \n line endings.
 */
function parseCSV(text) {
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

const VALID_GST = new Set([0, 5, 12, 18, 28]);

function validateRow(row, idx, categories) {
    const errors = [];
    const num = (v, name) => {
        const n = parseFloat(v);
        if (isNaN(n) || n < 0) errors.push(`${name} must be a non-negative number (got "${v}")`);
        return n;
    };
    const int = (v, name) => {
        const n = parseInt(v);
        if (isNaN(n) || n < 0) errors.push(`${name} must be a non-negative integer (got "${v}")`);
        return n;
    };

    if (!row.title?.trim()) errors.push('title is required');
    if (!row.description?.trim()) errors.push('description is required');
    if (!row.category?.trim()) errors.push('category is required');
    else if (categories && !categories.find(c => c.name.toLowerCase() === row.category.trim().toLowerCase())) {
        errors.push(`category "${row.category}" does not match any active category`);
    }

    const wholesalePrice = num(row.wholesale_price, 'wholesale_price');
    const sellingPrice   = num(row.selling_price,   'selling_price');
    const mrp            = row.mrp ? num(row.mrp, 'mrp') : sellingPrice;
    const stock          = int(row.stock,            'stock');
    const gst            = int(row.gst_percent || '0', 'gst_percent');

    if (!isNaN(gst) && !VALID_GST.has(gst)) errors.push(`gst_percent must be one of 0, 5, 12, 18, 28 (got ${gst})`);

    // Collect image URLs (up to 3)
    const imageUrls = [row.image_url_1, row.image_url_2, row.image_url_3]
        .filter(Boolean)
        .map(u => u.trim())
        .filter(u => u.startsWith('http'));

    return {
        errors,
        payload: errors.length === 0 ? {
            title:                        row.title.trim(),
            description:                  row.description.trim(),
            category:                     row.category.trim(),
            wholesale_price_paise:        Math.round(wholesalePrice * 100),
            suggested_retail_price_paise: Math.round(sellingPrice * 100),
            mrp_paise:                    Math.round(mrp * 100),
            admin_stock:                  stock,
            gst_percentage:               gst,
            hsn_code:                     row.hsn_code?.trim() || '9971',
            product_images:               imageUrls,
            is_active:                    row.is_active?.toLowerCase() !== 'false',
        } : null
    };
}

// ── Route Handler ──────────────────────────────────────────────────────────

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Parse multipart form
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

        const fileName = file.name?.toLowerCase() || '';
        if (!fileName.endsWith('.csv')) {
            return NextResponse.json({ error: 'Only CSV files are supported. Please save your Excel file as CSV.' }, { status: 400 });
        }

        const text = await file.text();
        const rows = parseCSV(text);

        if (rows.length < 2) {
            return NextResponse.json({ error: 'CSV is empty or missing data rows.' }, { status: 400 });
        }

        // First row = headers
        const headers = rows[0].map(h => h.toLowerCase().trim().replace(/\s+/g, '_'));
        const dataRows = rows.slice(1);

        if (dataRows.length > 500) {
            return NextResponse.json({ error: 'Maximum 500 products per upload. Please split your file.' }, { status: 400 });
        }

        // Fetch active categories for validation
        const adminClient = createAdminClient();
        const { data: categories } = await adminClient
            .from('shopping_categories')
            .select('id, name')
            .eq('is_active', true);

        // Map each data row to an object using header keys
        const mappedRows = dataRows.map(cols => {
            const obj = {};
            headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
            return obj;
        });

        // Validate all rows first — report all errors upfront
        const validated = mappedRows.map((row, idx) => ({
            rowNumber: idx + 2, // +2: 1-indexed + header row
            ...validateRow(row, idx, categories)
        }));

        const validRows   = validated.filter(r => r.errors.length === 0);
        const invalidRows = validated.filter(r => r.errors.length > 0);

        if (validRows.length === 0) {
            return NextResponse.json({
                success: 0,
                failed: invalidRows.length,
                errors: invalidRows.map(r => ({ row: r.rowNumber, messages: r.errors }))
            }, { status: 422 });
        }

        // Insert in batches of 50 to avoid DB overload
        const BATCH_SIZE = 50;
        const insertedIds = [];
        const insertErrors = [];

        for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
            const batch = validRows.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (r) => {
                const p = r.payload;
                // Resolve category ID
                const cat = categories?.find(c => c.name.toLowerCase() === p.category.toLowerCase());
                const { data, error } = await supabase.rpc('admin_insert_shopping_product', {
                    p_title:        p.title,
                    p_description:  p.description,
                    p_category:     p.category,
                    p_category_id:  cat?.id || null,
                    p_wholesale_price: p.wholesale_price_paise,
                    p_retail_price: p.suggested_retail_price_paise,
                    p_mrp_paise:    p.mrp_paise,
                    p_admin_stock:  p.admin_stock,
                    p_product_images: p.product_images,
                    p_is_active:    p.is_active,
                    p_gst_percentage: p.gst_percentage,
                    p_hsn_code:     p.hsn_code,
                });
                if (error) {
                    insertErrors.push({ row: r.rowNumber, messages: [error.message || 'DB insert failed'] });
                } else if (data?.id) {
                    insertedIds.push(data.id);
                }
            }));
        }

        const totalSuccess = insertedIds.length;
        const allErrors = [
            ...invalidRows.map(r => ({ row: r.rowNumber, messages: r.errors })),
            ...insertErrors
        ].sort((a, b) => a.row - b.row);

        // Send a single batch notification to all approved merchants
        if (totalSuccess > 0) {
            try {
                const { data: merchants } = await adminClient
                    .from('merchants')
                    .select('user_id')
                    .eq('status', 'approved');

                if (merchants?.length > 0) {
                    const notifications = merchants.map(m => ({
                        user_id: m.user_id,
                        title: `${totalSuccess} New Product${totalSuccess > 1 ? 's' : ''} Added 🛍️`,
                        body: `${totalSuccess} new product${totalSuccess > 1 ? 's have' : ' has'} been added to the wholesale catalog. Check out the latest items now!`,
                        type: 'info',
                        reference_type: 'wholesale_bulk_upload',
                        reference_id: insertedIds[0], // Link to first product as reference
                        read: false
                    }));
                    await adminClient.from('notifications').insert(notifications);
                }
            } catch (notifError) {
                console.error('Bulk upload notification error:', notifError);
                // Non-fatal — products still inserted
            }
        }

        return NextResponse.json({
            success: totalSuccess,
            failed: allErrors.length,
            errors: allErrors,
        }, { status: 200 });

    } catch (error) {
        console.error('Bulk upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
