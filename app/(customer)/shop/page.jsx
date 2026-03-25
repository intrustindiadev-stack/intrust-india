import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { Sparkles, Wallet, Search, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const dynamic = 'force-dynamic';

export default async function CategoryHubPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch dynamic categories
    const { data: categories } = await supabase
        .from('shopping_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

    let customerProfile = null;
    if (user) {
        const { data } = await supabase
            .from('user_profiles')
            .select('wallet_balance_paise')
            .eq('id', user.id)
            .single();
        customerProfile = data;
    }

    return (
        <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#080a10] relative pb-20 transition-colors">
            <Navbar />

            <main className="pt-24 md:pt-28">
                <div className="max-w-7xl mx-auto">
                    {/* Header & Wallet Section */}
                    <div className="bg-white dark:bg-[#0c0e16] px-4 py-6 md:px-8 border-b border-slate-100 dark:border-white/[0.04] mb-2">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                                    Shop Now
                                </h1>
                                <p className="text-slate-500 dark:text-white/30 font-medium text-sm">
                                    Browse local product categories
                                </p>
                            </div>
                            
                            {customerProfile && (
                                <div className="bg-slate-50 dark:bg-white/[0.04] rounded-2xl p-2.5 border border-slate-100 dark:border-white/[0.06] flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-950 dark:bg-emerald-600 flex items-center justify-center text-white shrink-0">
                                        <Wallet size={20} />
                                    </div>
                                    <div className="pr-2">
                                        <p className="text-[9px] font-black text-slate-400 dark:text-white/25 uppercase tracking-widest mb-0.5">Balance</p>
                                        <p className="text-base font-black text-slate-900 dark:text-white leading-none">
                                            ₹{(customerProfile.wallet_balance_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/20" size={20} />
                            <input
                                type="text"
                                placeholder="Search products, brands and categories..."
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] focus:bg-white dark:focus:bg-white/[0.06] focus:border-slate-300 dark:focus:border-white/10 focus:ring-4 focus:ring-slate-100 dark:focus:ring-white/[0.02] outline-none font-bold text-sm placeholder:text-slate-400 dark:placeholder:text-white/20 transition-all text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Shop by Category */}
                    <div className="bg-white dark:bg-[#0c0e16] px-4 py-6 md:px-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">Shop by Category</h2>
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">See all</span>
                        </div>

                        {/* Category Grid */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-3 gap-y-6">
                            {categories?.map((cat) => {
                                const color1 = cat.color_primary || '#e2e8f0'; 
                                const color2 = cat.color_secondary || '#f8fafc';
                                
                                return (
                                    <Link
                                        key={cat.id}
                                        href={`/shop/${cat.name.toLowerCase()}`}
                                        className="group flex flex-col items-center"
                                    >
                                        {/* Category Tile */}
                                        <div 
                                            className="w-full aspect-square rounded-2xl mb-2 relative overflow-hidden flex items-center justify-center shadow-sm border border-slate-100 dark:border-white/[0.06] group-hover:shadow-md transition-all group-hover:border-slate-200 dark:group-hover:border-white/10"
                                            style={{ 
                                                background: `linear-gradient(to bottom right, ${color1}20, ${color2}10)`,
                                            }}
                                        >
                                            {/* Dark mode inner category glow */}
                                            <div 
                                                className="hidden dark:block absolute inset-0 opacity-[0.08] group-hover:opacity-[0.15] transition-opacity"
                                                style={{ background: `radial-gradient(circle, ${color1} 0%, transparent 70%)` }}
                                            />

                                            {cat.image_url ? (
                                                <img 
                                                    src={cat.image_url} 
                                                    alt={cat.name} 
                                                    className="w-[80%] h-[80%] object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-110 transition-transform duration-300 relative z-10" 
                                                />
                                            ) : (
                                                <div className="w-full h-full opacity-60 bg-slate-100 dark:bg-white/[0.03] flex items-center justify-center relative z-10">
                                                    <span 
                                                        className="text-3xl"
                                                        role="img"
                                                        aria-label={cat.name}
                                                    >
                                                        {cat.name === 'Electronics' ? '📱' : 
                                                         cat.name === 'Groceries' ? '🥬' : 
                                                         cat.name === 'Fashion' ? '👗' :
                                                         cat.name === 'Beauty' ? '💄' :
                                                         cat.name === 'Home' ? '🏠' :
                                                         cat.name === 'Health' ? '💊' :
                                                         cat.name === 'Sports' ? '⚽' :
                                                         cat.name === 'Toys' ? '🧸' : '📦'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Category Title */}
                                        <h3 className="text-xs font-bold text-slate-700 dark:text-white/60 text-center leading-tight group-hover:text-blue-600 dark:group-hover:text-white transition-colors px-1 line-clamp-2">
                                            {cat.name}
                                        </h3>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
