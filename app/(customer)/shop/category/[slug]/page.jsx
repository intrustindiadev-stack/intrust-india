import { createStaticSupabaseClient } from '@/lib/supabaseServer';
import { 
    ShoppingBag, 
    ArrowLeft, 
    Star, 
    MapPin, 
    Sparkles, 
    Store,
    Headphones,
    Smartphone,
    Shirt,
    Home,
    ShoppingBasket,
    Sun,
    ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';
import CategoryProductsClient from './CategoryProductsClient';
import { getCategorySlug, getCategoryIcon, getCategoryImage, FALLBACK_CATEGORIES } from '@/lib/shopping/categories';

export const revalidate = 60;

export default async function CategoryPage({ params }) {
    const { slug } = await params;
    const categoryName = slug.replace(/-/g, ' ');
    const formattedCategoryTitle = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

    const supabase = createStaticSupabaseClient();
    const nowIso = new Date().toISOString();

    // Fetch merchants, products, merchant inventory, and categories in parallel
    const [merchantsResult, productsResult, merchantInventoryResult, categoriesResult] = await Promise.all([
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
                suggested_retail_price_paise,
                platform_price_paise,
                mrp_paise,
                admin_stock,
                product_images,
                category
            `)
            .eq('is_active', true)
            .limit(60),
        supabase
            .from('merchant_inventory')
            .select(`
                id,
                retail_price_paise,
                stock_quantity,
                custom_title,
                merchant_id,
                merchants:merchants (
                    id,
                    business_name,
                    slug,
                    is_open
                ),
                shopping_products:shopping_products (
                    id,
                    title,
                    slug,
                    description,
                    suggested_retail_price_paise,
                    mrp_paise,
                    product_images,
                    category
                )
            `)
            .eq('is_active', true)
            .limit(60),
        supabase
            .from('shopping_categories')
            .select('*')
            .eq('is_active', true)
    ]);

    let merchants = merchantsResult.data || [];
    let rawProducts = productsResult.data || [];
    let merchantInventory = merchantInventoryResult.data || [];
    let dbCategories = categoriesResult?.data && categoriesResult.data.length > 0 ? categoriesResult.data : FALLBACK_CATEGORIES;

    // Filter platform products by category
    let matchedPlatformProducts = rawProducts.filter(p => {
        if (!p.category) return false;
        return p.category.toLowerCase().includes(categoryName.toLowerCase()) || 
               categoryName.toLowerCase().includes(p.category.toLowerCase());
    });

    // If none specifically matched category, take top active items
    if (matchedPlatformProducts.length === 0) {
        matchedPlatformProducts = rawProducts.slice(0, 12);
    }

    // Map platform products (Fulfilled by InTrust Official)
    const platformItems = matchedPlatformProducts.map(p => {
        const sPrice = Math.round(((p.platform_price_paise || p.suggested_retail_price_paise || 0) / 100));
        const mrpVal = Math.round(((p.mrp_paise || p.suggested_retail_price_paise || 0) / 100));
        return {
            id: p.id,
            product_id: p.id,
            title: p.title,
            slug: p.slug,
            description: p.description,
            selling_price: sPrice,
            sale_price: sPrice,
            price: sPrice,
            mrp: mrpVal,
            stock_quantity: p.admin_stock,
            images: p.product_images || [],
            category: p.category || formattedCategoryTitle,
            rating: 4.9,
            is_platform: true,
            merchants: { 
                business_name: 'InTrust Official Flagship',
                slug: 'official',
                is_open: true
            }
        };
    });

    // Filter & map merchant inventory items
    const merchantItems = merchantInventory
        .filter(item => {
            const spCat = item.shopping_products?.category || '';
            return spCat.toLowerCase().includes(categoryName.toLowerCase()) || 
                   categoryName.toLowerCase().includes(spCat.toLowerCase());
        })
        .map(item => {
            const sp = item.shopping_products || {};
            const merch = item.merchants || {};
            const sPrice = Math.round(((item.retail_price_paise || sp.suggested_retail_price_paise || 0) / 100));
            const mrpVal = Math.round(((sp.mrp_paise || item.retail_price_paise || 0) / 100));
            return {
                id: item.id,
                inventory_id: item.id,
                product_id: item.product_id || sp.id,
                title: item.custom_title || sp.title || 'Product',
                slug: sp.slug || item.id,
                description: sp.description,
                selling_price: sPrice,
                sale_price: sPrice,
                price: sPrice,
                mrp: mrpVal,
                stock_quantity: item.stock_quantity,
                images: sp.product_images || [],
                category: sp.category || formattedCategoryTitle,
                rating: 4.8,
                is_platform: false,
                merchants: {
                    business_name: merch.business_name || 'Local Verified Merchant',
                    slug: merch.slug || '',
                    is_open: merch.is_open ?? true
                }
            };
        });

    // Combine both: InTrust official first, then local merchant offerings
    let products = [...platformItems, ...merchantItems];

    // Fallback items if catalog is empty
    if (products.length === 0) {
        products = [
            {
                id: 'cat-prod-1',
                product_id: 'cat-prod-1',
                title: `${formattedCategoryTitle} Premium Pack`,
                slug: `${slug}-premium-pack`,
                selling_price: 1499,
                sale_price: 1499,
                price: 1499,
                mrp: 2999,
                rating: 4.8,
                stock_quantity: 10,
                images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80'],
                merchants: { business_name: 'InTrust Official Flagship', slug: 'official' }
            },
            {
                id: 'cat-prod-2',
                product_id: 'cat-prod-2',
                title: `${formattedCategoryTitle} Pro Series`,
                slug: `${slug}-pro-series`,
                selling_price: 2499,
                sale_price: 2499,
                price: 2499,
                mrp: 4999,
                rating: 4.7,
                stock_quantity: 5,
                images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&auto=format&fit=crop&q=80'],
                merchants: { business_name: 'Sharma Digital Store', slug: 'sharma-digital' }
            }
        ];
    }

    return (
        <div className="w-full space-y-8 font-body-md text-slate-900 dark:text-on-surface pb-16">
            {/* ── Breadcrumbs & Back ── */}
            <div className="flex items-center justify-between gap-4">
                <CustomerBreadcrumbs 
                    items={[
                        { label: 'Shop Hub', href: '/shop' }, 
                        { label: formattedCategoryTitle }
                    ]} 
                    className="mb-0"
                />
                <Link
                    href="/shop"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-surface-container-low hover:bg-slate-100 dark:hover:bg-surface-container-high border border-slate-200 dark:border-outline-variant/20 text-xs font-bold text-slate-700 dark:text-on-surface transition-colors shadow-xs"
                >
                    <ArrowLeft size={14} />
                    <span>Back to All Stores</span>
                </Link>
            </div>

            {/* ── Category Hero Banner (Sleek Modern Quick Commerce Gradient) ── */}
            <div className="relative w-full rounded-3xl overflow-hidden shadow-md border border-slate-200 dark:border-outline-variant/30 min-h-[190px] sm:min-h-[220px] flex items-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950">
                {/* Geometric Grid Pattern */}
                <div 
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)`,
                        backgroundSize: '20px 20px'
                    }}
                />
                <div className="absolute -right-10 -top-10 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute left-1/2 -bottom-10 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 p-6 sm:p-8 max-w-2xl text-white flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 backdrop-blur-md border border-sky-400/30 text-[11px] font-black uppercase tracking-wider text-sky-300">
                            ⚡ Express Delivery
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-bold uppercase tracking-wider text-slate-200">
                            100% InTrust Verified
                        </span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-black capitalize tracking-tight leading-tight text-white">
                        {formattedCategoryTitle}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-xl">
                        Discover top-rated local merchants and genuine products with 100% InTrust Buyer Protection, instant Blinkit-style ordering, and express delivery in Bhopal.
                    </p>
                </div>
            </div>

            {/* ── Category Interactive Products Grid ── */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-on-surface tracking-tight">
                        Available in {formattedCategoryTitle}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-on-surface-variant font-medium">
                        {products.length} verified products available for instant order
                    </p>
                </div>

                <CategoryProductsClient 
                    initialProducts={products} 
                    categoryName={formattedCategoryTitle} 
                    categories={dbCategories}
                />
            </div>

            {/* ── Verified Stores Offering Category ── */}
            {merchants.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-outline-variant/20">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-on-surface tracking-tight">
                            Verified Stores in {formattedCategoryTitle}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-on-surface-variant font-medium">
                            Local merchants stocking genuine inventory in Bhopal
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {merchants.slice(0, 6).map((merchant) => (
                            <Link
                                key={merchant.id}
                                href={`/shop/${merchant.slug}`}
                                className="group bg-white dark:bg-surface-container-lowest hover:bg-slate-50 dark:hover:bg-surface-container-low rounded-3xl p-4 border border-slate-200 dark:border-outline-variant/30 hover:border-blue-500/40 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="relative h-36 w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-surface-container-low mb-3">
                                        <img
                                            src={merchant.shopping_banner_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800'}
                                            alt={merchant.business_name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl bg-white/95 text-slate-900 text-xs font-black flex items-center gap-1 shadow-xs border border-slate-200">
                                            <Star size={12} className="text-amber-500 fill-amber-500" />
                                            <span>4.8</span>
                                        </div>
                                    </div>

                                    <h3 className="font-extrabold text-base text-slate-900 dark:text-on-surface truncate group-hover:text-blue-600 dark:group-hover:text-primary transition-colors">
                                        {merchant.business_name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-on-surface-variant font-medium line-clamp-1 mt-0.5">
                                        <MapPin size={12} className="inline mr-1 text-blue-600 dark:text-primary" />
                                        {merchant.business_address || 'MP Nagar, Bhopal'}
                                    </p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-outline-variant/20 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-primary group-hover:underline">
                                    <span>Visit Store Catalog</span>
                                    <span>→</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Explore Other Quick-Commerce Categories ── */}
            <div className="pt-8 border-t border-slate-200 dark:border-outline-variant/20 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-on-surface tracking-tight">
                            Explore Other Categories
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-on-surface-variant font-medium">
                            Browse instant delivery products across Bhopal hubs
                        </p>
                    </div>
                    <Link 
                        href="/shop" 
                        className="text-xs font-bold text-blue-600 dark:text-primary hover:underline flex items-center gap-1"
                    >
                        <span>View All</span>
                        <ChevronRight size={14} />
                    </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {dbCategories.map((cat) => {
                        const catSlug = getCategorySlug(cat);
                        const catLabel = cat.name || cat.label || catSlug;
                        const catImage = cat.image_url || getCategoryImage(cat);
                        const Icon = getCategoryIcon(catLabel);
                        const isCurrent = catSlug.toLowerCase() === slug.toLowerCase();
                        return (
                            <Link
                                key={catSlug}
                                href={`/shop/category/${catSlug}`}
                                className={`p-3 rounded-2xl border transition-all flex flex-col items-center text-center justify-between group min-h-[110px] ${
                                    isCurrent 
                                        ? 'bg-blue-500/10 border-blue-500/40 shadow-xs' 
                                        : 'bg-white dark:bg-surface-container-lowest border-slate-200 dark:border-outline-variant/30 hover:border-blue-500/30 hover:shadow-md'
                                }`}
                            >
                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 p-1 flex items-center justify-center relative shadow-xs transition-transform duration-300 group-hover:scale-105">
                                    {catImage ? (
                                        <img 
                                            src={catImage} 
                                            alt={catLabel} 
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                    ) : (
                                        <Icon size={20} className="text-primary" />
                                    )}
                                </div>
                                <span className={`text-xs font-bold line-clamp-2 leading-tight mt-1 max-w-full ${isCurrent ? 'text-blue-600 dark:text-primary font-black' : 'text-slate-800 dark:text-on-surface'}`}>
                                    {catLabel}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
