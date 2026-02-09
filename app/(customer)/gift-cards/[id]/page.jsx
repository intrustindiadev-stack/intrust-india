'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { Star, ShieldCheck, Clock, CheckCircle, Heart, Share2, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';
import GiftCardPreview from '@/components/giftcards/GiftCardPreview';
import PaymentMethodSelector from '@/components/giftcards/PaymentMethodSelector';
import CheckoutButton from '@/components/giftcards/CheckoutButton';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

export default function GiftCardDetailPage({ params }) {
    const [coupon, setCoupon] = useState(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [error, setError] = useState(null);
    const [purchaseError, setPurchaseError] = useState(null);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [selectedPayment, setSelectedPayment] = useState('upi');
    const [isFavorite, setIsFavorite] = useState(false);

    const { user, profile } = useAuth();
    const router = useRouter();

    // Unwrap params Promise using React.use()
    const { id } = use(params);

    useEffect(() => {
        fetchCoupon();
    }, [id]);

    async function fetchCoupon() {
        try {
            setLoading(true);
            setError(null);

            // Fetch single coupon - explicitly select fields (never encrypted_code)
            const { data, error } = await supabase
                .from('coupons')
                .select(`
                    id,
                    brand,
                    title,
                    description,
                    category,
                    face_value_paise,
                    selling_price_paise,
                    masked_code,
                    status,
                    valid_from,
                    valid_until,
                    terms_and_conditions,
                    usage_instructions,
                    image_url,
                    tags
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            if (!data) {
                setError('Coupon not found');
                return;
            }

            setCoupon(data);
        } catch (err) {
            console.error('Error fetching coupon:', err);
            setError(err.message || 'Failed to load coupon');
        } finally {
            setLoading(false);
        }
    }

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    async function handlePurchase() {
        if (!user) {
            router.push('/login');
            return;
        }

        try {
            setPurchasing(true);
            setPurchaseError(null);

<<<<<<< Updated upstream
            // Call purchase API
            const response = await fetch('/api/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    coupon_id: coupon.id,
                    payment_reference: `UPI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
=======
            const isScriptLoaded = await loadRazorpayScript();
            if (!isScriptLoaded) {
                throw new Error('Razorpay SDK failed to load. Are you online?');
            }

            // 1. Create Order
            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    giftcardId: card.id,
>>>>>>> Stashed changes
                })
            });

            const orderData = await response.json();

            if (!response.ok) {
                if (response.status === 403 || orderData.error === 'KYC_REQUIRED') {
                    showToast("KYC Verification Required. Redirecting...");
                    setTimeout(() => router.push('/profile?section=kyc'), 1500);
                    return;
                }
                throw new Error(orderData.error || 'Failed to create order');
            }

<<<<<<< Updated upstream
            // Success
            setPurchaseSuccess(true);
            setTimeout(() => {
                router.push('/my-coupons');
            }, 2000);
=======
            // 2. Initialize Razorpay Option
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'INTRUST Gift Cards',
                description: `Purchase of ${card.title}`,
                image: '/logo.png', // Ensure you have a logo at /public/logo.png or remove this
                order_id: orderData.id, // Razorpay Order ID
                handler: async function (response) {
                    try {
                        const verifyRes = await fetch('/api/verify-payment', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            }),
                        });

                        const verifyData = await verifyRes.json();

                        if (verifyData.success) {
                            setPurchaseSuccess(true);
                            setTimeout(() => {
                                router.push('/my-coupons');
                            }, 2000);
                        } else {
                            throw new Error('Payment verification failed');
                        }
                    } catch (error) {
                        console.error('Verification Error:', error);
                        setPurchaseError('Payment successful but verification failed. Contact support.');
                    }
                },
                prefill: {
                    name: user.user_metadata?.full_name || user.email,
                    email: user.email,
                },
                theme: {
                    color: '#2563EB', // Blue-600 to match theme
                },
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.on('payment.failed', function (response) {
                setPurchaseError(`Payment Failed: ${response.error.description}`);
            });
            paymentObject.open();
