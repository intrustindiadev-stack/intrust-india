'use client';

import { useState } from 'react';
import { Package, Plus, Minus, Sparkles, Search, ChevronRight, BadgeCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MerchantFloatingCart from '@/components/merchant/shopping/MerchantFloatingCart';
import SuccessAnimation from '@/components/ui/SuccessAnimation';
import WholesaleProductModal from '@/components/merchant/shopping/WholesaleProductModal';

const PARTNERS = [
    { name: 'AJIO', color: 'from-slate-900 to-slate-800', text: 'text-white', logo: 'https://cdn.iconscout.com/icon/free/png-256/free-ajio-3521255-2944669.png', desc: 'Fashion Hub', tag: 'Top Tier' },
    { name: 'NYKAA', color: 'from-rose-500 to-pink-600', text: 'text-white', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Nykaa_Logo.svg', desc: 'Beauty & Care', tag: 'Popular' },
    { name: 'TATA CLiQ', color: 'from-red-600 to-rose-700', text: 'text-white', logo: 'https://logos-world.net/wp-content/uploads/2023/07/Tata-CLiQ-Logo.png', desc: 'Lifestyle', tag: 'Luxury' },
    { name: 'RELIANCE', color: 'from-blue-700 to-indigo-800', text: 'text-white', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Reliance_Industries_Logo.svg', desc: 'Retail Giant', tag: 'Essential' },
    { name: 'AMAZON', color: 'from-amber-400 to-orange-500', text: 'text-black', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', desc: 'Bulk Sourcing', tag: 'Global' },
    { name: 'FLIPKART', color: 'from-blue-500 to-sky-600', text: 'text-white', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Flipkart_logo.svg', desc: 'Wholesale', tag: 'Value' },
];

function PartnerCarousel() {
    // Duplicate partners for seamless loop
    const marqueePartners = [...PARTNERS, ...PARTNERS, ...PARTNERS];

    return (
        <div className="space-y-6 mb-12 mt-2 overflow-hidden">
            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    display: flex;
                    width: max-content;
                    animation: marquee 40s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}</style>

            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full shadow-lg shadow-blue-500/20" />
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Global Partners</h2>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] mt-1">Live Sourcing Network</p>
                    </div>
                </div>
            </div>
            
            <div className="relative group">
                {/* Fade Gradients for Edge Softening */}
                <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#f7f8fa] dark:from-[#080a10] to-transparent z-20 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#f7f8fa] dark:from-[#080a10] to-transparent z-20 pointer-events-none" />

                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-4">
                    <div className="animate-marquee hover:pause flex items-center gap-6">
                        {marqueePartners.map((partner, i) => (
                            <motion.div
                                key={`${partner.name}-${i}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: (i % PARTNERS.length) * 0.1 }}
                                whileHover={{ 
                                    y: -12,
                                    transition: { duration: 0.4, ease: "easeOut" }
                                }}
                                className="flex-shrink-0 group cursor-pointer snap-center"
                            >
                                <div className="relative w-[180px] sm:w-[220px] p-7 rounded-[3rem] bg-white dark:bg-[#0c0e16] border border-slate-100 dark:border-white/[0.05] shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.12)] dark:shadow-none dark:hover:bg-white/[0.03] transition-all duration-500 overflow-hidden">
                                    {/* Premium Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                    
                                    {/* Ambient Glow Background */}
                                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
                                    
                                    {/* Logo Area */}
                                    <div className="relative mb-6">
                                        <div className={`w-20 h-20 rounded-[2rem] bg-white dark:bg-white flex items-center justify-center p-4 shadow-2xl shadow-black/10 group-hover:rotate-3 transition-transform duration-500 relative z-10`}>
                                            <img 
                                                src={partner.logo} 
                                                alt={partner.name} 
                                                className="w-full h-full object-contain"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                        </div>
                                        
                                        <div className="absolute -bottom-1 -right-1 z-20">
                                            <div className="relative flex h-6 w-6">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20" />
                                                <div className="relative bg-emerald-500 w-6 h-6 rounded-full border-[5px] border-white dark:border-[#0c0e16] shadow-xl" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Text Info */}
                                    <div className="space-y-1.5 relative z-10">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight">{partner.name}</h3>
                                            <div className="bg-blue-500/10 p-0.5 rounded-md">
                                                <BadgeCheck size={14} className="text-blue-600 dark:text-blue-400" />
                                            </div>
                                        </div>
                                        <p className="text-[13px] font-bold text-slate-500 dark:text-white/40 tracking-tight leading-tight">{partner.desc}</p>
                                    </div>

                                    {/* Tag Overlay */}
                                    <div className="mt-6 pt-6 border-t border-dashed border-slate-100 dark:border-white/5 flex items-center justify-between relative z-10">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.2em] mb-0.5">Status</span>
                                            <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{partner.tag}</span>
                                        </div>
                                        <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                            <Plus size={18} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function WholesaleClient({ products = [], merchant, categories = [] }) {
    const router = useRouter();
    const [cart, setCart] = useState({}); // { productId: quantity }
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isProcessingGateway, setIsProcessingGateway] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [successStats, setSuccessStats] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [flyingItems, setFlyingItems] = useState([]);

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

            // Show success animation
            setSuccessStats([
                { label: 'Items Purchased', value: cartItems.reduce((s, i) => s + i.quantity, 0) },
                { label: 'Total Paid', value: `₹${totalWithGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
            ]);
            setCart({});
            setShowSuccess(true);
            router.refresh();
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

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('name, email, mobile')
                .eq('id', merchant.user_id)
                .single();

            const clientTxnId = `WHLS-${Date.now()}-${merchant.id.slice(0, 4)}`;
            const initiateRes = await fetch('/api/sabpaisa/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    clientTxnId,
                    amount: (draftData.totalPaise / 100).toFixed(2),
                    payerName: profile?.name || merchant.business_name || 'Merchant',
                    payerEmail: profile?.email || '',
                    payerMobile: profile?.mobile || '',
                    udf1: 'WHOLESALE_PURCHASE',
                    udf2: draftData.draftId,
                    udf3: merchant.id,
                }),
            });

            const initiateData = await initiateRes.json();
            if (!initiateRes.ok) throw new Error(initiateData.error || 'Failed to initiate payment');

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

    const filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const isAutoModeActive = merchant?.auto_mode;

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
                            <img src={item.image} className="w-full h-full object-cover" alt="Flying item" />
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
            />

            <div className="space-y-6">
                {/* Page Header */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white shadow-xl dark:shadow-none dark:bg-white/[0.02] border border-slate-100 dark:border-white/10 p-8 rounded-3xl backdrop-blur-md">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-500/30">
                                    <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">Wholesale Hub</h1>
                            </div>
                            <p className="text-slate-500 dark:text-gray-400 text-sm font-medium pl-1 hidden sm:block">Source premium inventory from global partners and restock your digital shelves.</p>
                        </div>
                    </div>
                </div>

                {/* Products Area */}
                <div className="space-y-6">
                    {/* Auto Mode Indicator */}
                    {isAutoModeActive && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#0a1f16]/90 border border-emerald-500/30 rounded-3xl p-5 md:p-6 mb-6 relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)] group flex items-center gap-4"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/20 to-transparent opacity-50 blur-xl"></div>
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 relative z-10">
                                <Sparkles className="text-emerald-400" size={24} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-emerald-400 font-black text-sm uppercase tracking-widest mb-1 drop-shadow-md">Auto Mode Active</h3>
                                <p className="text-emerald-100/70 text-xs md:text-sm font-medium tracking-tight">Focus on your business. Intrust AI is automatically managing your wholesale inventory & restocking when low.</p>
                            </div>
                        </motion.div>
                    )}

                    {/* Partner Carousel Area */}
                    <PartnerCarousel />

                    {/* Premium Sticky Search Bar */}
                    <div className="sticky top-[80px] pt-4 sm:pt-8 pb-4 z-[40] bg-[#f8f9fb]/90 dark:bg-[#0b0e14]/90 backdrop-blur-2xl -mx-4 px-4 sm:-mx-8 sm:px-8 transition-all">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="text-slate-400" size={20} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search inventory..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 shadow-sm transition-all"
                            />
                        </div>
                    </div>

                    {/* Tab Bar */}
                    <div className="flex items-center gap-3 flex-wrap mt-2">
                        <span className="px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-900 text-white shadow-lg shadow-slate-900/20">
                            Buy Stock
                        </span>
                        <Link
                            href="/merchant/shopping/wholesale/history"
                            className="px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-white dark:bg-white/5 text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            Purchase History
                        </Link>
                    </div>

                    {/* Category Filters */}
                    {categories.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto py-4 custom-scrollbar">
                            <button
                                onClick={() => setSelectedCategory('All')}
                                className={`whitespace-nowrap px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex-shrink-0 ${selectedCategory === 'All'
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg shadow-slate-900/20 dark:shadow-white/20'
                                    : 'bg-white dark:bg-white/5 text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                All
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.name)}
                                    className={`whitespace-nowrap px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 flex-shrink-0 ${selectedCategory === cat.name
                                        ? 'bg-white dark:bg-black text-slate-900 dark:text-white shadow-lg ring-2 ring-slate-900 dark:ring-white ring-offset-2 ring-offset-[#f8f9fb] dark:ring-offset-[#0b0e14]'
                                        : 'bg-white dark:bg-white/5 text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${cat.color_gradient}`} />
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Products Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-32 xl:pb-6">
                        {filteredProducts.length === 0 ? (
                            <div className="col-span-2 py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                                <Package className="mx-auto text-slate-200 mb-4" size={56} />
                                <h3 className="text-lg font-black text-slate-900 mb-1">No products found</h3>
                                <p className="text-slate-400 text-sm font-medium">Try selecting a different category.</p>
                            </div>
                        ) : (
                            filteredProducts.map((product) => {
                                const categoryDetails = categories.find(c => c.name === product.category);
                                const gradientClass = categoryDetails?.color_gradient || 'from-slate-100 to-slate-200';
                                const qty = cart[product.id] || 0;

                                return (
                                    <motion.div
                                        key={product.id}
                                        layout
                                        className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-600/8 transition-all duration-500 flex flex-col group overflow-hidden"
                                    >
                                        {/* Product Image */}
                                        <div
                                            className={`aspect-[4/3] relative bg-gradient-to-br ${gradientClass} p-1 cursor-pointer`}
                                            onClick={() => setSelectedProduct(product)}
                                        >
                                            <div className="w-full h-full bg-white rounded-[1.7rem] overflow-hidden">
                                                {product.product_images?.[0] ? (
                                                    <img
                                                        src={product.product_images[0]}
                                                        alt={product.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package size={40} className="text-slate-300" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Category badge */}
                                            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
                                                {product.category || 'Standard'}
                                            </div>

                                            {/* In-cart badge */}
                                            <AnimatePresence>
                                                {qty > 0 && (
                                                    <motion.div
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0, opacity: 0 }}
                                                        className="absolute top-3 right-3 w-7 h-7 bg-[#1e3a5f] rounded-full text-white text-xs font-black flex items-center justify-center shadow-lg"
                                                    >
                                                        {qty}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Info */}
                                        <div className="p-4 flex-1 flex flex-col">
                                            <h3 className="text-sm font-black text-slate-900 line-clamp-1 mb-0.5 tracking-tight">
                                                {product.title}
                                            </h3>
                                            <p className="text-slate-400 text-xs mb-3 line-clamp-2 flex-1">
                                                {product.description}
                                            </p>

                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Wholesale</p>
                                                    <p className="text-base font-black text-blue-600">
                                                        ₹{(product.wholesale_price_paise / 100).toLocaleString('en-IN')}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Stock</p>
                                                    <p className="text-sm font-bold text-slate-500">{product.admin_stock}</p>
                                                </div>
                                            </div>

                                            {/* Qty controls */}
                                            <div className="flex items-center bg-[#1e3a5f] rounded-2xl p-1 shadow-lg shadow-blue-900/15">
                                                <button
                                                    onClick={(e) => updateQuantity(e, product, -1)}
                                                    className="flex-1 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-white transition-colors"
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className="w-8 text-center font-black text-white text-base">
                                                    {qty}
                                                </span>
                                                <button
                                                    onClick={(e) => updateQuantity(e, product, 1)}
                                                    className="flex-1 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-white transition-colors"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Cart — desktop sticky sidebar sits in its own row; FAB handles mobile */}
            <div className="hidden xl:block">
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
            </div>
            {/* Mobile FAB Cart */}
            <div className="xl:hidden">
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
            </div>
        </>
    );
}
