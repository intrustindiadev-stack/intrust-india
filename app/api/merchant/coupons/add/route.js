import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { encryptCouponCode } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

/**
 * POST /api/merchant/coupons/add
 * Allows merchants to add coupons with markup validation.
 */
export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();

        // 1. Authenticate User
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch Merchant Profile
        const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .select('id, business_name, status')
            .eq('user_id', user.id)
            .single();

        if (merchantError || !merchant) {
            return NextResponse.json({ error: 'Merchant profile not found' }, { status: 403 });
        }

        if (merchant.status !== 'approved') {
            return NextResponse.json({ error: 'Merchant account is not approved' }, { status: 403 });
        }

        // 3. Parse Request Body
        const body = await request.json();
        const {
            brand,
            title,
            description,
            category,
            faceValue,      // in Rs
            sellingPrice,   // in Rs
            wholesaleCost,  // in Rs
            couponCode,
            stock = 1,
            expiryDate,
            terms
        } = body;

        // 4. Validate Required Fields
        if (!brand || !title || !faceValue || !sellingPrice || !wholesaleCost || !couponCode || !expiryDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const fv = parseFloat(faceValue);
        const sp = parseFloat(sellingPrice);
        const wc = parseFloat(wholesaleCost);
        const stockCount = parseInt(stock) || 1;

        if (isNaN(fv) || isNaN(sp) || isNaN(wc)) {
            return NextResponse.json({ error: 'Invalid numeric values' }, { status: 400 });
        }

        if (stockCount < 1 || stockCount > 500) {
            return NextResponse.json({ error: 'Stock must be between 1 and 500' }, { status: 400 });
        }

        // 5. Markup Validation (Max 20%)
        // Formula: ((Selling Price - Wholesale Cost) / Wholesale Cost) * 100
        const markup = ((sp - wc) / wc) * 100;
        if (markup > 20) {
            return NextResponse.json({
                error: `Maximum allowed markup is 20%. Your current markup is ${markup.toFixed(2)}%. Please lower your selling price.`
            }, { status: 400 });
        }

        // 6. Security Check: Selling price shouldn't be higher than face value (optional but good practice)
        if (sp > fv) {
            return NextResponse.json({ error: 'Selling price cannot exceed face value' }, { status: 400 });
        }

        // 7. Prepare Data for Insertion
        const face_value_paise = Math.round(fv * 100);
        const selling_price_paise = Math.round(sp * 100);
        const purchase_price_paise = Math.round(wc * 100);

        const encrypted_code = encryptCouponCode(couponCode);
        const masked_code = couponCode.length > 8
            ? `${couponCode.slice(0, 4)}****${couponCode.slice(-4)}`
            : `****${couponCode.slice(-4)}`;

        // Create individual records for each stock item
        const couponsToInsert = Array.from({ length: stockCount }).map(() => ({
            brand,
            title,
            description: description || '',
            category,
            face_value_paise,
            selling_price_paise,
            encrypted_code,
            masked_code,
            status: 'available',
            valid_until: expiryDate,
            terms_and_conditions: terms || 'Standard T&C apply.',
            merchant_id: merchant.id,
            merchant_name: merchant.business_name,
            created_by: user.id,
            is_merchant_owned: true,
            listed_on_marketplace: true,
            merchant_purchase_price_paise: purchase_price_paise,
            merchant_selling_price_paise: selling_price_paise,
            merchant_commission_paise: 0, // Commission will be calculated at sale
        }));

        // 8. Bulk Insert using Admin Client to bypass RLS
        // (RLS might restrict merchants from inserting directly or only allow specific fields)
        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from('coupons')
            .insert(couponsToInsert)
            .select('id');

        if (error) {
            console.error('Error inserting merchant coupons:', error);
            return NextResponse.json({ error: 'Failed to add coupons to database' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully listed ${data.length} coupon(s) on the marketplace.`,
            count: data.length
        }, { status: 201 });

    } catch (error) {
        console.error('Merchant Coupon Add API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
