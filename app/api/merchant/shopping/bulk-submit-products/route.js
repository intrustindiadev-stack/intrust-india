import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { requireMerchantSubscription } from '@/lib/merchant/requireSubscription';

const VALID_GST = new Set([0, 5, 12, 18, 28]);

/**
 * Validate a single product row before insert.
 * Returns { errors: string[], normalized: object | null }.
 */
function validateProduct(product, index, categoryMap) {
    const errors = [];

    // ── Title ──
    if (!product.title?.trim()) {
        errors.push('Product name is required');
    }

    // ── Category ──
    const categoryName = product.category?.trim();
    let category_id = null;
    if (categoryName) {
        const cat = categoryMap.get(categoryName.toLowerCase());
        if (!cat) {
            errors.push(`Category "${categoryName}" does not match any active category`);
        } else {
            category_id = cat.id;
        }
    }

    // ── Prices ──
    const retail = Number(product.retail_price_paise);
    if (!Number.isFinite(retail) || retail <= 0) {
        errors.push(`Selling price must be a positive number (got "${product.retail_price_paise}")`);
    }

    const mrp = Number(product.mrp_paise ?? retail);
    if (!Number.isFinite(mrp) || mrp <= 0) {
        errors.push(`MRP must be a positive number (got "${product.mrp_paise}")`);
    }

    const wholesale = Number(product.wholesale_price_paise ?? 0);
    if (!Number.isFinite(wholesale) || wholesale < 0) {
        errors.push(`Cost/wholesale price must be a non-negative number (got "${product.wholesale_price_paise}")`);
    }

    // ── Stock ──
    const stock = parseInt(product.stock_quantity ?? 0, 10);
    if (!Number.isFinite(stock) || stock < 0) {
        errors.push(`Stock quantity must be a non-negative integer (got "${product.stock_quantity}")`);
    }

    // ── GST ──
    const gst = parseInt(product.gst_percentage ?? 0, 10);
    if (!Number.isFinite(gst) || !VALID_GST.has(gst)) {
        errors.push(`GST percentage must be one of 0, 5, 12, 18, 28 (got "${product.gst_percentage}")`);
    }

    // ── HSN Code ──
    const hsn_code = product.hsn_code?.trim() || '9971';

    if (errors.length > 0) {
        return { errors, normalized: null };
    }

    return {
        errors: [],
        normalized: {
            title: product.title.trim(),
            description: product.description || '',
            category: categoryName || 'General',
            category_id,
            product_images: product.product_images || [],
            wholesale_price_paise: wholesale,
            suggested_retail_price_paise: retail,
            mrp_paise: mrp || retail,
            gst_percentage: gst,
            hsn_code,
            stock_quantity: stock,
        },
    };
}

export async function POST(request) {
    try {
        // ── Subscription guard — must be subscribed to submit products ──
        const subResult = await requireMerchantSubscription(request);
        if (!subResult.ok) return subResult.response;

        const { user, merchant, admin: supabase } = subResult;

        const body = await request.json();
        const { merchantId, products } = body;

        if (!merchantId || !Array.isArray(products) || products.length === 0) {
            return NextResponse.json({ error: 'merchantId and products array are required' }, { status: 400 });
        }

        if (products.length > 100) {
            return NextResponse.json({ error: 'Maximum 100 products per bulk submission' }, { status: 400 });
        }

        // Verify merchant ownership (the subscription guard fetches by user_id,
        // so also verify that the requested merchantId matches)
        if (merchant.id !== merchantId) {
            return NextResponse.json({ error: 'Merchant not found or unauthorized' }, { status: 403 });
        }

        // ── Fetch active categories once for validation ──
        const { data: categories } = await supabase
            .from('shopping_categories')
            .select('id, name')
            .eq('is_active', true);

        const categoryMap = new Map(
            (categories || []).map(c => [c.name.toLowerCase(), c])
        );

        // ── Validate all rows upfront ──
        const validated = products.map((product, index) =>
            ({ index, title: product.title || `Product ${index + 1}`, ...validateProduct(product, index, categoryMap) })
        );

        const validRows = validated.filter(v => v.errors.length === 0);
        const invalidRows = validated.filter(v => v.errors.length > 0);

        // If every row fails validation, return 422 with details — skip inserts
        if (validRows.length === 0) {
            return NextResponse.json({
                results: invalidRows.map(r => ({
                    index: r.index,
                    title: r.title,
                    success: false,
                    error: r.errors.join('; '),
                })),
            }, { status: 422 });
        }

        // ── Insert valid rows ──
        const now = new Date().toISOString();
        const insertResults = await Promise.allSettled(
            validRows.map(async ({ index, title, normalized }) => {
                try {
                    // Create the shopping_products record
                    const { data: newProduct, error: productErr } = await supabase
                        .from('shopping_products')
                        .insert({
                            title: normalized.title,
                            description: normalized.description,
                            category: normalized.category,
                            category_id: normalized.category_id,
                            product_images: normalized.product_images,
                            wholesale_price_paise: normalized.wholesale_price_paise,
                            suggested_retail_price_paise: normalized.suggested_retail_price_paise,
                            mrp_paise: normalized.mrp_paise,
                            gst_percentage: normalized.gst_percentage,
                            hsn_code: normalized.hsn_code,
                            approval_status: 'pending_approval',
                            is_active: false,
                            is_platform_product: false,
                            submitted_by_merchant_id: merchantId,
                            submitted_at: now,
                        })
                        .select('id')
                        .single();

                    if (productErr || !newProduct) throw new Error(productErr?.message || 'Failed to create product');

                    // Create merchant_inventory record
                    const { error: invErr } = await supabase
                        .from('merchant_inventory')
                        .insert({
                            merchant_id: merchantId,
                            product_id: newProduct.id,
                            is_platform_product: false,
                            retail_price_paise: normalized.suggested_retail_price_paise,
                            stock_quantity: normalized.stock_quantity,
                            is_active: false, // inactive until approved
                            custom_title: normalized.title,
                            custom_description: normalized.description,
                        });

                    if (invErr) throw new Error(invErr?.message || 'Failed to add to inventory');

                    return { index, title, success: true };
                } catch (err) {
                    return { index, title, success: false, error: err.message };
                }
            })
        );

        // ── Merge validation failures with insert results ──
        const finalResults = [
            ...invalidRows.map(r => ({
                index: r.index,
                title: r.title,
                success: false,
                error: r.errors.join('; '),
            })),
            ...insertResults.map(r => r.status === 'fulfilled' ? r.value : { ...r.reason, success: false }),
        ].sort((a, b) => a.index - b.index);

        return NextResponse.json({ results: finalResults });
    } catch (err) {
        console.error('Bulk submit error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
