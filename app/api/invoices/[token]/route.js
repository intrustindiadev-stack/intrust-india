import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';

export async function GET(request, { params }) {
    try {
        const { token } = await params;
        
        if (!token || token.length !== 32) {
            return NextResponse.json({ error: 'Invalid invoice token' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();
        
        const { data: invoice, error } = await supabaseAdmin
            .from('invoices')
            .select(`
                invoice_number,
                invoice_date,
                due_date,
                seller_snapshot,
                customer_snapshot,
                items_snapshot,
                subtotal_paise,
                discount_paise,
                tax_paise,
                grand_total_paise,
                amount_paid_paise,
                currency,
                status
            `)
            .eq('public_payment_token', token)
            .single();

        if (error || !invoice) {
            return NextResponse.json({ error: 'Invoice not found or expired' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            invoice
        });

    } catch (err) {
        console.error('[Get Invoice] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
