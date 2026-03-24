import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { ShoppingBag, Plus, Package, TrendingUp, DollarSign, Search, ChevronRight, Tags } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminShoppingPage() {
    // Auth check using user session
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch products
    const { data: products, error } = await supabase
        .from('shopping_products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) console.error('Error fetching products:', error);

    // Stats
    const totalProducts = products?.length || 0;
    const activeProducts = products?.filter(p => p.is_active).length || 0;
    const totalWholesaleValue = products?.reduce((sum, p) => sum + (Number(p.wholesale_price_paise) * p.admin_stock), 0) / 100 || 0;

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto bg-[#f8f9fb] min-h-screen font-[family-name:var(--font-outfit)]">
            {/* Header section with luxe vibes */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/5 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <ShoppingBag size={12} className="text-blue-600" />
                        Platform Logistics
                    </div>
                    <h1 className="text-5xl font-black text-slate-950 tracking-tight leading-none font-[family-name:var(--font-outfit)]">
                        Shopping <span className="text-blue-600">Service</span>
                    </h1>
                    <p className="text-slate-400 font-medium text-lg max-w-md">
                        Central command for platform inventory and merchant wholesale supply.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link 
                        href="/admin/shopping/categories"
                        className="group flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 pl-5 pr-4 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
                    >
                        <span>Manage Categories</span>
                        <div className="bg-slate-100 p-1.5 rounded-xl text-slate-500 group-hover:text-blue-600 transition-colors">
                            <Tags size={18} />
                        </div>
                    </Link>

                    <Link 
                        href="/admin/shopping/new"
                        className="group flex items-center gap-2 bg-slate-950 hover:bg-blue-600 text-white pl-5 pr-4 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-slate-950/10 active:scale-95"
                    >
                        <span>Add New Product</span>
                        <div className="bg-white/10 p-1.5 rounded-xl group-hover:rotate-90 transition-transform">
                            <Plus size={18} />
                        </div>
                    </Link>
                </div>
            </div>

            {/* Stats Grid - High End Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                {[
                    { label: 'Total Products', value: totalProducts, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Active Items', value: activeProducts, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Wholesale Value', value: `₹${totalWholesaleValue.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' }
                ].map((stat) => (
                    <div key={stat.label} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-bl-[4rem] opacity-20 group-hover:scale-110 transition-transform`} />
                        <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} mb-6 shadow-sm`}>
                            <stat.icon size={28} />
                        </div>
                        <div className="relative">
                            <p className="text-4xl font-black text-slate-950 tracking-tight leading-none mb-2">{stat.value}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Catalog Grid (Replacing Table for better mobile/modern feel) */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Current Catalog</h2>
                    <div className="flex items-center gap-2 text-blue-600 text-xs font-black uppercase tracking-widest">
                        View All <ChevronRight size={14} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {products?.length === 0 ? (
                        <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                           <Package className="mx-auto text-slate-100 mb-4" size={64} />
                           <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No products found</p>
                        </div>
                    ) : (
                        products?.map((product) => (
                            <Link 
                                href={`/admin/shopping/edit/${product.id}`}
                                key={product.id} 
                                className="group bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm hover:shadow-2xl hover:shadow-blue-600/5 transition-all flex items-center gap-6"
                            >
                                <div className="w-24 h-24 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 overflow-hidden shrink-0 group-hover:bg-slate-100 transition-colors">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <Package size={32} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${product.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {product.is_active ? 'In Market' : 'Draft'}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{product.category || 'General'}</span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 truncate tracking-tight">{product.title}</h3>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Supply Price</p>
                                            <p className="font-black text-slate-900">₹{(product.wholesale_price_paise / 100).toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="w-px h-6 bg-slate-100" />
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Admin Stock</p>
                                            <p className={`font-black ${product.admin_stock < 5 ? 'text-red-600' : 'text-slate-900'}`}>{product.admin_stock} units</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 rounded-full bg-slate-50 text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <ChevronRight size={18} />
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
