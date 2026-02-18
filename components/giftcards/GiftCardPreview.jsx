'use client';

import { motion } from 'framer-motion';

export default function GiftCardPreview({ card }) {
    return (
        <div className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-8 sm:p-10 text-white relative overflow-hidden`}>
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/20 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
                {/* Logo */}
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-2xl border border-white/30 mb-6">
                    {card.logo}
                </div>

                {/* Brand */}
                <div className="mb-6">
                    <div className="text-sm font-medium text-white/80 mb-1">GIFT CARD</div>
                    <h1 className="text-3xl sm:text-4xl font-bold">{card.brand}</h1>
                </div>

                {/* Value */}
                <div>
                    <div className="text-sm font-medium text-white/80 mb-1">Face Value</div>
                    <div className="text-4xl sm:text-5xl font-bold">₹{card.faceValue}</div>
                </div>
            </div>
        </div>
    );
}
