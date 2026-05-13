import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        // 1. Identify User — Bearer-token first, cookie fallback
        let userId = null;

        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const tempSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );
            const { data: { user } } = await tempSupabase.auth.getUser(token);
            userId = user?.id;
        }

        // Fallback to cookies
        if (!userId) {
            const cookieStore = await cookies();
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                {
                    cookies: {
                        get(name) { return cookieStore.get(name)?.value; },
                        set() { },
                        remove() { },
                    },
                }
            );
            const { data: { session } } = await supabase.auth.getSession();
            userId = session?.user?.id;
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
        }

        // 2. Parse and validate body
        const body = await request.json();
        const { items } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Missing or invalid items array' }, { status: 400 });
        }

        const platformProductIds = [];
        const inventoryIds = [];

        for (const item of items) {
            if (!item.product_id || item.quantity == null) {
                return NextResponse.json({ error: 'Invalid item: missing product_id or quantity' }, { status: 400 });
            }
            if (item.is_platform_item) {
                platformProductIds.push(item.product_id);
            } else if (item.inventory_id) {
                inventoryIds.push(item.inventory_id);
            }
        }

        // 3. Batched Queries
        const adminSupabase = createAdminClient();

        const [platformStockRes, merchantStockRes] = await Promise.all([
            platformProductIds.length > 0
                ? adminSupabase.from('shopping_products').select('id, admin_stock').in('id', platformProductIds)
                : Promise.resolve({ data: [] }),
            inventoryIds.length > 0
                ? adminSupabase.from('merchant_inventory').select('id, stock_quantity, is_active').in('id', inventoryIds)
                : Promise.resolve({ data: [] })
        ]);

        const platformMap = new Map((platformStockRes.data || []).map(p => [p.id, p.admin_stock || 0]));
        const inventoryMap = new Map((merchantStockRes.data || []).map(m => [m.id, { stock_quantity: m.stock_quantity || 0, is_active: m.is_active }]));

        // 4. Response assembly
        const results = items.map(item => {
            let available = 0;
            if (item.is_platform_item) {
                available = platformMap.get(item.product_id) ?? 0;
            } else {
                if (item.inventory_id && inventoryMap.has(item.inventory_id)) {
                    const row = inventoryMap.get(item.inventory_id);
                    available = row.is_active === false ? 0 : row.stock_quantity;
                } else {
                    available = platformMap.get(item.product_id) ?? 0;
                }
            }

            let status = 'ok';
            if (available === 0) {
                status = 'out_of_stock';
            } else if (available < item.quantity) {
                status = 'insufficient';
            }

            return {
                product_id: item.product_id,
                inventory_id: item.inventory_id,
                requested: item.quantity,
                available,
                status
            };
        });

        return NextResponse.json(results, { status: 200 });

    } catch (err) {
        console.error('[cart-validate] Critical error:', err);
        return NextResponse.json({
            error: err.message || 'An unexpected server error occurred',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }, { status: 500 });
    }
}
