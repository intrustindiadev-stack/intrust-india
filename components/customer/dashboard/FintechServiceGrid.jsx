'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Sun, Gift, Smartphone, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function FintechServiceGrid() {
    const services = [
        { id: 'shop', label: 'E-Commerce', icon: ShoppingCart, color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30', href: '/shop' },
        { id: 'solar', label: 'PM Solar', icon: Sun, color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30', href: '/solar' },
        { id: 'giftcards', label: 'Gift Cards', icon: Gift, color: 'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/30', href: '/gift-cards' },
        { id: 'nfc', label: 'NFC Pass', icon: Smartphone, color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30', href: '/nfc-service' },
        { id: 'rewards', label: 'Rewards', icon: Zap, color: 'text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/30', href: '/rewards' },
    ];

    return (
        <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm">
            <div className="flex justify-between items-center mb-5">
                <div>
                    <h3 className="text-base font-extrabold text-on-surface tracking-tight">Quick Services</h3>
                    <p className="text-xs text-on-surface-variant font-medium">Instant access to InTrust lifestyle features</p>
                </div>
                <Link href="/services" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                    <span>View All</span>
                    <ArrowRight size={12} />
                </Link>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:gap-4">
                {services.map((service) => {
                    const Icon = service.icon;
                    return (
                        <Link
                            key={service.id}
                            href={service.href}
                            className="flex flex-col items-center gap-2 group text-center"
                        >
                            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm ${service.color}`}>
                                <Icon size={22} strokeWidth={2.2} />
                            </div>
                            <span className="text-[11px] font-bold text-on-surface-variant group-hover:text-primary transition-colors truncate max-w-full">
                                {service.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

export default React.memo(FintechServiceGrid);
