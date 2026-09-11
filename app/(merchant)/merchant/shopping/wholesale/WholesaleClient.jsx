'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Minus, Sparkles, Search, ChevronRight, BadgeCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import MerchantFloatingCart from '@/components/merchant/shopping/MerchantFloatingCart';
import SuccessAnimation from '@/components/ui/SuccessAnimation';
import WholesaleProductModal from '@/components/merchant/shopping/WholesaleProductModal';
import { generateOrderInvoice } from '@/lib/invoiceGenerator';
import { PLATFORM_CONFIG } from '@/lib/config/platform';
import { usePayerContact } from '@/hooks/usePayerContact';
import { validatePayerContact } from '@/lib/merchant/validatePayerContact';
import { normalizePayerMobile } from '@/lib/merchant/payerContactRules';
import Pagination from '@/components/search/Pagination';
import { getSubCategories } from '@/lib/constants/categories';

const PARTNERS = [
    { name: 'AJIO', color: 'from-slate-900 to-slate-800', text: 'text-white', logo: '/logos/ajio.svg', desc: 'Fashion Hub', tag: 'Top Tier' },
    { name: 'NYKAA', color: 'from-rose-500 to-pink-600', text: 'text-white', logo: '/logos/nykaa.svg', desc: 'Beauty & Care', tag: 'Popular' },
    { name: 'TATA CLiQ', color: 'from-red-600 to-rose-700', text: 'text-white', logo: '/logos/tata-cliq.svg', desc: 'Lifestyle', tag: 'Luxury' },
    { name: 'RELIANCE', color: 'from-blue-700 to-indigo-800', text: 'text-white', logo: '/logos/reliance.svg', desc: 'Retail Giant', tag: 'Essential' },
    { name: 'AMAZON', color: 'from-amber-400 to-orange-500', text: 'text-black', logo: '/logos/amazon.svg', desc: 'Bulk Sourcing', tag: 'Global' },
    { name: 'FLIPKART', color: 'from-blue-500 to-sky-600', text: 'text-white', logo: '/logos/flipkart.svg', desc: 'Wholesale', tag: 'Value' },
];

