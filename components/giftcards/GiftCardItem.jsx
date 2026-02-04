'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function GiftCardItem({ coupon, index = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full"
        >
            {/* Image/Banner Area */}
            <div className={`relative h-44 bg-gradient-to-br ${coupon.gradient} flex items-center justify-center`}>
                {/* Discount Badge - Top Left */}
                {coupon.discount > 0 && (
                    <div className="absolute top-3 left-3 z-10">
                        <span className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg">
                            {coupon.discount}% OFF
                        </span>
                    </div>
                )}

                {/* Brand Logo */}
                <div className="w-16 h-16 bg-white rounded-xl shadow-md flex items-center justify-center text-3xl">
                    {coupon.logo}
                </div>
            </div>

            {/* Card Body */}
            <div className="p-6 flex-1 flex flex-col">
                {/* Brand Name */}
                <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">
                    {coupon.brand}
                </h3>

                {/* Verified Badge */}
                <p className="text-sm text-gray-500 mb-auto">
                    ✓ Verified Voucher
                </p>

                {/* Pricing */}
                <div className="mt-6 space-y-2">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900">₹{coupon.sellingPrice}</span>
                        <span className="text-lg text-gray-400 line-through">₹{coupon.value}</span>
                    </div>
                    <p className="text-sm font-medium text-green-600">
                        Save ₹{coupon.value - coupon.sellingPrice}
                    </p>
                </div>

                {/* CTA Button */}
                <Link
                    href={`/gift-cards/${coupon.id}`}
                    className="block w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg font-semibold transition-colors"
                >
                    Buy Now
                </Link>
            </div>
        </motion.div>
    );
}
