'use client';

import { useState, use } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Star, ShieldCheck, Clock, CheckCircle, Heart, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';
import GiftCardPreview from '@/components/giftcards/GiftCardPreview';
import PaymentMethodSelector from '@/components/giftcards/PaymentMethodSelector';
import CheckoutButton from '@/components/giftcards/CheckoutButton';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

export default function GiftCardDetailPage({ params }) {
    const [quantity, setQuantity] = useState(1);
    const [selectedPayment, setSelectedPayment] = useState('upi');
    const [isFavorite, setIsFavorite] = useState(false);

    // Unwrap params Promise using React.use()
    const { id } = use(params);

    // Mock data based on ID (In real app, fetch from Supabase)
    const card = {
        id: id,
        brand: 'Flipkart',
        faceValue: 500,
        sellingPrice: 463.50,
        discount: 7.3,
        rating: 4.8,
        sold: 856,
        merchant: 'Ravi Traders',
        verified: true,
        expiry: '365 days',
        stock: 25,
        gradient: 'from-blue-600 via-blue-500 to-cyan-500',
        logo: '🛒',
        terms: [
            'Valid on all products excluding gold and silver coins',
            'Full value must be redeemed in a single transaction',
            'Cannot be returned or refunded once purchased',
            'Valid for 1 year from date of issue'
        ]
    };

    const platformFee = (card.sellingPrice * 0.03).toFixed(2);
    const subtotal = (card.sellingPrice * quantity).toFixed(2);
    const totalAmount = (parseFloat(subtotal) + parseFloat(platformFee)).toFixed(2);
    const totalSavings = ((card.faceValue - card.sellingPrice) * quantity).toFixed(2);

    const handleCheckout = () => {
        alert('Proceeding to payment gateway...');
    };

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
                            { label: card.brand }
                        ]}
                    />

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
                                <GiftCardPreview card={card} />

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

                                {/* Savings Highlight - Minimal */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                                        <div className="text-xs text-green-700 font-medium mb-1">You Save</div>
                                        <div className="text-2xl font-bold text-green-700">₹{totalSavings}</div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                                        <div className="text-xs text-blue-700 font-medium mb-1">Discount</div>
                                        <div className="text-2xl font-bold text-blue-700">{card.discount}%</div>
                                    </div>
                                </div>

                                {/* Quantity Selector - Minimal */}
                                <div className="mb-6">
                                    <label className="text-sm font-semibold text-gray-900 mb-3 block">Quantity</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-12 h-12 rounded-2xl border border-gray-200 hover:border-[#92BCEA] hover:bg-[#92BCEA] hover:text-white transition-all flex items-center justify-center font-bold text-gray-700 text-lg"
                                        >
                                            −
                                        </button>
                                        <div className="flex-1 max-w-[100px]">
                                            <input
                                                type="number"
                                                value={quantity}
                                                onChange={(e) => setQuantity(Math.max(1, Math.min(card.stock, parseInt(e.target.value) || 1)))}
                                                className="w-full h-12 text-center border border-gray-200 rounded-2xl font-bold text-lg text-gray-900 focus:outline-none focus:border-[#92BCEA] focus:ring-4 focus:ring-[#92BCEA]/10 transition-all"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setQuantity(Math.min(card.stock, quantity + 1))}
                                            className="w-12 h-12 rounded-2xl border border-gray-200 hover:border-[#92BCEA] hover:bg-[#92BCEA] hover:text-white transition-all flex items-center justify-center font-bold text-gray-700 text-lg"
                                        >
                                            +
                                        </button>
                                        <div className="text-sm text-gray-500 font-medium">
                                            <span className="text-gray-900 font-semibold">{card.stock}</span> available
                                        </div>
                                    </div>
                                </div>

                                {/* Seller Info - Minimal */}
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center text-lg font-bold text-white shadow-md">
                                        {card.merchant.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-900 flex items-center gap-2 text-sm mb-0.5">
                                            {card.merchant}
                                            {card.verified && <ShieldCheck size={14} className="text-blue-500" />}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                                                <span className="font-medium text-gray-700">{card.rating}</span>
                                            </div>
                                            <span>•</span>
                                            <span>{card.sold}+ sold</span>
                                            <span>•</span>
                                            <span className="text-green-600 font-medium">Verified</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Terms - Minimal */}
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
                                    {card.terms.map((term, i) => (
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

                                {/* Price Breakdown - Minimal */}
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
                                <CheckoutButton amount={totalAmount} onClick={handleCheckout} />

                                {/* Trust Badges - Minimal */}
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
