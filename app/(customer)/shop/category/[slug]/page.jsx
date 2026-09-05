import { createStaticSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { ShoppingBag, ArrowLeft, Star, MapPin, Sparkles, Plus, Store } from 'lucide-react';
import Link from 'next/link';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';

export const revalidate = 60;

export default async function CategoryPage({ params }) {
    const { slug } = await params;
    const categoryName = slug.replace('-', ' ');

    const supabase = createStaticSupabaseClient();
    const adminClient = createAdminClient();

    const nowIso = new Date().toISOString();

    // Fetch merchants and products in this category in parallel
    const [merchantsResult, productsResult] = await Promise.all([
        supabase
            .from('merchants')
            .select('id, slug, user_id, business_name, business_address, shopping_banner_url, is_open, subscription_status, subscription_expires_at')
            .eq('status', 'approved')
            .eq('subscription_status', 'active')
            .or(`subscription_expires_at.is.null,subscription_expires_at.gt.${nowIso}`)
            .order('business_name', { ascending: true }),
        supabase
            .from('shopping_products')
            .select(`
                id,
                title,
                slug,
                description,
                selling_price,
                mrp,
                stock_quantity,
                images,
                category,
                rating,
                merchants:merchants (
                    id,
                    business_name,
                    slug
                )
            `)
            .ilike('category', `%${slug}%`)
            .eq('is_active', true)
            .limit(12)
    ]);

    let merchants = merchantsResult.data || [];
    let products = productsResult.data || [];

    // Fallback items if none found
    if (products.length === 0) {
        products = [
            {
                id: 'cat-prod-1',
                title: `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} Premium Pack`,
                slug: `${slug}-premium-pack`,
                selling_price: 1499,
                mrp: 2999,
                rating: 4.8,
                images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80'],
                merchants: { business_name: 'Sharma Digital Store' }
            },
            {
                id: 'cat-prod-2',
                title: `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} Pro Series`,
                slug: `${slug}-pro-series`,
                selling_price: 2499,
                mrp: 4999,
                rating: 4.7,
                images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&auto=format&fit=crop&q=80'],
                merchants: { business_name: 'InTrust Direct Tech' }
            }
        ];
    }

    return (
        <div className="w-full space-y-8 font-body-md text-on-surface">
            {/* ── Breadcrumbs & Back ── */}
            <div className="flex items-center gap-3">
                <Link
                    href="/shop"
                    className="w-9 h-9 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-on-surface transition-colors"
                >
                    <ArrowLeft size={16} />
                </Link>
                <Breadcrumbs items={[{ label: 'Shop Hub', href: '/shop' }, { label: categoryName }]} />
            </div>

            {/* ── Category Hero Banner ── */}
            <div className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-outline-variant/30 min-h-[220px] sm:min-h-[260px] flex items-center">
                <img
                    src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=2000"
                    alt={categoryName}
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-transparent" />
                <div className="relative z-10 p-6 sm:p-10 max-w-xl text-white">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-wider text-[#D4AF37] mb-3">
                        <Sparkles size={13} /> Bhopal Verified Selection
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black capitalize tracking-tight leading-tight">
                        {categoryName}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium">
                        Discover top-rated local merchants and genuine products with 100% InTrust Escrow protection.
                    </p>
                </div>
            </div>

            {/* ── Category Products Grid ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-on-surface tracking-tight">
                            Available in {categoryName}
                        </h2>
                        <p className="text-xs text-on-surface-variant font-medium">
                            {products.length} products ready for 2-hour pickup or direct delivery
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {products.map((prod) => {
                        const discount = prod.mrp && prod.selling_price
                            ? Math.round(((prod.mrp - prod.selling_price) / prod.mrp) * 100)
                            : 0;

                        return (
                            <Link
                                key={prod.id}
                                href={`/shop/product/${prod.slug || prod.id}`}
                                className="group bg-surface-container-lowest hover:bg-surface-container-low rounded-3xl p-4 border border-outline-variant/30 hover:border-primary/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-surface-container-low mb-3 flex items-center justify-center p-3">
                                        <img
                                            src={prod.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80'}
                                            alt={prod.title}
                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                        />
                                        {discount > 0 && (
                                            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black uppercase">
                                                {discount}% OFF
                                            </span>
                                        )}
                                        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-surface-container-lowest/90 text-on-surface text-[10px] font-black flex items-center gap-1 shadow-sm">
                                            <Star size={11} className="text-amber-500 fill-amber-500" />
                                            {prod.rating || '4.8'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1 text-[11px] text-brand-steel font-semibold mb-1 truncate">
                                        <Store size={12} className="text-primary shrink-0" />
                                        <span className="truncate">{prod.merchants?.business_name || 'Verified Store'}</span>
                                    </div>

                                    <h3 className="font-bold text-sm text-on-surface line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                        {prod.title}
                                    </h3>
                                </div>

                                <div className="pt-3 mt-3 border-t border-outline-variant/20 flex items-center justify-between">
                                    <div>
                                        <span className="text-base font-black text-on-surface">
                                            ₹{Number(prod.selling_price).toLocaleString('en-IN')}
                                        </span>
                                        {prod.mrp && (
                                            <span className="text-xs text-brand-steel line-through font-semibold ml-1.5">
                                                ₹{Number(prod.mrp).toLocaleString('en-IN')}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                        +5% Cashback
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* ── Verified Stores Offering Category ── */}
            <div className="space-y-4 pt-6 border-t border-outline-variant/20">
                <div>
                    <h2 className="text-xl font-black text-on-surface tracking-tight">
                        Verified Stores in {categoryName}
                    </h2>
                    <p className="text-xs text-on-surface-variant font-medium">
                        Local merchants stocking genuine products in Bhopal
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {merchants.slice(0, 6).map((merchant) => (
                        <Link
                            key={merchant.id}
                            href={`/shop/${merchant.slug}`}
                            className="group bg-surface-container-lowest hover:bg-surface-container-low rounded-3xl p-4 border border-outline-variant/30 hover:border-primary/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                        >
                            <div>
                                <div className="relative h-36 w-full rounded-2xl overflow-hidden bg-surface-container-low mb-3">
                                    <img
                                        src={merchant.shopping_banner_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800'}
                                        alt={merchant.business_name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute top-2.5 right-2.5 px-2 py-1 rounded-xl bg-white/95 text-slate-900 text-xs font-black flex items-center gap-1 shadow-sm">
                                        <Star size={12} className="text-amber-500 fill-amber-500" />
                                        <span>4.8</span>
                                    </div>
                                </div>

                                <h3 className="font-extrabold text-base text-on-surface truncate group-hover:text-primary transition-colors">
                                    {merchant.business_name}
                                </h3>
                                <p className="text-xs text-on-surface-variant font-medium line-clamp-1 mt-0.5">
                                    <MapPin size={12} className="inline mr-1 text-primary" />
                                    {merchant.business_address || 'MP Nagar, Bhopal'}
                                </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs font-bold text-primary group-hover:underline">
                                <span>Visit Store Catalog</span>
                                <span>→</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
