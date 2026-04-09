import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { Store, Plus, Package, TrendingUp, DollarSign, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import MerchantInventoryClient from './MerchantInventoryClient';

export const dynamic = 'force-dynamic';

export default async function MerchantShopPage() {
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

    // Fetch merchant's inventory
    // We join with shopping_products to get platform product details
    const { data: inventory, error: inventoryError } = await supabase
        .from('merchant_inventory')
        .select(`
            *,
            shopping_products (
                title,
                description,
                product_images,
                category,
                suggested_retail_price_paise,
                wholesale_price_paise,
                approval_status,
                rejection_reason
            )
        `)
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

    if (inventoryError) console.error('Error fetching merchant inventory:', inventoryError);

    // Stats
    const totalItems = inventory?.length || 0;
    const activeItems = inventory?.filter(i => i.is_active).length || 0;
    const totalStock = inventory?.reduce((sum, i) => sum + i.stock_quantity, 0) || 0;
    const inventoryValue = inventory?.reduce((sum, i) => sum + (Number(i.retail_price_paise) * i.stock_quantity), 0) / 100 || 0;

    // Potential profit: only computable for platform products where both cost and retail are known
    const potentialProfit = (inventory?.reduce((sum, i) => {
        if (i.is_platform_product && i.shopping_products) {
            const profitPerUnit = (i.shopping_products.suggested_retail_price_paise - i.shopping_products.wholesale_price_paise);
            return sum + (profitPerUnit * i.stock_quantity);
        }
        return sum;
    }, 0) || 0) / 100;

    return (
        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/5 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                        <Store size={12} />
                        Retail Management
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-slate-100 tracking-tight leading-none font-[family-name:var(--font-outfit)]">
                        My <span className="text-blue-600">Shop</span>
                    </h1>
                    <p className="text-slate-400 dark:text-slate-500 font-medium text-sm max-w-md">
                        Manage your live catalog, adjust stock, and set retail prices for custom products.
                    </p>
                </div>
                <Link
                    href="/merchant/shopping/inventory/new"
                    className="inline-flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#2c5282] text-white px-5 py-3 rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-900/10 self-start sm:self-auto flex-shrink-0"
                >
                    <Plus size={18} />
                    Add Custom Product
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
                <div className="bg-white dark:bg-white/5 p-4 sm:p-5 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-lg shadow-slate-200/40 dark:shadow-none transition-all hover:-translate-y-0.5 group">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 mb-3 shadow-inner group-hover:scale-110 transition-transform">
                        <Store size={20} />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{totalItems}</div>
                    <div className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest mt-0.5">Total Products</div>
                </div>
                <div className="bg-white dark:bg-white/5 p-4 sm:p-5 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-lg shadow-slate-200/40 dark:shadow-none transition-all hover:-translate-y-0.5 group">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-3 shadow-inner group-hover:scale-110 transition-transform">
                        <TrendingUp size={20} />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{activeItems}</div>
                    <div className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest mt-0.5">Live Items</div>
                </div>
                <div className="bg-white dark:bg-white/5 p-4 sm:p-5 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-lg shadow-slate-200/40 dark:shadow-none transition-all hover:-translate-y-0.5 group">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 mb-3 shadow-inner group-hover:scale-110 transition-transform">
                        <Package size={20} />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{totalStock}</div>
                    <div className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest mt-0.5">Total Stock</div>
                </div>
                <div className="bg-white dark:bg-white/5 p-4 sm:p-5 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-lg shadow-slate-200/40 dark:shadow-none transition-all hover:-translate-y-0.5 group">
                    <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 mb-3 shadow-inner group-hover:scale-110 transition-transform">
                        <DollarSign size={20} />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">₹{inventoryValue.toLocaleString('en-IN')}</div>
                    <div className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest mt-0.5">Catalog Value</div>
                </div>
                {/* Potential Profit tile — spans 2 cols on mobile so it's prominent */}
                <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 p-4 sm:p-5 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20 shadow-lg shadow-emerald-200/40 dark:shadow-none transition-all hover:-translate-y-0.5 group">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shadow-inner group-hover:scale-110 transition-transform">
                        <Sparkles size={20} />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                        ₹{potentialProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-emerald-600/70 dark:text-emerald-500 text-[9px] font-black uppercase tracking-widest mt-0.5">Potential Profit</div>
                    <div className="text-emerald-500/60 dark:text-emerald-600 text-[8px] font-bold mt-1">Platform products only</div>
                </div>
            </div>

            <MerchantInventoryClient initialInventory={inventory || []} merchant={merchant} />
        </div>
    );
}
