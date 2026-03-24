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
        <div className="min-h-screen bg-white relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/30 opacity-100" />
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-400/10 blur-[120px] rounded-full animate-pulse delay-700" />
            </div>
            <Navbar />

            <main className="pt-28 pb-20">
                <div className="max-w-6xl mx-auto px-6">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                        <div className="max-w-xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4">
                                <Sparkles size={12} className="text-blue-600" />
                                Premium Shopping Experience
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-4">
                                What are you <span className="text-blue-600 underline decoration-blue-100 decoration-8 underline-offset-4">looking for?</span>
                            </h1>
                            <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                Choose a category to browse local products from verified merchants.
                            </p>
                        </div>

                        {customerProfile && (
                            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-white">
                                    <Wallet size={24} />
                                </div>
                                <div className="pr-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Wallet Balance</p>
                                    <p className="text-xl font-black text-slate-900">
                                        ₹{(customerProfile.wallet_balance_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Search Bar Placeholder (Functional in next step) */}
                    <div className="relative mb-16 max-w-2xl">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                        <input
                            type="text"
                            placeholder="Search snacks, phones, or kitchen tools..."
                            className="w-full pl-16 pr-8 py-5 rounded-[2rem] bg-white border border-slate-100 shadow-lg shadow-slate-200/20 focus:ring-4 focus:ring-blue-500/5 outline-none font-medium text-lg placeholder:text-slate-300 transition-all"
                        />
                    </div>

                    {/* Category Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                        {categories?.map((cat) => {
                            return (
                                <Link
                                    key={cat.id}
                                    href={`/shop/${cat.name.toLowerCase()}`}
                                    className="group relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-600/10 transition-all duration-500 hover:-translate-y-2 flex flex-col items-center text-center overflow-hidden"
                                >
                                    {/* Decorative Gradient Blobs */}
                                    <div 
                                        className="absolute -top-10 -right-10 w-32 h-32 opacity-0 group-hover:opacity-10 transition-opacity duration-700 blur-2xl" 
                                        style={{ background: `linear-gradient(to bottom right, ${cat.color_primary || '#3b82f6'}, ${cat.color_secondary || '#4f46e5'})` }}
                                    />

                                    <div className={`w-28 h-28 rounded-full bg-slate-50 flex items-center justify-center overflow-hidden shadow-lg shadow-blue-900/5 group-hover:scale-110 transition-transform duration-500 mb-6 relative z-10 border-4 border-white ring-1 ring-slate-100`}>
                                        {cat.image_url ? (
                                            <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div 
                                                className="w-full h-full opacity-30" 
                                                style={{ background: `linear-gradient(to bottom right, ${cat.color_primary || '#3b82f6'}, ${cat.color_secondary || '#4f46e5'})` }}
                                            />
                                        )}
                                    </div>

                                    <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight">{cat.name}</h3>
                                    <p className="text-xs font-bold text-slate-400 leading-tight uppercase tracking-widest opacity-80 group-hover:text-blue-600 transition-colors">
                                        {cat.description}
                                    </p>

                                    <div className="mt-6 p-2 rounded-full bg-slate-50 text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 z-10 relative">
                                        <ChevronRight size={16} />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
