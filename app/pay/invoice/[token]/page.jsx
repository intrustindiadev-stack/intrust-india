import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabaseServer';
import InvoicePaymentClient from './InvoicePaymentClient';

export const metadata = {
    title: 'Pay Invoice - Intrust India',
    description: 'Securely pay your invoice via SabPaisa',
};

export default async function InvoicePaymentPage({ params }) {
    const { token } = await params;

    if (!token || token.length !== 32) {
        notFound();
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
            paid_at,
            currency,
            status,
            public_payment_token
        `)
        .eq('public_payment_token', token)
        .single();

    if (error || !invoice) {
        if (error) {
            console.error('[InvoicePaymentPage] Error querying invoice for token:', token, error);
        }
        notFound();
    }

    return (
        <div className="min-h-screen bg-slate-50 py-6 sm:py-10 px-3 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <InvoicePaymentClient invoice={invoice} />
            </div>
        </div>
    );
}
