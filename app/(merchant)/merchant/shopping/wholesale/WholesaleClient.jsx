'use client';

import { useState } from 'react';
import { Package, Plus, Minus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MerchantFloatingCart from '@/components/merchant/shopping/MerchantFloatingCart';
import SuccessAnimation from '@/components/ui/SuccessAnimation';

export default function WholesaleClient({ products = [], merchant, categories = [] }) {
    const router = useRouter();
    const [cart, setCart] = useState({}); // { productId: quantity }
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isProcessingGateway, setIsProcessingGateway] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showSuccess, setShowSuccess] = useState(false);
    const [successStats, setSuccessStats] = useState(null);

    const updateQuantity = (productId, delta, maxStock) => {
        setCart(prev => {
            const currentQty = prev[productId] || 0;
            const newQty = Math.max(0, Math.min(maxStock, currentQty + delta));

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
            quantity: qty,
        };
    });

    const subtotal = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const merchantBalance = merchant.wallet_balance_paise / 100;

    const handlePurchaseWallet = async () => {
        if (cartItems.length === 0) return;
        if (subtotal > merchantBalance) {
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
                { label: 'Total Paid', value: `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
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

    const filteredProducts = selectedCategory === 'All'
        ? products
        : products.filter(p => p.category === selectedCategory);

    return (
        <>
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
                    {/* Tab Bar */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-900 text-white shadow-lg shadow-slate-900/20">
                            Buy Stock
                        </span>
                        <Link
                            href="/merchant/shopping/wholesale/history"
                            className="px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all"
                        >
                            Purchase History
                        </Link>
                    </div>

                    {/* Category Filters */}
                    {categories.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            <button
                                onClick={() => setSelectedCategory('All')}
                                className={`whitespace-nowrap px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex-shrink-0 ${selectedCategory === 'All'
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                All
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.name)}
                                    className={`whitespace-nowrap px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 flex-shrink-0 ${selectedCategory === cat.name
                                        ? 'bg-white text-slate-900 shadow-lg ring-2 ring-slate-900 ring-offset-2 ring-offset-[#f8f9fb]'
                                        : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
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
                                        <div className={`aspect-[4/3] relative bg-gradient-to-br ${gradientClass} p-1`}>
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
                                                    onClick={() => updateQuantity(product.id, -1, product.admin_stock)}
                                                    className="flex-1 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-white transition-colors"
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className="w-8 text-center font-black text-white text-base">
                                                    {qty}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(product.id, 1, product.admin_stock)}
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
