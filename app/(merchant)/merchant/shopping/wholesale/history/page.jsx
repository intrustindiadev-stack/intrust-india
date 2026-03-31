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
        .select('*, shopping_products(title, product_images, category, wholesale_price_paise)')
        .eq('buyer_id', merchant.id)
        .eq('buyer_type', 'merchant')
        .eq('order_type', 'wholesale')
        .order('created_at', { ascending: false });

    if (ordersError) console.error('Error fetching wholesale history:', ordersError);

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto bg-[#f8f9fb] min-h-screen">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/5 text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none">
                        <History size={12} className="text-blue-600" />
                        Wholesale Purchase Ledger
                    </div>
                    <h1 className="text-5xl font-black text-slate-950 tracking-tight leading-none font-[family-name:var(--font-outfit)]">
                        Purchase <span className="text-blue-600">History</span>
                    </h1>
                    <p className="text-slate-400 font-medium text-lg max-w-md">
                        A complete record of all stock you&apos;ve sourced from the platform wholesale market.
                    </p>
                </div>
            </div>

            <WholesaleHistoryClient orders={orders || []} merchant={merchant} />
        </div>
    );
}
