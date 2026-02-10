'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import Image from 'next/image';
import { Star, ShieldCheck, Clock, CheckCircle, Heart, Share2, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

export default function GiftCardDetailPage({ params }) {
    const { user } = useAuth();
    const router = useRouter();

    // Unwrap params using React.use()
    const { id } = use(params);

    const [card, setCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [error, setError] = useState(null);
    const [purchaseError, setPurchaseError] = useState(null);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    const [quantity, setQuantity] = useState(1); // Future proofing
    const [kycStatus, setKycStatus] = useState(null);
    const [kycLoading, setKycLoading] = useState(true);

    useEffect(() => {
        if (id) fetchGiftCard();
    }, [id]);

    async function fetchGiftCard() {
        try {
            setLoading(true);
            setError(null);

            // Fetching from 'coupons' table as 'gift_cards' table does not exist in schema.
            // Using * to ensure we get all available fields including image_url.
            const { data, error } = await supabase
                .from('coupons')
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Gift card not found');

            setCard(data);
        } catch (err) {
            console.error('Error fetching gift card:', err);
            setError(err.message || 'Failed to load gift card');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        async function checkKYC() {
            if (!user) {
                setKycLoading(false);
                return;
            }
            try {
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('kyc_status')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    console.log("KYC Status fetched:", data.kyc_status);
                    setKycStatus(data.kyc_status);
                }
            } catch (err) {
                console.error("Error fetching KYC status:", err);
            } finally {
                setKycLoading(false);
            }
        }
        checkKYC();
    }, [user]);

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
                })
            });

            const orderData = await response.json();

            if (!response.ok) {
                if (response.status === 403 || orderData.error === 'KYC_REQUIRED') {
                    toast.error("KYC Verification Required. Please complete KYC first.");
                    // Removed auto-redirect to let user see the banner/button
                    return;
                }
                throw new Error(orderData.error || 'Failed to create order');
            }

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

        } catch (err) {
            console.error('Purchase initiation error:', err);
            setPurchaseError(err.message || 'Could not initiate purchase.');
        } finally {
            setPurchasing(false);
        }
    }

    // Calculation Helper - Handling Paise vs Rupees
    // Database stores prices in paise to avoid float issues.
    const sellingPrice = card ? card.selling_price_paise / 100 : 0;
    const faceValue = card ? card.face_value_paise / 100 : 0;
    const discount = card ? ((faceValue - sellingPrice) / faceValue * 100).toFixed(0) : 0;
    const isExpired = card && new Date(card.valid_until) <= new Date();
    const isAvailable = card && card.status === 'available' && !isExpired;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center pt-24">
                    <Loader2 size={48} className="animate-spin text-blue-600" />
                </div>
            </div>
        );
    }

    if (error || !card) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center pt-24 px-6 text-center">
                    <AlertCircle size={64} className="text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Unavailable</h2>
                    <p className="text-gray-600 mb-6">{error || 'This gift card is usually not accessible.'}</p>
                    <button
                        onClick={() => router.push('/gift-cards')}
                        className="px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        Browse Other Cards
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-sans">
            <Navbar />

            <div className="pt-28 pb-20">
                <div className="max-w-6xl mx-auto px-6">

                    {/* Breadcrumbs */}
                    <div className="mb-6">
                        <Breadcrumbs
                            items={[
                                { label: 'Gift Cards', href: '/gift-cards' },
                                { label: card.title || card.brand }
                            ]}
                        />
                    </div>

                    {/* Purchase Feedback */}
                    {purchaseSuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 mb-8 flex items-center gap-3"
                        >
                            <CheckCircle size={24} className="text-green-600" />
                            <span className="font-semibold">Purchase Successful! Redirecting you to your coupons...</span>
                        </motion.div>
                    )}

                    {purchaseError && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-8"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                                <div className="flex items-center gap-3">
                                    <AlertCircle size={24} className="text-red-600 shrink-0" />
                                    <span className="font-semibold">
                                        {purchaseError.includes('Only regular users') || purchaseError.includes('KYC')
                                            ? "KYC verification is required to purchase this gift card."
                                            : purchaseError}
                                    </span>
                                </div>
                                {(purchaseError.includes('Only regular users') || purchaseError.includes('KYC')) && (
                                    <button
                                        onClick={() => router.push('/profile')}
                                        className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-sm whitespace-nowrap"
                                    >
                                        Complete KYC
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Main Layout Grid */}
                    <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">

                        {/* LEFT COLUMN: Image */}
                        <div className="flex flex-col gap-6">
                            <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm group">
                                {card.image_url ? (
                                    <Image
                                        src={card.image_url}
                                        alt={card.title}
                                        fill
                                        className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                                        priority
                                    />
                                ) : (
                                    // Fallback Placeholder if no image
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                                        <Sparkles size={48} className="mb-3 text-gray-300" />
                                        <span className="text-sm font-medium">No Image Available</span>
                                    </div>
                                )}

                                {/* Discount Badge Overlay */}
                                {discount > 0 && (
                                    <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-md">
                                        {discount}% OFF
                                    </div>
                                )}
                            </div>

                            {/* Trust Badges Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                    <ShieldCheck className="text-blue-600 w-6 h-6" />
                                    <div>
                                        <p className="text-xs text-gray-500 font-semibold uppercase">Security</p>
                                        <p className="text-sm font-medium text-gray-900">Secure Payments</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                    <Clock className="text-blue-600 w-6 h-6" />
                                    <div>
                                        <p className="text-xs text-gray-500 font-semibold uppercase">Delivery</p>
                                        <p className="text-sm font-medium text-gray-900">Instant Delivery</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Details */}
                        <div className="flex flex-col gap-8">

                            {/* Header Info */}
                            <div>
                                <div className="text-sm font-bold text-blue-600 mb-2 uppercase tracking-wide">{card.brand}</div>
                                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">{card.title}</h1>

                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
                                    <div className="flex items-center text-yellow-500">
                                        <Star fill="currentColor" size={18} />
                                        <span className="ml-1 font-bold text-gray-900">4.8</span>
                                        <span className="mx-1 text-gray-300">•</span>
                                        <span className="text-gray-500 underline decoration-gray-300 underline-offset-4">856 Reviews</span>
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-gray-300" />
                                    <span className={card.status === 'available' ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                                        {card.status === 'available' ? 'In Stock' : 'sold Out'}
                                    </span>
                                </div>
                            </div>

                            {/* Price Section */}
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <div className="flex items-end gap-3 mb-2">
                                    <span className="text-4xl font-extrabold text-gray-900">₹{sellingPrice}</span>
                                    {faceValue > sellingPrice && (
                                        <span className="text-lg text-gray-400 line-through mb-1.5">₹{faceValue}</span>
                                    )}
                                </div>
                                {discount > 0 && (
                                    <p className="text-sm text-green-700 font-medium">
                                        You save <span className="font-bold">₹{Number((faceValue - sellingPrice).toFixed(2))}</span> ({discount}%)
                                    </p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Description</h3>
                                <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                                    {card.description || "Get instant access to this premium gift card. Valid on all products. Full value must be redeemed in a single transaction."}
                                </p>
                            </div>

                            {/* Quantity Selector (Visual Only for now) */}
                            {isAvailable && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-3">Quantity</label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center border border-gray-300 rounded-xl bg-white h-12">
                                            <button className="px-4 text-gray-500 hover:text-gray-900 transition-colors" disabled>-</button>
                                            <span className="w-8 text-center font-bold text-gray-900">1</span>
                                            <button className="px-4 text-gray-500 hover:text-gray-900 transition-colors" disabled>+</button>
                                        </div>
                                        <span className="text-xs text-gray-500 font-medium">Max 1 per order</span>
                                    </div>
                                </div>
                            )}

                            {/* KYC Warning Banner */}
                            {user && !kycLoading && kycStatus !== 'approved' && kycStatus !== 'verified' && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                                    <div className="flex gap-3">
                                        <div className="bg-amber-100 p-2 rounded-full h-fit text-amber-600">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-amber-900">KYC Verification Required</h4>
                                            <p className="text-sm text-amber-700 mt-1 mb-3">
                                                You need to complete your KYC verification to purchase gift cards.
                                            </p>
                                            <button
                                                onClick={() => router.push('/profile?section=kyc')}
                                                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                                            >
                                                Complete KYC Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3 mt-2">
                                <button
                                    onClick={handlePurchase}
                                    disabled={!isAvailable || purchasing}
                                    className={`
                                        w-full py-4 rounded-xl text-white font-semibold text-lg shadow-lg shadow-blue-200
                                        bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 transition-all
                                        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                                        flex items-center justify-center gap-2
                                    `}
                                >
                                    {purchasing ? (
                                        <>
                                            <Loader2 size={24} className="animate-spin" />
                                            Processing...
                                        </>
                                    ) : !isAvailable ? (
                                        'Sold Out'
                                    ) : (
                                        'Buy Now'
                                    )}
                                </button>

                                <button className="w-full py-3.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                                    <Share2 size={18} />
                                    Share with friends
                                </button>
                            </div>

                            {/* Login Prompt */}
                            {!user && (
                                <p className="text-center text-sm text-gray-500 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                    Please <span className="font-bold text-gray-900 cursor-pointer" onClick={() => router.push('/login')}>Log In</span> to complete your purchase.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Terms Section Below */}
                    <div className="mt-16 border-t border-gray-200 pt-10">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Terms & Conditions</h3>
                        <ul className="grid md:grid-cols-2 gap-4">
                            {(card.terms_and_conditions
                                ? card.terms_and_conditions.split('\n')
                                : ['Valid for 1 year from date of issue.', 'Redeemable online and in-store.', 'Non-refundable.', 'Cannot be exchanged for cash.']
                            ).map((term, i) => (
                                <li key={i} className="flex gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></div>
                                    {term}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <CustomerBottomNav />
        </div>
    );
}
