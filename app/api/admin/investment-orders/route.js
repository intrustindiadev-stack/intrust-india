import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// Get orders for an investment or single order (merchant or admin)
export async function GET(request) {
    try {
        const { user, profile, admin: supabase } = await getAuthUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const investmentId = searchParams.get('investmentId');
        const orderId = searchParams.get('orderId');

        // Single order lookup
        if (orderId) {
            const { data: order, error } = await supabase
                .from('merchant_investment_orders')
                .select('*, investment:merchant_investments(id, merchant_id, amount_paise, status, merchant:merchants(id, business_name))')
                .eq('id', orderId)
                .single();

            if (error) throw error;
            if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

            // Security check
            if (!['admin', 'super_admin'].includes(profile?.role)) {
                const { data: merchant } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
                if (!merchant || merchant.id !== order.merchant_id) {
                    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
                }
            }

            return NextResponse.json({ data: order });
        }

        // Orders for a specific investment
        if (investmentId) {
            // Security check: if not admin, must be the owner
            if (!['admin', 'super_admin'].includes(profile?.role)) {
                const { data: merchant } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
                const { data: investment } = await supabase.from('merchant_investments').select('merchant_id').eq('id', investmentId).single();
                if (!merchant || !investment || merchant.id !== investment.merchant_id) {
                    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
                }
            }

            const { data, error } = await supabase
                .from('merchant_investment_orders')
                .select('*')
                .eq('investment_id', investmentId)
                .order('order_date', { ascending: false });

            if (error) throw error;
            return NextResponse.json({ data });
        }

        // Admin: get all orders
        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('merchant_investment_orders')
            .select('*, investment:merchant_investments(merchant_id, amount_paise, interest_rate_percent, merchant:merchants(business_name))')
            .order('order_date', { ascending: false })
            .limit(200);

        if (error) throw error;
        return NextResponse.json({ data });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Feed a new simulated order record (Admin only)
export async function POST(request) {
    try {
        const { user, profile, admin: supabase } = await getAuthUser(request);
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { mode, orderId, investmentId, orderDetails, amountRupees, profitRupees, orderDate, location, category } = body;

        // If explicit mode is 'edit' or orderId is provided, delegate to update logic
        if (mode === 'edit' || orderId) {
            return handleUpdateOrder({
                supabase,
                orderId,
                investmentId,
                orderDetails,
                amountRupees,
                profitRupees,
                orderDate,
                location,
                category
            });
        }

        // CREATE MODE
        if (!investmentId || !orderDetails || amountRupees === undefined || profitRupees === undefined) {
            return NextResponse.json({ error: 'Missing required fields: investmentId, orderDetails, amountRupees, profitRupees' }, { status: 400 });
        }

        const { data: investment } = await supabase
            .from('merchant_investments')
            .select('merchant_id, status')
            .eq('id', investmentId)
            .single();

        if (!investment || investment.status !== 'active') {
            return NextResponse.json({ error: 'Growth plan must be active to feed orders' }, { status: 400 });
        }

        // 1:1 enforcement: only one simulated order per investment
        const { data: existingOrders } = await supabase
            .from('merchant_investment_orders')
            .select('id')
            .eq('investment_id', investmentId)
            .limit(1);

        if (existingOrders && existingOrders.length > 0) {
            return NextResponse.json(
                { error: 'A simulated order already exists for this growth plan. Use Edit to update it.' },
                { status: 409 }
            );
        }

        const parsedAmountPaise = Math.round(Number(amountRupees) * 100);
        const parsedProfitPaise = Math.round(Number(profitRupees) * 100);

        if (isNaN(parsedAmountPaise) || isNaN(parsedProfitPaise)) {
            return NextResponse.json({ error: 'Invalid numeric values for amount or profit' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('merchant_investment_orders')
            .insert({
                investment_id: investmentId,
                merchant_id: investment.merchant_id,
                order_details: orderDetails.trim(),
                amount_paise: parsedAmountPaise,
                profit_paise: parsedProfitPaise,
                order_date: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
                location: location ? location.trim() : null,
                category: category || 'General',
            })
            .select()
            .single();

        if (error) throw error;

        // Notify merchant about new return
        try {
            const { data: merchant } = await supabase
                .from('merchants')
                .select('user_id')
                .eq('id', investment.merchant_id)
                .single();

            if (merchant) {
                await supabase.from('notifications').insert({
                    user_id: merchant.user_id,
                    title: 'Trade Profit Credited',
                    body: `₹${Number(profitRupees).toLocaleString('en-IN')} profit reported from ${category || 'trade'} order${location ? ' in ' + location : ''}.`,
                    type: 'success',
                    reference_id: data.id,
                    reference_type: 'investment_order'
                });
            }
        } catch (notifErr) {
            console.error('Notification error:', notifErr);
        }

        return NextResponse.json({ data, success: true, mode: 'create' }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Update existing simulated order (Admin only) - REPLACES values, NEVER adds
export async function PATCH(request) {
    try {
        const { user, profile, admin: supabase } = await getAuthUser(request);
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { orderId, investmentId, orderDetails, amountRupees, profitRupees, orderDate, location, category } = body;

        return handleUpdateOrder({
            supabase,
            orderId,
            investmentId,
            orderDetails,
            amountRupees,
            profitRupees,
            orderDate,
            location,
            category
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Shared update handler strictly ensuring REPLACEMENT semantics
async function handleUpdateOrder({
    supabase,
    orderId,
    investmentId,
    orderDetails,
    amountRupees,
    profitRupees,
    orderDate,
    location,
    category
}) {
    if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required for updating an existing simulated order' }, { status: 400 });
    }

    // Verify order exists
    const { data: existingOrder, error: findErr } = await supabase
        .from('merchant_investment_orders')
        .select('*, investment:merchant_investments(id, status)')
        .eq('id', orderId)
        .single();

    if (findErr || !existingOrder) {
        return NextResponse.json({ error: 'Simulated order not found with provided ID' }, { status: 404 });
    }

    // Verify investment ownership
    if (investmentId && existingOrder.investment_id !== investmentId) {
        return NextResponse.json({ error: 'Order does not belong to the specified investment' }, { status: 400 });
    }

    // Financial check: Plan must be active to modify performance data
    if (existingOrder.investment?.status !== 'active') {
        return NextResponse.json({ error: 'Cannot modify orders for an investment that is already completed or inactive' }, { status: 400 });
    }

    const updateData = {};

    if (orderDetails !== undefined) {
        if (!orderDetails.trim()) {
            return NextResponse.json({ error: 'Order brief cannot be empty' }, { status: 400 });
        }
        updateData.order_details = orderDetails.trim();
    }

    if (amountRupees !== undefined) {
        const amt = Math.round(Number(amountRupees) * 100);
        if (isNaN(amt) || amt < 0) {
            return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
        }
        updateData.amount_paise = amt;
    }

    // PROFIT REPLACEMENT: Overwrite existing profit_paise with newly entered value. NEVER INCREMENT.
    if (profitRupees !== undefined) {
        const pft = Math.round(Number(profitRupees) * 100);
        if (isNaN(pft) || pft < 0) {
            return NextResponse.json({ error: 'Invalid profit amount' }, { status: 400 });
        }
        updateData.profit_paise = pft;
    }

    if (orderDate !== undefined) {
        updateData.order_date = new Date(orderDate).toISOString();
    }

    if (location !== undefined) {
        updateData.location = location ? location.trim() : null;
    }

    if (category !== undefined) {
        updateData.category = category || 'General';
    }

    const { data: updatedOrder, error: updateErr } = await supabase
        .from('merchant_investment_orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

    if (updateErr) throw updateErr;

    // Notify merchant about updated order
    try {
        const { data: merchant } = await supabase
            .from('merchants')
            .select('user_id')
            .eq('id', existingOrder.merchant_id)
            .single();

        if (merchant) {
            const profitRs = updatedOrder.profit_paise / 100;
            const cat = updatedOrder.category || 'trade';
            const loc = updatedOrder.location ? ' in ' + updatedOrder.location : '';
            await supabase.from('notifications').insert({
                user_id: merchant.user_id,
                title: 'Trade Profit Updated',
                body: `Your ${cat} order profit has been updated to ₹${profitRs.toLocaleString('en-IN')}${loc}.`,
                type: 'info',
                reference_id: updatedOrder.id,
                reference_type: 'investment_order'
            });
        }
    } catch (notifErr) {
        console.error('Notification error on order update:', notifErr);
    }

    return NextResponse.json({ data: updatedOrder, success: true, mode: 'edit' });
}

// Delete a simulated order (Admin only)
export async function DELETE(request) {
    try {
        const { user, profile, admin: supabase } = await getAuthUser(request);
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');

        if (!orderId) {
            return NextResponse.json({ error: 'orderId parameter is required' }, { status: 400 });
        }

        // Verify order exists & investment is active
        const { data: order, error: findErr } = await supabase
            .from('merchant_investment_orders')
            .select('id, investment:merchant_investments(status)')
            .eq('id', orderId)
            .single();

        if (findErr || !order) {
            return NextResponse.json({ error: 'Simulated order not found' }, { status: 404 });
        }

        if (order.investment?.status !== 'active') {
            return NextResponse.json({ error: 'Cannot delete order from an already completed or inactive investment' }, { status: 400 });
        }

        const { error: delErr } = await supabase
            .from('merchant_investment_orders')
            .delete()
            .eq('id', orderId);

        if (delErr) throw delErr;

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