>>>>>>> Stashed changes

        } catch (err) {
            console.error('Purchase initiation error:', err);
            setPurchaseError(err.message || 'Could not initiate purchase.');
        } finally {
            setPurchasing(false);
        }
    }

    // Helper functions
    function getGradientForCategory(category) {
        const gradients = {
            gift_cards: 'from-purple-600 via-purple-500 to-pink-500',
            electronics: 'from-blue-600 via-blue-500 to-cyan-500',
            fashion: 'from-pink-600 via-pink-500 to-rose-500',
            food: 'from-orange-600 via-orange-500 to-yellow-500',
            entertainment: 'from-indigo-600 via-indigo-500 to-purple-500'
        }
        return gradients[category] || 'from-gray-600 via-gray-500 to-gray-400'
    }

    function getBrandLogo(brand) {
        const logos = {
            'Flipkart': '🛒',
            'Amazon': '📦',
            'Myntra': '👗',
            'Swiggy': '🍔',
            'Zomato': '🍕',
            'BookMyShow': '🎬',
            'Uber': '🚗'
        }
        return logos[brand] || brand.charAt(0)
    }

    function formatPrice(paise) {
        return (paise / 100).toFixed(2);
    }

    function calculateDiscount(faceValue, sellingPrice) {
        return ((faceValue - sellingPrice) / faceValue * 100).toFixed(1);
    }

    // Check if coupon is expired or sold
    const isExpired = coupon && new Date(coupon.valid_until) <= new Date();
    const isSold = coupon && coupon.status === 'sold';
    const isAvailable = coupon && coupon.status === 'available' && !isExpired;

    // Calculate prices
    const sellingPrice = coupon ? coupon.selling_price_paise / 100 : 0;
    const faceValue = coupon ? coupon.face_value_paise / 100 : 0;
    const platformFee = (sellingPrice * 0.03).toFixed(2);
    const subtotal = (sellingPrice * quantity).toFixed(2);
    const totalAmount = (parseFloat(subtotal) + parseFloat(platformFee)).toFixed(2);
    const totalSavings = ((faceValue - sellingPrice) * quantity).toFixed(2);
    const discount = coupon ? calculateDiscount(coupon.face_value_paise, coupon.selling_price_paise) : 0;

    // Map to GiftCardPreview format
    const cardData = coupon ? {
        id: coupon.id,
        brand: coupon.brand,
        faceValue: faceValue,
        sellingPrice: sellingPrice,
        discount: discount,
        rating: 4.8,
        sold: 856,
        merchant: 'INTRUST Platform',
        verified: true,
        expiry: '365 days',
        stock: isAvailable ? 25 : 0,
        gradient: getGradientForCategory(coupon.category),
        logo: getBrandLogo(coupon.brand),
        terms: coupon.terms_and_conditions ? coupon.terms_and_conditions.split('\n').filter(t => t.trim()) : [
            'Valid on all products',
            'Full value must be redeemed in a single transaction',
            'Cannot be returned or refunded once purchased',
            'Valid for 1 year from date of issue'
        ]
    } : null;

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
                <Navbar />
                <div style={{ paddingTop: '15vh' }} className="pb-24 px-4 sm:px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={48} className="animate-spin text-[#92BCEA]" />
                        </div>
                    </div>
                </div>
                <CustomerBottomNav />
            </div>
        );
    }

    // Error state
    if (error || !coupon) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
                <Navbar />
                <div style={{ paddingTop: '15vh' }} className="pb-24 px-4 sm:px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8 text-center">
                            <AlertCircle size={48} className="mx-auto mb-4 text-red-600" />
                            <h2 className="text-2xl font-bold text-red-900 mb-2">Error Loading Coupon</h2>
                            <p className="text-red-700 mb-4">{error || 'Coupon not found'}</p>
                            <button
                                onClick={() => router.push('/gift-cards')}
                                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-all"
                            >
                                Back to Marketplace
                            </button>
                        </div>
                    </div>
                </div>
                <CustomerBottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <Navbar />

            {/* Main Content with 15vh top spacing */}
            <div style={{ paddingTop: '15vh' }} className="pb-24 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Breadcrumbs */}
                    <Breadcrumbs
                        items={[
                            { label: 'Gift Cards', href: '/gift-cards' },
                            { label: coupon.brand }
                        ]}
                    />

                    {/* Success Message */}
                    {purchaseSuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-green-50 border-2 border-green-200 rounded-3xl p-6 mb-6 text-center"
                        >
                            <CheckCircle size={48} className="mx-auto mb-3 text-green-600" />
                            <h3 className="text-xl font-bold text-green-900 mb-2">Purchase Successful!</h3>
                            <p className="text-green-700">Redirecting to your coupons...</p>
                        </motion.div>
                    )}

                    {/* Purchase Error */}
                    {purchaseError && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 mb-6 text-center"
                        >
                            <AlertCircle size={48} className="mx-auto mb-3 text-red-600" />
                            <h3 className="text-xl font-bold text-red-900 mb-2">Purchase Failed</h3>
                            <p className="text-red-700">{purchaseError}</p>
                        </motion.div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                        {/* Left Column: Product Details */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Premium Card Preview */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-lg"
                            >
                                <GiftCardPreview card={cardData} />

                                {/* Action Buttons */}
                                <div className="flex gap-3 mt-6 mb-6">
                                    <button
                                        onClick={() => setIsFavorite(!isFavorite)}
                                        className={`flex-1 py-3 rounded-2xl border-2 font-semibold transition-all flex items-center justify-center gap-2 ${isFavorite
                                            ? 'border-red-500 bg-red-50 text-red-600'
                                            : 'border-gray-200 hover:border-red-300 text-gray-700'
                                            }`}
                                    >
                                        <Heart size={18} className={isFavorite ? 'fill-red-500' : ''} />
                                        {isFavorite ? 'Saved' : 'Save'}
                                    </button>
                                    <button className="flex-1 py-3 rounded-2xl border-2 border-gray-200 hover:border-[#92BCEA] text-gray-700 font-semibold transition-all flex items-center justify-center gap-2">
                                        <Share2 size={18} />
                                        Share
                                    </button>
                                </div>

                                {/* Status Indicators */}
                                {isSold && (
                                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6">
                                        <p className="text-red-900 font-bold text-center">This coupon has been sold</p>
                                    </div>
                                )}
                                {isExpired && (
                                    <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 mb-6">
                                        <p className="text-orange-900 font-bold text-center">This coupon has expired</p>
                                    </div>
                                )}

                                {/* Savings Highlight */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                                        <div className="text-xs text-green-700 font-medium mb-1">You Save</div>
                                        <div className="text-2xl font-bold text-green-700">₹{totalSavings}</div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                                        <div className="text-xs text-blue-700 font-medium mb-1">Discount</div>
                                        <div className="text-2xl font-bold text-blue-700">{discount}%</div>
                                    </div>
                                </div>

                                {/* Coupon Details */}
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Code:</span>
                                        <span className="font-semibold text-gray-900">{coupon.masked_code}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Valid Until:</span>
                                        <span className="font-semibold text-gray-900">
                                            {new Date(coupon.valid_until).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Category:</span>
                                        <span className="font-semibold text-gray-900 capitalize">
                                            {coupon.category.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>

                                {/* Seller Info */}
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center text-lg font-bold text-white shadow-md">
                                        I
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-900 flex items-center gap-2 text-sm mb-0.5">
                                            INTRUST Platform
                                            <ShieldCheck size={14} className="text-blue-500" />
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                                                <span className="font-medium text-gray-700">4.8</span>
                                            </div>
                                            <span>•</span>
                                            <span className="text-green-600 font-medium">Verified Platform</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Terms */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="bg-white rounded-3xl border border-gray-100 p-6 shadow-lg"
                            >
                                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <CheckCircle size={18} className="text-[#92BCEA]" />
                                    Terms & Conditions
                                </h3>
                                <ul className="space-y-2.5">
                                    {cardData.terms.map((term, i) => (
                                        <li key={i} className="flex gap-2.5 text-sm text-gray-600">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#92BCEA] flex-shrink-0 mt-2" />
                                            <span className="leading-relaxed">{term}</span>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        </div>

                        {/* Right Column: Checkout - Sticky */}
                        <div className="lg:col-span-1">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xl lg:sticky"
                                style={{ top: 'calc(15vh + 2rem)' }}
                            >
                                <h2 className="text-lg font-bold text-gray-900 mb-6">Checkout</h2>

                                {/* Price Breakdown */}
                                <div className="space-y-3 mb-6 pb-6 border-b border-gray-100">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Price × {quantity}</span>
                                        <span className="font-semibold text-gray-900">₹{subtotal}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Platform Fee (3%)</span>
                                        <span className="font-semibold text-gray-900">₹{platformFee}</span>
                                    </div>
                                    <div className="flex justify-between pt-3 border-t border-gray-100">
                                        <span className="font-bold text-gray-900">Total Amount</span>
                                        <span className="text-2xl font-bold bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] bg-clip-text text-transparent">
                                            ₹{totalAmount}
                                        </span>
                                    </div>
                                </div>

                                {/* Payment Methods */}
                                <div className="mb-6">
                                    <PaymentMethodSelector
                                        selectedPayment={selectedPayment}
                                        setSelectedPayment={setSelectedPayment}
                                    />
                                </div>

                                {/* Checkout Button */}
                                <CheckoutButton
                                    amount={totalAmount}
                                    onClick={handlePurchase}
                                    disabled={!isAvailable || !user}
                                    loading={purchasing}
                                />

                                {!user && (
                                    <p className="text-xs text-center text-gray-500 mt-3">
                                        Please <a href="/login" className="text-[#92BCEA] font-semibold">login</a> to purchase
                                    </p>
                                )}

                                {/* Trust Badges */}
                                <div className="grid grid-cols-2 gap-2.5 text-xs mt-4">
                                    <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-xl">
                                        <ShieldCheck size={15} className="text-green-600 flex-shrink-0" />
                                        <span className="text-green-700 font-semibold">Secure</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                                        <Clock size={15} className="text-blue-600 flex-shrink-0" />
                                        <span className="text-blue-700 font-semibold">Instant</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <CustomerBottomNav />
        </div>
    );
}
