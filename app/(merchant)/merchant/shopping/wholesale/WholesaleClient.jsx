'use client';

import { useState } from 'react';
import { Package, Plus, Minus, Sparkles, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MerchantFloatingCart from '@/components/merchant/shopping/MerchantFloatingCart';
import SuccessAnimation from '@/components/ui/SuccessAnimation';
import WholesaleProductModal from '@/components/merchant/shopping/WholesaleProductModal';

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

            if (error) throw error;
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

    const isAutoModeActive = merchant?.auto_mode_status === 'active';

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
                            <Package size={18} strokeWidth={2.5}/>
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

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Products Area */}
                <div className="xl:col-span-2 space-y-6">
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
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4 pb-40 xl:pb-10">
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

                {/* Floating Cart */}
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
