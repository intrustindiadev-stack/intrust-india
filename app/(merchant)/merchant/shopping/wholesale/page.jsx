import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { ShoppingBag, ChevronLeft, Package, Wallet, ShoppingCart, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import WholesaleClient from './WholesaleClient';

export const dynamic = 'force-dynamic';

export default async function WholesaleHubPage() {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Get Merchant record
    const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (merchantError || !merchant) {
        redirect('/merchant-status');
    }

    // Fetch platform products
    const { data: products, error: productsError } = await supabase
        .from('shopping_products')
        .select('*')
        .eq('is_active', true)
        .gt('admin_stock', 0)
        .is('deleted_at', null)
        .order('title');

    if (productsError) console.error('Error fetching wholesale products:', productsError);

    // Fetch active categories
    const { data: categories, error: categoriesError } = await supabase
        .from('shopping_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    if (categoriesError) console.error('Error fetching categories:', categoriesError);

    return (
        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/5 text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none">
                        <Sparkles size={12} className="text-blue-600" />
                        Platform Wholesale Market
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-slate-100 tracking-tight leading-none font-[family-name:var(--font-outfit)]">
                        Inventory <span className="text-blue-600">Sourcing</span>
                    </h1>
                    <p className="text-slate-400 font-medium text-base max-w-md">
                        Browse and stock up your digital shelves with verified platform products.
                    </p>
                </div>

                <div className="bg-white dark:bg-white/5 p-4 sm:p-6 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-xl shadow-slate-200/40 dark:shadow-none flex items-center gap-4 self-start md:self-auto">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-sm border border-amber-100/50 dark:border-amber-500/20">
                        <Wallet size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Merchant Credit</p>
                        <p className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            ₹{(merchant.wallet_balance_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            <WholesaleClient products={products || []} merchant={merchant} categories={categories || []} />
        </div>
    );
}

