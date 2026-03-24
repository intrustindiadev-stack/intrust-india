import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { Store, Plus, Package, TrendingUp, DollarSign, Search } from 'lucide-react';
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
                image_url,
                category,
                suggested_retail_price_paise,
                wholesale_price_paise
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

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto bg-[#f8f9fb] min-h-screen">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/5 text-blue-600 text-[10px] font-black uppercase tracking-widest leading-none">
                        <Store size={12} className="text-blue-600" />
                        Retail Management
                    </div>
                    <h1 className="text-5xl font-black text-slate-950 tracking-tight leading-none font-[family-name:var(--font-outfit)]">
                        My <span className="text-blue-600">Shop</span>
                    </h1>
                    <p className="text-slate-400 font-medium text-lg max-w-md">
                        Manage your live catalog, adjust local stock, and set custom retail prices.
                    </p>
                </div>
                <Link 
                    href="/merchant/shopping/inventory/new"
                    className="inline-flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#2c5282] text-white px-6 py-3 rounded-2xl font-black transition-all shadow-xl shadow-blue-900/10"
                >
                    <Plus size={20} />
                    <span>Add Custom Product</span>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 transition-all hover:-translate-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 shadow-inner">
                        <Store size={24} />
                    </div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">{totalItems}</div>
                    <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Total Products</div>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 transition-all hover:-translate-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 shadow-inner">
                        <TrendingUp size={24} />
                    </div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">{activeItems}</div>
                    <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Live Items</div>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 transition-all hover:-translate-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4 shadow-inner">
                        <Package size={24} />
                    </div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">{totalStock}</div>
                    <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Local Stock</div>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 transition-all hover:-translate-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 mb-4 shadow-inner">
                        <DollarSign size={24} />
                    </div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">₹{inventoryValue.toLocaleString('en-IN')}</div>
                    <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Inventory Value</div>
                </div>
            </div>

            <MerchantInventoryClient initialInventory={inventory || []} merchant={merchant} />
        </div>
    );
}