function PartnerCard({ partner }) {
    const [imgFailed, setImgFailed] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="flex-shrink-0 group cursor-default"
        >
            <div className="relative w-[150px] sm:w-[165px] p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between overflow-hidden">
                {/* Logo Area */}
                <div className="relative mb-2.5 flex items-center justify-between">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center p-2 relative overflow-hidden border border-slate-100 dark:border-slate-700/60 shadow-xs">
                        {imgFailed ? (
                            <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-base rounded-lg">
                                {partner.name ? partner.name[0] : ''}
                            </div>
                        ) : (
                            <Image
                                src={partner.logo}
                                alt={partner.name}
                                fill
                                sizes="48px"
                                className="object-contain p-1"
                                onError={() => setImgFailed(true)}
                            />
                        )}
                    </div>
                    
                    {/* Live dot */}
                    <div className="flex items-center gap-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                    </div>
                </div>

                {/* Text Info */}
                <div className="space-y-0.5 mb-2.5">
                    <div className="flex items-center gap-1">
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white tracking-tight truncate">{partner.name}</h3>
                        <BadgeCheck size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-tight leading-tight truncate">{partner.desc}</p>
                </div>

                {/* Status Tag & Action */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {partner.tag}
                    </span>
                    <span className="text-slate-400 group-hover:text-blue-600 transition-colors">
                        <Plus size={13} strokeWidth={2.5} />
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

function PartnerCarousel() {
    const marqueePartners = [...PARTNERS, ...PARTNERS, ...PARTNERS];

    return (
        <div className="space-y-2.5 mb-4">
            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.33%); }
                }
                .animate-marquee {
                    display: flex;
                    width: max-content;
                    animation: marquee 35s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}</style>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <BadgeCheck size={14} className="text-blue-600 dark:text-blue-400" />
                    <span>Verified Platform Sourcing Partners</span>
                </div>
            </div>
            
            <div className="relative overflow-hidden py-1">
                {/* Subtle edge fades */}
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#f8f9fb] dark:from-[#080a10] to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f8f9fb] dark:from-[#080a10] to-transparent z-10 pointer-events-none" />

                <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar">
                    <div className="animate-marquee flex items-center gap-3.5">
                        {marqueePartners.map((partner, i) => (
                            <PartnerCard
                                key={`${partner.name}-${i}`}
                                partner={partner}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function WholesaleClient({
    products = [],
    merchant,
    categories = [],
    totalCount,
    page,
    pageSize,
    totalPages,
    initialSearchTerm,
    initialCategory
}) {
    const router = useRouter();
    const payerContact = usePayerContact({ requireMerchant: true });
    const [cart, setCart] = useState({}); // { productId: quantity }
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isProcessingGateway, setIsProcessingGateway] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'All');
    const [selectedSubCategory, setSelectedSubCategory] = useState('');
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
    const [showSuccess, setShowSuccess] = useState(false);
    const [successStats, setSuccessStats] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [flyingItems, setFlyingItems] = useState([]);
    const [lastBatchId, setLastBatchId] = useState(null);
    const [lastCartSnapshot, setLastCartSnapshot] = useState([]);
    const isAutoModeActive = merchant?.auto_mode_active || false;

    // Sync state with props
    useEffect(() => {
        setSelectedCategory(initialCategory || 'All');
    }, [initialCategory]);

    useEffect(() => {
        setSearchTerm(initialSearchTerm || '');
    }, [initialSearchTerm]);

    // Sync sub_category from URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setSelectedSubCategory(params.get('sub_category') || '');
    }, []);

    // Debounced search query update to URL
    useEffect(() => {
        const handler = setTimeout(() => {
            const params = new URLSearchParams(window.location.search);
            const currentQ = params.get('q') || '';
            if (searchTerm !== currentQ) {
                if (searchTerm) {
                    params.set('q', searchTerm);
                } else {
                    params.delete('q');
                }
                params.set('page', '1');
                router.push(`${window.location.pathname}?${params.toString()}`);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [searchTerm, router]);

    const handleCategoryChange = (category) => {
        setSelectedCategory(category);
        setSelectedSubCategory(''); // Reset sub-category when changing category
        const params = new URLSearchParams(window.location.search);
        if (category === 'All') {
            params.delete('category');
        } else {
            params.set('category', category);
        }
        params.delete('sub_category');
        params.set('page', '1');
        router.push(`${window.location.pathname}?${params.toString()}`);
    };

    const handleSubCategoryChange = (dept) => {
        const next = selectedSubCategory === dept ? '' : dept;
        setSelectedSubCategory(next);
        const params = new URLSearchParams(window.location.search);
        if (next) {
            params.set('sub_category', next);
        } else {
            params.delete('sub_category');
        }
        params.set('page', '1');
        router.push(`${window.location.pathname}?${params.toString()}`);
    };

    const handlePageChange = (newPage) => {
        const params = new URLSearchParams(window.location.search);
        params.set('page', newPage.toString());
        router.push(`${window.location.pathname}?${params.toString()}`);
    };

    const updateQuantity = (e, product, delta) => {
        const productId = product.id;
        const maxStock = product.admin_stock;

        // Resolve bounding rect synchronously to avoid React event pooling/nullification issues
        const rect = e?.currentTarget?.getBoundingClientRect();
        const currentQty = cart[productId] || 0;

        // Fly animation on Add
        if (delta > 0 && currentQty < maxStock && rect) {
            const animId = Date.now() + Math.random();

            // Get destination coordinates if cart button is present
            let destX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
            let destY = typeof window !== 'undefined' ? window.innerHeight - 50 : 0;
            const cartBtn = document.getElementById('merchant-floating-cart-btn');
            if (cartBtn) {
                const btnRect = cartBtn.getBoundingClientRect();
                destX = btnRect.left + btnRect.width / 2 - 24; // center the 48px flying icon
                destY = btnRect.top + btnRect.height / 2 - 24;
            }

            setFlyingItems(items => [...items, {
                id: animId,
                x: rect.left + rect.width / 2 - 24, // start from center of product image/button
                y: rect.top + rect.height / 2 - 24,
                destX,
                destY,
                image: product.product_images?.[0]
            }]);

            setTimeout(() => {
                setFlyingItems(items => items.filter(item => item.id !== animId));
            }, 1200);
        }

        setCart(prev => {
            const currentQtyInner = prev[productId] || 0;
            const newQty = Math.max(0, Math.min(maxStock, currentQtyInner + delta));

            if (newQty === 0) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }

            return { ...prev, [productId]: newQty };
        });
    };

    const removeFromCart = (productId) => {
        setCart(prev => {
            const { [productId]: _, ...rest } = prev;
            return rest;
        });
    };

    // Build cartItems with normalized shape for MerchantFloatingCart
    const cartItems = Object.entries(cart).map(([id, qty]) => {
        const product = products.find(p => p.id === id);
        return {
            id: product.id,
            title: product.title,
            unit_price: product.wholesale_price_paise / 100,
            wholesale_price: product.wholesale_price_paise / 100,
            retail_price: (product.suggested_retail_price_paise || 0) / 100,
            quantity: qty,
            gst_percentage: product.gst_percentage || 0,
        };
    });

    const subtotal = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const gstAmount = cartItems.reduce((sum, item) => {
        return sum + (item.unit_price * (item.quantity || 1) * (item.gst_percentage || 0) / 100);
    }, 0);
    const totalWithGst = subtotal + gstAmount;
    const merchantBalance = merchant.wallet_balance_paise / 100;

    const handlePurchaseWallet = async () => {
        if (cartItems.length === 0) return;
        if (totalWithGst > merchantBalance) {
            toast.error('Insufficient balance in your wallet');
            return;
        }

        setIsPurchasing(true);
        try {
            const payload = cartItems.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
            }));

            const { data, error } = await supabase.rpc('purchase_platform_products_bulk', {
                p_items: payload,
                p_merchant_id: merchant.id,
            });

            if (error) {
                if (error.code === '23514') {
                    if (error.message?.includes('admin_stock_non_negative')) {
                        throw new Error('Insufficient stock to complete this purchase');
                    }
                    throw new Error('Data constraint violation. Check constraints.');
                }
                if (error.code === '23502') throw new Error('Missing required system field.');
                if (error.code === '23503') throw new Error('Foreign key violation. A linked record is missing.');
                throw error;
            }
            if (data && !data.success) throw new Error(data.message);

            const batchId = data?.batch_id;
            const totalPaise = data?.total_paise || Math.round(totalWithGst * 100);

            // Snapshot cart before clearing
            const cartSnapshot = cartItems.map(item => ({
                ...item,
                shopping_products: {
                    title: item.title,
                    hsn_code: products.find(p => p.id === item.id)?.hsn_code || '-',
                    gst_percentage: item.gst_percentage || 0,
                },
                unit_price_paise: Math.round(item.unit_price * 100),
                total_price_paise: Math.round(item.unit_price * item.quantity * (1 + (item.gst_percentage || 0) / 100) * 100),
            }));

            setLastBatchId(batchId);
            setLastCartSnapshot(cartSnapshot);

            // Show success animation
            setSuccessStats([
                { label: 'Items Purchased', value: cartItems.reduce((s, i) => s + i.quantity, 0) },
                { label: 'Total Paid', value: `₹${totalWithGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
            ]);
            setCart({});
            setShowSuccess(true);
            router.refresh();

            // Auto-generate invoice
            if (batchId) {
                try {
                    await generateOrderInvoice({
                        order: {
                            id: batchId,
                            created_at: new Date().toISOString(),
                            delivery_fee_paise: 0,
                        },
                        items: cartSnapshot,
                        seller: PLATFORM_CONFIG.business,
                        customer: {
                            name: merchant.business_name,
                            address: merchant.business_address,
                            phone: merchant.business_phone,
                            gstin: merchant.gst_number,
                        },
                        type: 'shopping',
                    });
                } catch (invoiceErr) {
                    console.error('[Invoice generation failed]', invoiceErr);
                    toast('Invoice could not be auto-downloaded — use Purchase History to download it.', { icon: 'ℹ️' });
                }
            }
        } catch (error) {
            console.error('Purchase error:', error);
            toast.error(error.message || 'Purchase failed');
        } finally {
            setIsPurchasing(false);
        }
    };

    const handleGatewayPurchase = async () => {
        if (cartItems.length === 0) return;
        setIsProcessingGateway(true);

        const loadingToast = toast.loading('Initiating secure payment...');

        try {
            const contactValidation = validatePayerContact({
                email: payerContact.payerEmail,
                phone: payerContact.payerPhone,
            });
            if (!contactValidation.ok) {
                const focus = contactValidation.errors.phone ? 'business_phone' : 'business_email';
                const returnPath = typeof window !== 'undefined'
                    ? `${window.location.pathname}${window.location.search}`
                    : '/merchant/shopping/wholesale';
                toast.error(contactValidation.errors.phone || contactValidation.errors.email || 'Add your contact details to complete checkout.', { id: loadingToast });
                router.push(`/merchant/profile?focus=${focus}&return=${encodeURIComponent(returnPath)}`);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                toast.error('Session expired. Please login again.', { id: loadingToast });
                return;
            }

            const rawCartItems = Object.entries(cart).map(([id, qty]) => ({ product_id: id, quantity: qty }));

            const draftRes = await fetch('/api/merchant/shopping/wholesale/draft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    items: rawCartItems,
                    merchantId: merchant.id,
                }),
            });

            const draftData = await draftRes.json();
            if (!draftRes.ok) throw new Error(draftData.error || 'Failed to create wholesale draft');

            const clientTxnId = `WHLS_${Date.now()}_${merchant.id.slice(0, 4)}`;
            const initiateRes = await fetch('/api/sabpaisa/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    clientTxnId,
                    amount: (draftData.totalPaise / 100).toFixed(2),
                    payerName: payerContact.payerName || merchant.business_name || 'Merchant',
                    payerEmail: payerContact.payerEmail,
                    payerMobile: normalizePayerMobile(payerContact.payerPhone).slice(-10),
                    udf1: 'WHOLESALE_PURCHASE',
                    udf2: draftData.draftId,
                    udf3: merchant.id,
                }),
            });

            const initiateData = await initiateRes.json();
            if (!initiateRes.ok) {
                if (initiateData.error === 'INVALID_PAYER_CONTACT') {
                    const focus = initiateData.field === 'payerEmail' ? 'business_email' : 'business_phone';
                    const returnPath = typeof window !== 'undefined'
                        ? `${window.location.pathname}${window.location.search}`
                        : '/merchant/shopping/wholesale';
                    toast.error(initiateData.message || 'Add your mobile number to complete checkout.', { id: loadingToast });
                    router.push(`/merchant/profile?focus=${focus}&return=${encodeURIComponent(returnPath)}`);
                    return;
                }
                throw new Error(initiateData.message || initiateData.error || 'Failed to initiate payment');
            }

            toast.success('Redirecting to secure gateway...', { id: loadingToast });

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = initiateData.paymentUrl;
            for (const [key, value] of Object.entries({ encData: initiateData.encData, clientCode: initiateData.clientCode })) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value;
                form.appendChild(input);
            }
            document.body.appendChild(form);
            form.submit();
        } catch (err) {
            console.error('[Wholesale Gateway Error]', err);
            toast.error(err.message || 'An error occurred during gateway initiation.', { id: loadingToast });
            setIsProcessingGateway(false);
        }
    };

    const filteredProducts = products;

    return (
        <>
            <WholesaleProductModal
                product={selectedProduct}
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
            />

            {/* Fly to Cart Animation Elements */}
            {flyingItems.map(item => (
                <motion.div
                    key={item.id}
                    initial={{ x: item.x, y: item.y, scale: 0.8, opacity: 1, rotate: 0 }}
                    animate={{
                        x: item.destX,
                        y: item.destY,
                        scale: 0.3,
                        opacity: 0,
                        rotate: 360
                    }}
                    transition={{
                        x: { duration: 1.2, ease: "easeOut" },
                        y: { duration: 1.2, ease: "easeIn" },
                        scale: { duration: 1.2, ease: "easeInOut" },
                        opacity: { duration: 1.2, ease: "circIn" },
                        rotate: { duration: 1.2, ease: "linear" }
                    }}
                    className="fixed z-[9999] w-12 h-12 rounded-full overflow-hidden shadow-[0_10px_30px_rgba(16,185,129,0.5)] border-[3px] border-emerald-400 bg-white pointer-events-none flex items-center justify-center p-1"
                    style={{ left: 0, top: 0 }}
                >
                    {item.image ? (
                        <div className="w-full h-full relative rounded-full overflow-hidden">
                            <Image src={item.image} className="object-cover" alt="Flying item" fill sizes="48px" />
                            {/* Premium Overlay inside the image flying orb */}
                            <div className="absolute inset-0 bg-emerald-500/20 mix-blend-overlay"></div>
                        </div>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white shadow-inner">
                            <Package size={18} strokeWidth={2.5} />
                        </div>
                    )}
                </motion.div>
            ))}

            <SuccessAnimation
                isVisible={showSuccess}
                onClose={() => setShowSuccess(false)}
                title="Stock Purchased!"
                message="Your inventory has been updated. All purchased items are now available in your shop."
                stats={successStats}
                primaryAction={{ label: 'Manage Inventory', href: '/merchant/shopping/inventory' }}
                secondaryAction={{ label: 'Buy More Stock', onClick: () => setShowSuccess(false) }}
                tertiaryAction={lastBatchId ? {
                    label: '📄 Re-download Invoice',
                    onClick: async () => {
                        try {
                            await generateOrderInvoice({
                                order: { id: lastBatchId, created_at: new Date().toISOString(), delivery_fee_paise: 0 },
                                items: lastCartSnapshot,
                                seller: PLATFORM_CONFIG.business,
                                customer: {
                                    name: merchant.business_name,
                                    address: merchant.business_address,
                                    phone: merchant.business_phone,
                                    gstin: merchant.gst_number,
                                },
                                type: 'shopping',
                            });
                        } catch { toast.error('Invoice generation failed.'); }
                    },
                } : null}
            />

            <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-8 xl:items-start">
                <div className="min-w-0 space-y-5">
                    {/* Auto Mode Indicator */}
                    {isAutoModeActive && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 sm:p-4 flex items-center gap-3 shadow-xs">
                            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                <Sparkles size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Auto Mode Active</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-normal mt-0.5">
                                    InTrust AI is automatically managing your wholesale inventory & restocking when low.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Partner Carousel Area */}
                    <PartnerCarousel />

                    {/* Compact Sticky Search Bar */}
                    <div className="sticky top-[72px] z-30 py-2 bg-[#f8f9fb]/95 dark:bg-[#0b0e14]/95 backdrop-blur-md transition-all">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search products..."
                                aria-label="Search products"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs transition-all"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    aria-label="Clear search"
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Primary Segmented Navigation Tabs */}
                    <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80 max-w-full overflow-x-auto no-scrollbar gap-1">
                        <span className="px-3.5 sm:px-4 py-1.5 rounded-lg font-bold text-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs whitespace-nowrap">
                            Buy Stock
                        </span>
                        <Link
                            href="/merchant/shopping/wholesale/history"
                            className="px-3.5 sm:px-4 py-1.5 rounded-lg font-medium text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all whitespace-nowrap"
                        >
                            Purchase History
                        </Link>
                        <Link
                            href="/merchant/shopping/sales-to-intrust"
                            className="px-3.5 sm:px-4 py-1.5 rounded-lg font-medium text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all whitespace-nowrap"
                        >
                            Sales to InTrust
                        </Link>
                    </div>

                    {/* Category Filters */}
                    {categories.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                            <button
                                onClick={() => handleCategoryChange('All')}
                                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all flex-shrink-0 border ${
                                    selectedCategory === 'All'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                All
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleCategoryChange(cat.name)}
                                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 flex-shrink-0 border ${
                                        selectedCategory === cat.name
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${cat.color_gradient || 'from-blue-500 to-indigo-600'}`} />
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Dynamic Sub-Category Filter */}
                    {getSubCategories(selectedCategory).length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                                {selectedCategory === 'Fashion' ? 'Department:' : 'Sub-Category:'}
                            </span>
                            {getSubCategories(selectedCategory).map(sub => (
                                <button
                                    key={sub}
                                    onClick={() => handleSubCategoryChange(sub)}
                                    className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all flex-shrink-0 border ${
                                        selectedSubCategory === sub
                                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs'
                                            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300'
                                    }`}
                                >
                                    {sub === 'Men' ? '👔 ' : sub === 'Women' ? '👗 ' : sub === 'Kids' ? '🧒 ' : ''}{sub}
                                </button>
                            ))}
                            {selectedSubCategory && (
                                <button
                                    onClick={() => handleSubCategoryChange(selectedSubCategory)}
                                    className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors ml-1 uppercase tracking-wider shrink-0"
                                >
                                    ✕ Clear
                                </button>
                            )}
                        </div>
                    )}

                    {/* Products Grid */}
                    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 pb-4">
                        {filteredProducts.length === 0 ? (
                            <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-500">
                                    <Package size={24} />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                                    {searchTerm ? 'No products match your search' : 'No products available'}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-normal max-w-sm mx-auto mb-5">
                                    {searchTerm
                                        ? `No wholesale items found matching "${searchTerm}".`
                                        : selectedCategory !== 'All'
                                            ? `No products currently available in "${selectedCategory}".`
                                            : 'No wholesale stock available at this time.'}
                                </p>
                                {(searchTerm || selectedCategory !== 'All') && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            handleCategoryChange('All');
                                        }}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all"
                                    >
                                        Clear All Filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredProducts.map((product) => {
                                const qty = cart[product.id] || 0;
                                const isOutOfStock = product.admin_stock <= 0;
                                const isLowStock = product.admin_stock > 0 && product.admin_stock <= 5;

                                return (
                                    <div
                                        key={product.id}
                                        className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col group overflow-hidden"
                                    >
                                        {/* Product Image */}
                                        <div
                                            className="aspect-[4/3] relative bg-slate-50 dark:bg-slate-800/40 p-3 flex items-center justify-center cursor-pointer overflow-hidden border-b border-slate-100 dark:border-slate-800/60"
                                            onClick={() => setSelectedProduct(product)}
                                        >
                                            {product.product_images?.[0] ? (
                                                <Image
                                                    src={product.product_images[0]}
                                                    alt={product.title}
                                                    fill
                                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                                    className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Package size={32} className="text-slate-300 dark:text-slate-600" />
                                                </div>
                                            )}

                                            {/* Category badge */}
                                            <div className="absolute top-2.5 left-2.5 bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider border border-slate-200/80 dark:border-slate-700 shadow-xs">
                                                {product.category || 'Standard'}
                                            </div>

                                            {/* In-cart badge */}
                                            <AnimatePresence>
                                                {qty > 0 && (
                                                    <motion.div
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0, opacity: 0 }}
                                                        className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-bold shadow-xs flex items-center gap-1"
                                                    >
                                                        <span>{qty}</span>
                                                        <span className="text-[9px] uppercase tracking-wider opacity-80">in cart</span>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Product Information */}
                                        <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3
                                                    onClick={() => setSelectedProduct(product)}
                                                    className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                    title={product.title}
                                                >
                                                    {product.title}
                                                </h3>
                                                {product.description && (
                                                    <p className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs mt-1 line-clamp-1 font-normal">
                                                        {product.description}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                                                {/* Price & Stock Row */}
                                                <div className="flex items-baseline justify-between">
                                                    <div>
                                                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block leading-none">Wholesale</span>
                                                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 block leading-tight">
                                                            ₹{(product.wholesale_price_paise / 100).toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block leading-none">Stock</span>
                                                        <div className="flex items-center justify-end gap-1 mt-1">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${isOutOfStock ? 'bg-slate-400' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                            <span className={`text-xs font-semibold ${isOutOfStock ? 'text-slate-400' : isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                {product.admin_stock} {product.admin_stock === 1 ? 'unit' : 'units'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Compact Quantity Control */}
                                                <div className="flex items-center justify-between border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800/40">
                                                    <button
                                                        onClick={(e) => updateQuantity(e, product, -1)}
                                                        disabled={qty === 0}
                                                        aria-label={`Decrease quantity of ${product.title}`}
                                                        className="w-9 h-8 sm:w-10 sm:h-8 flex items-center justify-center rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-600 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                    >
                                                        <Minus size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <span 
                                                        className={`flex-1 text-center font-bold text-xs sm:text-sm ${qty > 0 ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400 dark:text-slate-500'}`}
                                                        aria-label={`Current quantity ${qty}`}
                                                    >
                                                        {qty}
                                                    </span>
                                                    <button
                                                        onClick={(e) => updateQuantity(e, product, 1)}
                                                        disabled={qty >= product.admin_stock || product.admin_stock === 0}
                                                        aria-label={`Increase quantity of ${product.title}`}
                                                        className="w-9 h-8 sm:w-10 sm:h-8 flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                    >
                                                        <Plus size={14} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="mb-28 lg:mb-0">
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            totalCount={totalCount}
                            pageSize={pageSize}
                            onPageChange={handlePageChange}
                        />
                    </div>
                </div>

            {/* Cart — desktop sticky sidebar & mobile FAB */}
                <aside>
                    <MerchantFloatingCart
                        cartItems={cartItems}
                        merchantBalance={merchantBalance}
                        subtotalInRupees={subtotal}
                        onRemoveItem={removeFromCart}
                        onPurchaseWallet={handlePurchaseWallet}
                        onPurchaseGateway={handleGatewayPurchase}
                        isPurchasing={isPurchasing}
                        isProcessingGateway={isProcessingGateway}
                        walletLabel="Pay via Wallet"
                        gatewayLabel="Pay via UPI / Cards"
                    />
                </aside>
            </div>
        </>
    );
}
