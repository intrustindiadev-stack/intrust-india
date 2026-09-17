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
    initialPlatformProducts,
    initialMerchantInventory,
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
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [inspectingProduct, setInspectingProduct] = useState(null);

    // Normalize platform products
    const inTrustProducts = useMemo(() => {
        if (initialPlatformProducts?.length > 0) {
            return initialPlatformProducts.map((p, idx) => ({
                id: p.id,
                title: p.title || p.name,
                price: p.price || (p.wholesale_price_paise ? (p.wholesale_price_paise * 1.2) / 100 : 299),
                image: p.image_url || '/icons/intrustLogo.png',
                discount_percent: 15 + (idx % 3) * 5,
                shares: 450 + idx * 80,
                clicks: 1200 + idx * 190,
                promo_cashback_paise: p.promo_cashback_paise || 10000,
                is_merchant_inventory: false
            }));
        }
        // Fallback demo products from mockups
        return [
            { id: 'p1', title: 'Organic Atta (10kg)', price: 249, discount_percent: 15, shares: 1240, clicks: 5320, image: '/icons/intrustLogo.png', promo_cashback_paise: 10000, is_merchant_inventory: false },
            { id: 'p2', title: 'Premium Basmati Rice (5kg)', price: 799, discount_percent: 20, shares: 980, clicks: 3110, image: '/icons/intrustLogo.png', promo_cashback_paise: 15000, is_merchant_inventory: false },
            { id: 'p3', title: 'Cold Pressed Mustard Oil (1L)', price: 499, discount_percent: 12, shares: 640, clicks: 1240, image: '/icons/intrustLogo.png', promo_cashback_paise: 10000, is_merchant_inventory: false },
            { id: 'p4', title: 'Wireless Noise Cancelling Earbuds', price: 1099, discount_percent: 25, shares: 890, clicks: 4200, image: '/icons/intrustLogo.png', promo_cashback_paise: 20000, is_merchant_inventory: false },
            { id: 'p5', title: 'Solar Smart Inverter 2kVA', price: 18499, discount_percent: 10, shares: 320, clicks: 1850, image: '/icons/intrustLogo.png', promo_cashback_paise: 100000, is_merchant_inventory: false }
        ];
    }, [initialPlatformProducts]);

    // Normalize merchant products
    const myProducts = useMemo(() => {
        if (initialMerchantInventory?.length > 0) {
            return initialMerchantInventory.map((item) => ({
                id: item.id,
                title: item.product_name,
                price: item.price,
                image: item.image_url || '/icons/intrustLogo.png',
                discount_percent: 10,
                shares: 120,
                clicks: 450,
                is_merchant_inventory: true
            }));
        }
        return [
            { id: 'm1', title: 'Fresh Desi Cow Ghee (1L)', price: 650, discount_percent: 10, shares: 420, clicks: 1680, image: '/icons/intrustLogo.png', is_merchant_inventory: true },
            { id: 'm2', title: 'Whole Wheat Flour Fresh Ground', price: 280, discount_percent: 15, shares: 310, clicks: 1100, image: '/icons/intrustLogo.png', is_merchant_inventory: true },
            { id: 'm3', title: 'Handmade Multigrain Cookies Box', price: 199, discount_percent: 18, shares: 190, clicks: 820, image: '/icons/intrustLogo.png', is_merchant_inventory: true }
        ];
    }, [initialMerchantInventory]);

    const activeList = activeTab === 'my_products' ? myProducts : inTrustProducts;

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return activeList;
        return activeList.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [activeList, searchQuery]);

    return (
        <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Breadcrumbs & Heading */}
            <MarketingBreadcrumbs
                customTitle="Product Marketing"
                customSubtitle="Share products across WhatsApp & Socials. Track performance and earn promotion cashbacks."
            />

            {/* Navigation Tabs & Search Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                {/* Tabs */}
                <div className="flex items-center gap-2">
                    {isMerchant && (
                        <button
                            onClick={() => setActiveTab('my_products')}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
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
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                            activeTab === 'intrust_products'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        InTrust Products ({inTrustProducts.length})
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                    />
                </div>
            </div>

            {/* InTrust Product Rewards Highlight Strip */}
            {activeTab === 'intrust_products' && (
                <div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                            <Gift size={18} />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-300">
                                InTrust Promotional Rewards Active
                            </h4>
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                Share any official InTrust product: Earn on customer link visits + up to ₹1,000 order sales cashback!
                            </p>
                        </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-xs">
                        Guaranteed Payout
                    </span>
                </div>
            )}

            {/* Product Grid - 2 columns on mobile, 3 on lg, 4 on xl */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {filteredProducts.map((product) => {
                    const cashbackAmount = (product.promo_cashback_paise || 10000) / 100;
                    return (
                        <div
                            key={product.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                        >
                            <div className="p-3 sm:p-5">
                                {/* Product Image & Discount Tag */}
                                <div 
                                    onClick={() => setInspectingProduct(product)}
                                    className="relative w-full h-28 sm:h-44 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2.5 sm:mb-3.5 flex items-center justify-center cursor-pointer"
                                >
                                    <img
                                        src={product.image}
                                        alt={product.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    {product.discount_percent && (
                                        <span className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md bg-rose-600 text-white shadow-xs">
                                            {product.discount_percent}% OFF
                                        </span>
                                    )}
                                </div>

                                {/* Product Title & Price */}
                                <h3 
                                    onClick={() => setInspectingProduct(product)}
                                    className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-600 transition-colors"
                                >
                                    {product.title}
                                </h3>
                                <div className="flex items-baseline gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                                    <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                        ₹{product.price}
                                    </span>
                                    <span className="text-[10px] sm:text-[11px] text-slate-400 line-through">
                                        ₹{Math.round(product.price * 1.25)}
                                    </span>
                                </div>

                                {/* Performance Metrics: Shares & Clicks */}
                                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-800">
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
                                    <div className="mt-2 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-[9px] sm:text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                        <Gift size={10} className="shrink-0" />
                                        <span className="truncate">Earn ₹{cashbackAmount}</span>
                                    </div>
                                )}
                            </div>

                            {/* Card Footer: Share Button */}
                            <div className="p-3 sm:p-4 pt-0 flex items-center gap-1.5 sm:gap-2">
                                <button
                                    onClick={() => setInspectingProduct(product)}
                                    className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                                    title="View Details"
                                >
                                    <Info size={14} />
                                </button>
                                <button
                                    onClick={() => setSelectedProduct(product)}
                                    className="flex-1 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
                                >
                                    <Send size={13} />
                                    <span>Share</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Product Insight & Performance Detail Modal */}
            {inspectingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="text-blue-600" size={20} />
                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                    Product Marketing Insights
                                </h3>
                            </div>
                            <button
                                onClick={() => setInspectingProduct(null)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <img
                                src={inspectingProduct.image}
                                alt={inspectingProduct.title}
                                className="w-20 h-20 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                                <h4 className="text-base font-black text-slate-900 dark:text-white truncate">
                                    {inspectingProduct.title}
                                </h4>
                                <div className="flex items-baseline gap-2 mt-0.5">
                                    <span className="text-lg font-black text-slate-900 dark:text-white">
                                        ₹{inspectingProduct.price}
                                    </span>
                                    {inspectingProduct.discount_percent && (
                                        <span className="text-xs font-bold text-rose-600">
                                            {inspectingProduct.discount_percent}% Discount
                                        </span>
                                    )}
                                </div>
                                <span className="text-[11px] font-bold text-slate-400">
                                    {inspectingProduct.is_merchant_inventory ? 'Direct Merchant Stock' : 'Official InTrust Catalog'}
                                </span>
                            </div>
                        </div>

                        {/* Performance KPIs */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Shares</span>
                                <div className="text-lg font-black text-blue-600">{inspectingProduct.shares}</div>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Clicks</span>
                                <div className="text-lg font-black text-amber-600">{inspectingProduct.clicks}</div>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Reward</span>
                                <div className="text-lg font-black text-emerald-600">₹{(inspectingProduct.promo_cashback_paise || 10000) / 100}</div>
                            </div>
                        </div>

                        {/* Promotional Pitch suggestion */}
                        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 space-y-1 text-xs">
                            <span className="font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                                <Sparkles size={13} className="text-blue-600" />
                                Recommended Promotion Strategy
                            </span>
                            <p className="text-blue-700 dark:text-blue-400 text-[11px] leading-relaxed">
                                Share this product directly to WhatsApp groups and stories. Any order placed through your link automatically credits guaranteed wallet cashback!
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                            <button
                                onClick={() => setInspectingProduct(null)}
                                className="flex-1 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200"
                            >
                                Back to Catalog
                            </button>
                            <button
                                onClick={() => {
                                    const target = inspectingProduct;
                                    setInspectingProduct(null);
                                    setSelectedProduct(target);
                                }}
                                className="flex-1 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5"
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
