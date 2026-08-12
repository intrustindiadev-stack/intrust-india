import { createStaticSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { ShoppingBag, ArrowLeft, Filter, Sparkles, MapPin, Star } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';
import UserShopHeaderActions from '../../UserShopHeaderActions';

export const revalidate = 60;

export default async function CategoryPage({ params }) {
    const { slug } = await params;
    const categoryName = slug.replace('-', ' ');

    const supabase = createStaticSupabaseClient();
    const adminClient = createAdminClient();

    const nowIso = new Date().toISOString();

    // Fetch merchants
    const { data: merchantsData, error: merchantsError } = await supabase
        .from('merchants')
        .select('id, slug, user_id, business_name, business_address, shopping_banner_url, is_open, subscription_status, subscription_expires_at')
        .eq('status', 'approved')
        .eq('subscription_status', 'active')
        .or(`subscription_expires_at.is.null,subscription_expires_at.gt.${nowIso}`)
        .order('business_name', { ascending: true });

    let merchants = merchantsData || [];

    // Since we don't have a direct category mapping on merchants yet, we'll just pass all active merchants 
    // to the ShopHubClient for this category view, or if we had category_id on merchants, we would filter here.
    // For now, we simulate filtering by just showing the merchants.

    const userIds = merchants.map(m => m.user_id).filter(Boolean);
    const merchantIds = merchants.map(m => m.id);

    const [profilesResult, ratingsResult] = await Promise.all([
        userIds.length > 0 ? adminClient.from('user_profiles').select('id, avatar_url, full_name').in('id', userIds) : Promise.resolve({ data: [] }),
        merchantIds.length > 0 ? supabase.from('merchant_rating_stats').select('merchant_id, avg_rating, total_ratings').in('merchant_id', merchantIds) : Promise.resolve({ data: [] })
    ]);

    if (userIds.length > 0) {
        const profileMap = Object.fromEntries((profilesResult.data || []).map(p => [p.id, p]));
        merchants = merchants.map(m => ({
            ...m,
            user_profiles: profileMap[m.user_id] || { avatar_url: null, full_name: null }
        }));
    }

    const ratingsMap = Object.fromEntries((ratingsResult.data || []).map(r => [r.merchant_id, r]));

    const allMerchants = [
        {
            id: 'official',
            slug: 'official',
            business_name: 'Intrust Official',
            business_address: null,
            user_profiles: { avatar_url: '/icons/intrustLogo.png', full_name: null },
            is_open: true
        },
        ...merchants
    ];

    return (
        <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#080a10] relative pb-32 transition-colors font-[family-name:var(--font-outfit)]">
            <Navbar />

            <main className="pt-[88px] md:pt-[104px]">
                {/* ── Top Header Bar ── */}
                <div className="px-4 md:px-8 max-w-7xl mx-auto w-full mb-6">
                    <div className="bg-white dark:bg-[#0c0e16] md:bg-white/95 md:dark:bg-[#0c0e16]/95 md:backdrop-blur-2xl rounded-2xl md:rounded-[2rem] border border-slate-200/80 dark:border-white/[0.08] shadow-lg py-3 px-4 md:px-5 flex items-center justify-between gap-3 transition-shadow hover:shadow-xl">
                        
                        {/* Title */}
                        <div className="flex items-center gap-2.5">
                            <Link href="/shop" className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors">
                                <ArrowLeft size={16} />
                            </Link>
                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md shadow-indigo-500/25 shrink-0">
                                <ShoppingBag size={16} className="text-white" />
                            </span>
                            <div>
                                <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none capitalize">
                                    {categoryName}
                                </h1>
                                <p className="text-[10px] md:text-xs text-slate-500 dark:text-white/40 font-bold leading-none mt-1">
                                    {allMerchants.length} stores found
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <UserShopHeaderActions />
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 pb-8">
                    <Breadcrumbs items={[{ label: 'Intrust Mart', href: '/shop' }, { label: categoryName }]} />
                </div>

                {/* ── Category Hero Banner ── */}
                <div className="max-w-7xl mx-auto px-4 md:px-8 mb-10">
                    <div className="relative w-full h-[250px] md:h-[320px] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-900/20 group">
                        <img 
                            src={`https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=2000`} 
                            alt={categoryName}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent backdrop-blur-[2px]" />
                        <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-black uppercase tracking-widest w-max mb-4">
                                <Sparkles size={14} /> Premium Selection
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight capitalize mb-2">{categoryName}</h2>
                            <p className="text-slate-200 font-medium max-w-lg md:text-lg">Discover top-rated merchants, exclusive deals, and the best products in {categoryName}.</p>
                        </div>
                    </div>
                </div>

                {/* ── Filter Pills (Swipeable) ── */}
                <div className="max-w-7xl mx-auto px-4 md:px-8 mb-8">
                    <div className="flex gap-3 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-4">
                        {['All Stores', 'Top Rated', 'Flash Deals', 'Near Me', 'New Arrivals'].map((filter, i) => (
                            <button key={filter} className={`snap-center shrink-0 px-6 py-3 rounded-full text-sm font-black tracking-widest uppercase transition-all shadow-sm border ${i === 0 ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-700 hover:border-indigo-500 hover:text-indigo-600'}`}>
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Category Store Grid ── */}
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {allMerchants.map((merchant) => (
                            <Link href={merchant.slug === 'official' ? "/shop/official" : `/shop/${merchant.slug}`} key={merchant.id} className="block group h-full">
                                <div className="bg-white dark:bg-[#12141c] rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)] transition-all duration-500 flex flex-col border border-slate-100 dark:border-slate-800 h-full">
                                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
                                        <img
                                            src={merchant.slug === 'official' ? "/images/intrust_mart_bg.png" : (merchant.shopping_banner_url || `https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800`)}
                                            alt={merchant.business_name}
                                            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out"
                                        />
                                        <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 z-10 border border-white/20">
                                            <Star size={12} className="fill-amber-500 text-amber-500" />
                                            <span className="text-[11px] font-black text-slate-900 dark:text-white">{ratingsMap[merchant.id]?.avg_rating || (merchant.slug === 'official' ? '4.9' : '4.2')}</span>
                                        </div>
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white line-clamp-1 mb-1">{merchant.business_name}</h3>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1">
                                            <MapPin size={12} className="text-indigo-400" /> {merchant.business_address?.split(',')[0] || 'Premium Store'}
                                        </p>
                                        <button className="mt-auto w-full bg-slate-50 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all group-hover:bg-indigo-600 group-hover:text-white">
                                            Visit Store
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
