import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { ShoppingBag, ChevronLeft, Package, Wallet, ShoppingCart, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import WholesaleClient from './WholesaleClient';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function WholesaleHubPage({ searchParams }) {
    const supabase = await createServerSupabaseClient();
    const params = await searchParams;

    // Parse URL params
    const page = Math.max(1, parseInt(params?.page || '1'));
    const searchQuery = params?.q || '';
    const selectedCategory = params?.category || 'All';

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
    let productsQuery = supabase
        .from('shopping_products')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .or('approval_status.eq.live,approval_status.is.null')
        .gt('admin_stock', 0)
        .is('deleted_at', null)
        .order('title');

    if (searchQuery) {
        productsQuery = productsQuery.ilike('title', `%${searchQuery}%`);
    }

    if (selectedCategory && selectedCategory !== 'All') {
        productsQuery = productsQuery.eq('category', selectedCategory);
    }
    
    const selectedSubCategory = params?.sub_category || '';
    if (selectedSubCategory) {
        productsQuery = productsQuery.eq('sub_category', selectedSubCategory);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    productsQuery = productsQuery.range(from, to);

    const { data: products, count: productsCount, error: productsError } = await productsQuery;
    if (productsError) console.error('Error fetching wholesale products:', productsError);

    const totalCount = productsCount || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    // Fetch active categories
    const { data: categories, error: categoriesError } = await supabase
        .from('shopping_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    if (categoriesError) console.error('Error fetching categories:', categoriesError);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Professional Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider">
                            <Sparkles size={11} className="text-blue-600 dark:text-blue-400" />
                            B2B Marketplace
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                        Wholesale
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                        Buy inventory at merchant wholesale prices.
                    </p>
                </div>

                <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm self-start sm:self-auto">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                        <Wallet size={16} />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider leading-none">Merchant Credit</p>
                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5 leading-none">
                            ₹{(merchant.wallet_balance_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            <WholesaleClient
                products={products || []}
                merchant={merchant}
                categories={categories || []}
                totalCount={totalCount}
                page={page}
                pageSize={PAGE_SIZE}
                totalPages={totalPages}
                initialSearchTerm={searchQuery}
                initialCategory={selectedCategory}
            />
        </div>
    );
}

