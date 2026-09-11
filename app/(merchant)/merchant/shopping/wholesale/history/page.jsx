import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { History } from 'lucide-react';
import WholesaleHistoryClient from './WholesaleHistoryClient';

export const dynamic = 'force-dynamic';

export default async function WholesaleHistoryPage() {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (merchantError || !merchant) redirect('/merchant-status');

    const { data: orders, error: ordersError } = await supabase
        .from('shopping_orders')
        .select('*, purchase_batch_id, unit_price_paise, shopping_products(title, product_images, category, wholesale_price_paise, gst_percentage, hsn_code)')
        .eq('buyer_id', merchant.id)
        .eq('buyer_type', 'merchant')
        .eq('order_type', 'wholesale')
        .order('created_at', { ascending: false });

    if (ordersError) console.error('Error fetching wholesale history:', ordersError);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Consistent Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider">
                            <History size={11} className="text-blue-600 dark:text-blue-400" />
                            Procurement Ledger
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                        Purchase History
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                        A complete record of all stock sourced from the platform wholesale market.
                    </p>
                </div>
            </div>

            <WholesaleHistoryClient orders={orders || []} merchant={merchant} />
        </div>
    );
}
