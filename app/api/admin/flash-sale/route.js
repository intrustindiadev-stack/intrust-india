import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data, error } = await admin
            .from('flash_sale_items')
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
            .order('is_active', { ascending: false })
            .order('position', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ items: data || [] });
    } catch (err) {
        console.error('[API] Admin Flash Sale GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { product_id, discount_percent, position, starts_at, ends_at } = body;

        // Validation
        if (!product_id) {
            return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
        }

        if (!Number.isInteger(discount_percent) || discount_percent < 1 || discount_percent > 99) {
            return NextResponse.json({ error: 'discount_percent must be between 1 and 99' }, { status: 400 });
        }

        // Fetch product
        const { data: p, error: pError } = await admin
            .from('shopping_products')
            .select('id, title, mrp_paise, suggested_retail_price_paise, admin_stock, is_active')
            .eq('id', product_id)
            .single();

        if (pError || !p) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        if (!p.is_active) {
            return NextResponse.json({ error: 'Product is not active' }, { status: 400 });
        }

        const basePrice = p.mrp_paise || p.suggested_retail_price_paise;
        if (!basePrice) {
            return NextResponse.json({ error: 'Product has no price set' }, { status: 400 });
        }

        const sale_price_paise = Math.floor(basePrice * (100 - discount_percent) / 100);

        // Check active count
        const { count, error: countError } = await admin
            .from('flash_sale_items')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true);

        if (countError) throw countError;
        if (count >= 5) {
            return NextResponse.json({ error: 'Flash sale is full (max 5 active items)' }, { status: 409 });
        }

        // Check duplicate
        const { data: existing } = await admin
            .from('flash_sale_items')
            .select('id')
            .eq('product_id', product_id)
            .eq('is_active', true)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: 'Product is already in an active flash sale' }, { status: 409 });
        }

        // Resolve position
        let resolvedPosition = position;
        if (!resolvedPosition) {
            const { data: activeItems } = await admin
                .from('flash_sale_items')
                .select('position')
                .eq('is_active', true);
            
            const takenPositions = new Set((activeItems || []).map(item => item.position));
            for (let i = 1; i <= 5; i++) {
                if (!takenPositions.has(i)) {
                    resolvedPosition = i;
                    break;
                }
            }
            if (!resolvedPosition) {
                return NextResponse.json({ error: 'No available positions' }, { status: 409 });
            }
        } else {
            // Verify provided position
            const { data: posTaken } = await admin
                .from('flash_sale_items')
                .select('id')
                .eq('position', resolvedPosition)
                .eq('is_active', true)
                .maybeSingle();
            
            if (posTaken) {
                return NextResponse.json({ error: `Position ${resolvedPosition} is already occupied` }, { status: 409 });
            }
        }

        // INSERT
        const { data, error: insertError } = await admin
            .from('flash_sale_items')
            .insert({
                product_id,
                discount_percent,
                sale_price_paise,
                position: resolvedPosition,
                is_active: true,
                starts_at: starts_at || new Date().toISOString(),
                ends_at: ends_at || null,
                created_by: user.id
            })
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

        if (insertError) {
            if (insertError.code === '23505' || insertError.code === 'P0001') {
                return NextResponse.json({ error: insertError.message }, { status: 409 });
            }
            throw insertError;
        }

        return NextResponse.json({ item: data }, { status: 201 });
    } catch (err) {
        console.error('[API] Admin Flash Sale POST Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
