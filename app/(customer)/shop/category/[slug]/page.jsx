import { createStaticSupabaseClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import { 
    ShoppingBag, 
    ArrowLeft, 
    Star, 
    MapPin, 
    Sparkles, 
    Store,
    ChevronRight,
    Zap,
    ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';
import CategoryProductsClient from './CategoryProductsClient';
import MerchantCard from '@/components/customer/shop/MerchantCard';
import { getCategorySlug, getCategoryIcon, getCategoryImage, FALLBACK_CATEGORIES } from '@/lib/shopping/categories';
import { MERCHANT_DEPARTMENTS, getDepartmentMeta } from '@/lib/constants/departments';

export const revalidate = 60;

export default async function CategoryPage({ params }) {
    const { slug } = await params;
    const normalizedSlug = (slug || '').toLowerCase().trim();
    const deptMeta = getDepartmentMeta(normalizedSlug.replace(/-/g, '_')) || getDepartmentMeta(normalizedSlug);
    const isKnownDept = deptMeta && deptMeta.key !== 'general';
    const categoryName = normalizedSlug.replace(/-/g, ' ');
    const formattedCategoryTitle = isKnownDept 
        ? deptMeta.label 
        : (categoryName.charAt(0).toUpperCase() + categoryName.slice(1));

    const supabase = createStaticSupabaseClient();
    const nowIso = new Date().toISOString();

    // Fetch merchants, products, merchant inventory, and categories in parallel
    const [merchantsResult, productsResult, merchantInventoryResult, categoriesResult] = await Promise.all([
        supabase
            .from('merchants')
            .select('id, slug, user_id, business_name, business_address, shopping_banner_url, is_open, subscription_status, subscription_expires_at, department')
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
                category,
                sub_category
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
                product_id,
                merchants:merchants (
                    id,
                    business_name,
                    slug,
                    is_open,
                    department
                ),
                shopping_products:shopping_products (
                    id,
                    title,
                    slug,
                    description,
                    suggested_retail_price_paise,
                    mrp_paise,
                    product_images,
                    category,
                    sub_category
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

    // Filter platform products by category / department
    let matchedPlatformProducts = rawProducts.filter(p => {
        if (!p.category) return false;
        const pCat = p.category.toLowerCase();
        return pCat.includes(categoryName) || 
               categoryName.includes(pCat) ||
               (isKnownDept && pCat.includes(deptMeta.key.replace(/_/g, ' ')));
    });

    // Map platform products (Fulfilled by InTrust Official)
    const platformItems = matchedPlatformProducts.map(p => {
        const sPrice = Math.round(((p.platform_price_paise || p.suggested_retail_price_paise || 0) / 100));
        const mrpVal = Math.round(((p.mrp_paise || p.suggested_retail_price_paise || 0) / 100));
        return {
            id: p.id,
            product_id: p.id,
            title: p.title,
            slug: p.slug || p.id,
            description: p.description,
            selling_price: sPrice,
            sale_price: sPrice,
            price: sPrice,
            mrp: mrpVal,
            stock_quantity: p.admin_stock,
            images: p.product_images || [],
            category: p.category || formattedCategoryTitle,
            sub_category: p.sub_category || null,
            rating: 4.9,
            is_platform: true,
            merchants: { 
                business_name: 'InTrust Official',
                slug: 'official',
                is_open: true
            }
        };
    });

    // Filter & map merchant inventory items
    const merchantItems = merchantInventory
        .filter(item => {
            const spCat = (item.shopping_products?.category || '').toLowerCase();
            return spCat.includes(categoryName) || 
                   categoryName.includes(spCat) ||
                   (isKnownDept && spCat.includes(deptMeta.key.replace(/_/g, ' ')));
        })
        .map(item => {
            const sp = item.shopping_products || {};
            const merch = item.merchants || {};
            const sPrice = Math.round(((item.retail_price_paise || sp.suggested_retail_price_paise || 0) / 100));
            const mrpVal = Math.round(((sp.mrp_paise || item.retail_price_paise || 0) / 100));
            const prodSlug = sp.slug || sp.id || item.product_id || item.id;
            return {
                id: item.id,
                inventory_id: item.id,
                product_id: item.product_id || sp.id,
                title: item.custom_title || sp.title || 'Product',
                slug: prodSlug,
                description: sp.description,
                selling_price: sPrice,
                sale_price: sPrice,
                price: sPrice,
                mrp: mrpVal,
                stock_quantity: item.stock_quantity,
                images: sp.product_images || [],
                category: sp.category || formattedCategoryTitle,
                sub_category: sp.sub_category || null,
                rating: 4.8,
                is_platform: false,
                merchants: {
                    business_name: merch.business_name || 'Local Verified Merchant',
                    slug: merch.slug || '',
                    is_open: merch.is_open ?? true,
                    department: merch.department || null
                }
            };
        });

    // Check category validity: if not in taxonomy and has zero matching products, 404
    const matchedCategory = dbCategories.find(c => {
        const s = getCategorySlug(c);
        return s === normalizedSlug || s === normalizedSlug.replace(/-/g, '_');
    });

    if (!matchedCategory && !isKnownDept && platformItems.length === 0 && merchantItems.length === 0) {
        return notFound();
    }

    // Combine both: InTrust official first, then local merchant offerings
    let products = [...platformItems, ...merchantItems];

    // Filter merchants specifically for this category/department
    const targetDeptKey = normalizedSlug.replace(/-/g, '_');
    const matchedMerchants = merchants.filter(m => {
        const mDept = (m.department || '').toLowerCase().replace(/-/g, '_');
        const bName = (m.business_name || '').toLowerCase();
        return mDept === targetDeptKey || 
               mDept.includes(targetDeptKey) || 
               targetDeptKey.includes(mDept) ||
               bName.includes(categoryName);
    });
    const displayMerchants = matchedMerchants.length > 0 
        ? matchedMerchants.slice(0, 6) 
        : merchants.slice(0, 6);

    const categoryBannerImage = getCategoryImage(categoryName) || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80';

    return (
        <div className="w-full space-y-6 font-body-md text-slate-900 dark:text-on-surface pb-16 transition-colors duration-500">
            {/* ── Breadcrumbs ── */}
            <CustomerBreadcrumbs 
                items={[
                    { label: 'Shop Hub', href: '/shop' }, 
                    { label: 'Categories', href: '/shop/category' },
                    { label: formattedCategoryTitle }
                ]} 
                className="mb-2"
            />

            {/* ── Category Hero Banner (Matching Shop Hub Everyday Essentials Aesthetic) ── */}
            <div className="relative w-full rounded-3xl overflow-hidden shadow-md border border-outline-variant/30 min-h-[190px] sm:min-h-[220px] flex items-center group bg-gradient-to-r from-blue-950/80 via-slate-900/60 to-slate-950/40">
                <img
                    src={categoryBannerImage}
                    alt={formattedCategoryTitle}
                    className="absolute inset-0 w-full h-full object-cover object-center opacity-50 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                />
                {/* Soft, translucent gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/45 to-transparent pointer-events-none" />

                <div className="relative z-10 p-5 sm:p-8 max-w-xl flex flex-col justify-between h-full space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] sm:text-[11px] font-black tracking-widest uppercase text-sky-300 bg-sky-500/25 px-3 py-1 rounded-full border border-sky-400/30 w-fit backdrop-blur-md flex items-center gap-1.5">
                            <Zap size={12} className="fill-sky-400 text-sky-400" />
                            Guaranteed Same-Day Delivery
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-bold text-white/90 bg-white/10 px-2.5 py-1 rounded-full border border-white/20 backdrop-blur-md">
                            100% InTrust Verified
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-sm capitalize">
                            {formattedCategoryTitle}
                        </h1>
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#0095F6] shrink-0 drop-shadow-sm" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" fill="#0095F6" />
                            <path d="M8.5 12.5L10.8 14.8L15.5 9.8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed max-w-lg">
                        {isKnownDept ? deptMeta.description : `Browse top-rated local merchants and genuine products with 100% InTrust Buyer Protection, guaranteed same-day delivery, and live order tracking.`}
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
                        {products.length} verified products available for instant ordering
                    </p>
                </div>

                <CategoryProductsClient 
                    initialProducts={products} 
                    categoryName={formattedCategoryTitle} 
                    categories={dbCategories}
                />
            </div>

            {/* ── Verified Stores Offering Category ── */}
            {displayMerchants.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-outline-variant/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h2 className="text-xl font-black text-slate-900 dark:text-on-surface tracking-tight">
                                    Verified Stores in {formattedCategoryTitle}
                                </h2>
                                <svg className="w-4 h-4 text-[#0095F6] shrink-0" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" fill="#0095F6" />
                                    <path d="M8.5 12.5L10.8 14.8L15.5 9.8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-on-surface-variant font-medium">
                                Local merchants stocking genuine inventory with express store dispatch
                            </p>
                        </div>

                        <Link
                            href="/shop"
                            className="text-xs font-bold text-blue-600 dark:text-primary hover:underline flex items-center gap-1"
                        >
                            <span>All Stores</span>
                            <ChevronRight size={14} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {displayMerchants.map((merchant) => (
                            <MerchantCard
                                key={merchant.id}
                                merchant={merchant}
                                variant="showcase"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Explore Other Departments ── */}
            <div className="pt-8 border-t border-slate-200 dark:border-outline-variant/20 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-on-surface tracking-tight">
                            Explore Other Departments
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-on-surface-variant font-medium">
                            Browse instant delivery products across verified departments
                        </p>
                    </div>
                    <Link 
                        href="/shop/category" 
                        className="text-xs font-bold text-blue-600 dark:text-primary hover:underline flex items-center gap-1"
                    >
                        <span>View All Departments</span>
                        <ChevronRight size={14} />
                    </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {dbCategories.map((cat) => {
                        const catSlug = getCategorySlug(cat);
                        const catLabel = cat.name || cat.label || catSlug;
                        const catImage = cat.image_url || getCategoryImage(cat);
                        const Icon = getCategoryIcon(catLabel);
                        const isCurrent = catSlug.toLowerCase() === normalizedSlug;
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
