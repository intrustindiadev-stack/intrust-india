import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { discount_percent, position, starts_at, ends_at, is_active } = body;

        // Fetch existing row
        const { data: existing, error: fetchError } = await admin
            .from('flash_sale_items')
            .select(`
                *,
                shopping_products:product_id (
                    mrp_paise,
                    suggested_retail_price_paise
                )
            `)
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json({ error: 'Flash sale item not found' }, { status: 404 });
        }

        const updatePayload = {};
        
        if (discount_percent !== undefined) {
            if (!Number.isInteger(discount_percent) || discount_percent < 1 || discount_percent > 99) {
                return NextResponse.json({ error: 'discount_percent must be between 1 and 99' }, { status: 400 });
            }
            updatePayload.discount_percent = discount_percent;
            
            const p = existing.shopping_products;
            const basePrice = p.mrp_paise || p.suggested_retail_price_paise;
            if (basePrice) {
                updatePayload.sale_price_paise = Math.floor(basePrice * (100 - discount_percent) / 100);
            }
        }

        if (is_active !== undefined) {
            updatePayload.is_active = is_active;
            
            // If activating, check count
            if (is_active === true && existing.is_active === false) {
                const { count } = await admin
                    .from('flash_sale_items')
                    .select('id', { count: 'exact', head: true })
                    .eq('is_active', true)
                    .neq('id', id);
                
                if (count >= 5) {
                    return NextResponse.json({ error: 'Flash sale is full (max 5 active items)' }, { status: 409 });
                }
            }
        }

        if (position !== undefined) {
            updatePayload.position = position;
            
            // Check if position is occupied by another active item
            const currentIsActive = is_active !== undefined ? is_active : existing.is_active;
            if (currentIsActive) {
                const { data: posTaken } = await admin
                    .from('flash_sale_items')
                    .select('id')
                    .eq('position', position)
                    .eq('is_active', true)
                    .neq('id', id)
                    .maybeSingle();
                
                if (posTaken) {
                    return NextResponse.json({ error: `Position ${position} is already occupied` }, { status: 409 });
                }
            }
        }

        if (starts_at !== undefined) updatePayload.starts_at = starts_at;
        if (ends_at !== undefined) updatePayload.ends_at = ends_at;

        // UPDATE
        const { data, error: updateError } = await admin
            .from('flash_sale_items')
            .update(updatePayload)
            .eq('id', id)
            .select(`
                *,
                shopping_products:product_id (
                    id,
                    slug,
                    title,
                    product_images,
                    mrp_paise,
                    suggested_retail_price_paise,
                    admin_stock,
                    is_active
                )
            `)
            .single();

        if (updateError) {
            if (updateError.code === '23505' || updateError.code === 'P0001') {
                return NextResponse.json({ error: updateError.message }, { status: 409 });
            }
            throw updateError;
        }

        return NextResponse.json({ item: data });
    } catch (err) {
        console.error('[API] Admin Flash Sale PUT Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;

        const { error } = await admin
            .from('flash_sale_items')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[API] Admin Flash Sale DELETE Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
