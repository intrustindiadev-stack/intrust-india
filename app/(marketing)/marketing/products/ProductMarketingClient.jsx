'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { 
    Search, 
    Share2, 
    Filter, 
    Send, 
    Sparkles, 
    ArrowUpRight, 
    MousePointerClick, 
    TrendingUp, 
    Check, 
    Gift,
    ShoppingBag,
    X,
    Info,
    ExternalLink
} from 'lucide-react';
import ShareModal from '@/components/marketing/ShareModal';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';

export default function ProductMarketingClient({
    user,
    merchant,
    isMerchant,
    initialPlatformProducts = [],
    initialMerchantInventory = [],
    initialUserShareLinks = [],
    rewardsConfig
}) {
    const searchParams = useSearchParams();
    const paramQ = searchParams?.get('q') || '';
    const [activeTab, setActiveTab] = useState(isMerchant && initialMerchantInventory.length > 0 ? 'my_products' : 'intrust_products');
    const [searchQuery, setSearchQuery] = useState(paramQ);

    useEffect(() => {
        if (paramQ) {
            setSearchQuery(paramQ);
        }
    }, [paramQ]);

    // Close open inspection modal on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setInspectingProduct(null);
                setSelectedProduct(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [inspectingProduct, setInspectingProduct] = useState(null);

    // Map user share link metrics by product_id
    const linkMetricsMap = useMemo(() => {
        const map = {};
        (initialUserShareLinks || []).forEach(l => {
            if (l.product_id) {
                map[l.product_id] = {
                    shares: l.shares_count || 1,
                    clicks: l.clicks_count || 0,
                    orders: l.orders_count || 0,
                    code: l.code
                };
            }
        });
        return map;
    }, [initialUserShareLinks]);

    // Normalize platform products
    const inTrustProducts = useMemo(() => {
        return (initialPlatformProducts || []).map((p) => {
            const metrics = linkMetricsMap[p.id] || { shares: 0, clicks: 0, orders: 0 };
            return {
                id: p.id,
                title: p.title || p.name,
                price: p.price || (p.wholesale_price_paise ? Math.round((p.wholesale_price_paise * 1.2) / 100) : 299),
                image: p.image_url || '/icons/intrustLogo.png',
                shares: metrics.shares,
                clicks: metrics.clicks,
                orders: metrics.orders,
                code: metrics.code || null,
                promo_cashback_paise: p.promo_cashback_paise || rewardsConfig?.product_promo_default_cashback_paise || 10000,
                is_merchant_inventory: false
            };
        });
    }, [initialPlatformProducts, linkMetricsMap, rewardsConfig]);

    // Normalize merchant products
    const myProducts = useMemo(() => {
        return (initialMerchantInventory || []).map((item) => {
            const metrics = linkMetricsMap[item.id] || { shares: 0, clicks: 0, orders: 0 };
            return {
                id: item.id,
                title: item.product_name,
                price: item.price,
                image: item.image_url || '/icons/intrustLogo.png',
                shares: metrics.shares,
                clicks: metrics.clicks,
                orders: metrics.orders,
                code: metrics.code || null,
                promo_cashback_paise: rewardsConfig?.product_promo_default_cashback_paise || 10000,
                is_merchant_inventory: true
            };
        });
    }, [initialMerchantInventory, linkMetricsMap, rewardsConfig]);

    const activeList = activeTab === 'my_products' ? myProducts : inTrustProducts;

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return activeList;
        return activeList.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [activeList, searchQuery]);

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-fadeIn">
            {/* Breadcrumbs & Heading */}
            <MarketingBreadcrumbs
                customTitle="Product Marketing"
                customSubtitle="Share products across WhatsApp & Socials. Track performance and earn promotion cashbacks."
            />

            {/* Navigation Tabs & Search Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3 sm:pb-4">
                {/* Tabs */}
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
                    {isMerchant && (
                        <button
                            onClick={() => setActiveTab('my_products')}
                            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black shrink-0 transition-all ${
                                activeTab === 'my_products'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            My Products ({myProducts.length})
                        </button>
                    )}

                    <button
                        onClick={() => setActiveTab('intrust_products')}
                        className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black shrink-0 transition-all ${
                            activeTab === 'intrust_products'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        InTrust Products ({inTrustProducts.length})
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64 md:w-72">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search products..."
                        className="w-full pl-9 pr-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                    />
                </div>
            </div>

            {/* InTrust Product Rewards Highlight Strip */}
            {activeTab === 'intrust_products' && (
                <div className="rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Gift size={16} />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-300">
                                InTrust Promotional Rewards Active
                            </h4>
                            <p className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400">
                                Share any official InTrust product: Earn on customer link visits + up to ₹1,000 order sales cashback!
                            </p>
                        </div>
                    </div>
                    <span className="self-start sm:self-auto text-[9px] sm:text-[10px] font-extrabold px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-600 text-white shadow-xs shrink-0">
                        Guaranteed Payout
                    </span>
                </div>
            )}

            {/* Product Grid or Empty State */}
            {filteredProducts.length === 0 ? (
                <div className="text-center py-10 sm:py-12 px-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 space-y-3 max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto">
                        <ShoppingBag size={24} />
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        {activeTab === 'my_products' ? 'No Inventory Products Found' : 'No Platform Products Match'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {activeTab === 'my_products'
                            ? 'Add products to your store inventory to generate shareable merchant deals.'
                            : 'Try adjusting your search query or clear filters to view available deals.'}
                    </p>
                    {activeTab === 'my_products' && (
                        <a
                            href="/merchant/shopping/inventory"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-xs transition-all"
                        >
                            <span>Manage Store Inventory →</span>
                        </a>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
                    {filteredProducts.map((product) => {
                        const cashbackAmount = (product.promo_cashback_paise || 10000) / 100;
                        return (
                        <div
                            key={product.id}
                            className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl lg:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                        >
                            <div className="p-2.5 sm:p-4">
                                {/* Product Image & Discount Tag */}
                                <div 
                                    onClick={() => setInspectingProduct(product)}
                                    className="relative w-full h-28 sm:h-36 lg:h-44 rounded-lg sm:rounded-xl lg:rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2 sm:mb-3 flex items-center justify-center cursor-pointer"
                                >
                                    <img
                                        src={product.image}
                                        alt={product.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    {product.discount_percent && (
                                        <span className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 text-[8px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-600 text-white shadow-xs">
                                            {product.discount_percent}% OFF
                                        </span>
                                    )}
                                </div>

                                {/* Product Title & Price */}
                                <h3 
                                    onClick={() => setInspectingProduct(product)}
                                    className="text-[11px] sm:text-xs lg:text-sm font-black text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-600 transition-colors"
                                    title={product.title}
                                >
                                    {product.title}
                                </h3>
                                <div className="flex items-baseline gap-1.5 mt-0.5 sm:mt-1">
                                    <span className="text-xs sm:text-sm lg:text-base font-black text-slate-900 dark:text-white">
                                        ₹{product.price}
                                    </span>
                                    <span className="text-[9px] sm:text-[10px] text-slate-400 line-through">
                                        ₹{Math.round(product.price * 1.25)}
                                    </span>
                                </div>

                                {/* Performance Metrics: Shares & Clicks */}
                                <div className="flex items-center justify-between text-[9px] sm:text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 sm:mt-2.5 pt-1.5 sm:pt-2.5 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-0.5 sm:gap-1">
                                        <Share2 size={11} className="text-blue-500" />
                                        <span>{product.shares}</span>
                                    </div>
                                    <div className="flex items-center gap-0.5 sm:gap-1">
                                        <MousePointerClick size={11} className="text-amber-500" />
                                        <span>{product.clicks}</span>
                                    </div>
                                </div>

                                {/* Potential Cashback Pill */}
                                {!product.is_merchant_inventory && (
                                    <div className="mt-1.5 sm:mt-2 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md sm:rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-[8px] sm:text-[9px] sm:text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                        <Gift size={10} className="shrink-0" />
                                        <span className="truncate">Earn ₹{cashbackAmount}</span>
                                    </div>
                                )}
                            </div>

                            {/* Card Footer: Share Button */}
                            <div className="p-2.5 sm:p-4 pt-0 flex items-center gap-1.5 sm:gap-2">
                                <button
                                    onClick={() => setInspectingProduct(product)}
                                    className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors shrink-0"
                                    title="View Details"
                                >
                                    <Info size={13} />
                                </button>
                                <button
                                    onClick={() => setSelectedProduct(product)}
                                    className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] sm:text-xs flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all"
                                >
                                    <Send size={12} />
                                    <span>Share</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            )}

            {/* Product Insight & Performance Detail Modal */}
            {inspectingProduct && (
                <div 
                    onClick={() => setInspectingProduct(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 max-w-md sm:max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 sm:space-y-5 cursor-default"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="text-blue-600" size={18} />
                                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                    Product Marketing Insights
                                </h3>
                            </div>
                            <button
                                onClick={() => setInspectingProduct(null)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4">
                            <img
                                src={inspectingProduct.image}
                                alt={inspectingProduct.title}
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                                    {inspectingProduct.title}
                                </h4>
                                <div className="flex items-baseline gap-2 mt-0.5">
                                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                        ₹{inspectingProduct.price}
                                    </span>
                                    {inspectingProduct.discount_percent && (
                                        <span className="text-xs font-bold text-rose-600">
                                            {inspectingProduct.discount_percent}% Discount
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">
                                    {inspectingProduct.is_merchant_inventory ? 'Direct Merchant Stock' : 'Official InTrust Catalog'}
                                </span>
                            </div>
                        </div>

                        {/* Performance KPIs */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-center">
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Shares</span>
                                <div className="text-base sm:text-lg font-black text-blue-600">{inspectingProduct.shares}</div>
                            </div>
                            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-center">
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Clicks</span>
                                <div className="text-base sm:text-lg font-black text-amber-600">{inspectingProduct.clicks}</div>
                            </div>
                            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-center">
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Reward</span>
                                <div className="text-base sm:text-lg font-black text-emerald-600">₹{(inspectingProduct.promo_cashback_paise || 10000) / 100}</div>
                            </div>
                        </div>

                        {/* Promotional Pitch suggestion */}
                        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 space-y-1 text-xs">
                            <span className="font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                                <Sparkles size={13} className="text-blue-600" />
                                Recommended Promotion Strategy
                            </span>
                            <p className="text-blue-700 dark:text-blue-400 text-[10px] sm:text-[11px] leading-relaxed">
                                Share this product directly to WhatsApp groups and stories. Any order placed through your link automatically credits guaranteed wallet cashback!
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                            <button
                                onClick={() => setInspectingProduct(null)}
                                className="w-full sm:flex-1 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-colors"
                            >
                                Back to Catalog
                            </button>
                            <button
                                onClick={() => {
                                    const target = inspectingProduct;
                                    setInspectingProduct(null);
                                    setSelectedProduct(target);
                                }}
                                className="w-full sm:flex-1 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all"
                            >
                                <Send size={13} />
                                <span>Generate Share Link</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {selectedProduct && (
                <ShareModal
                    isOpen={!!selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    product={selectedProduct}
                    user={user}
                    merchant={merchant}
                    rewardsConfig={rewardsConfig}
                />
            )}
        </div>
    );
}
