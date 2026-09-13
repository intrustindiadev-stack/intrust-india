'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, Store, ShieldCheck, ArrowRight, Share2 } from 'lucide-react';
import Link from 'next/link';

function FintechGrowthSection({ userData }) {
    const { kycStatus, merchantStatus, referralCode } = userData || {};

    // Only show KYC if not verified/approved
    const showKyc = kycStatus !== 'verified' && kycStatus !== 'approved';
    const showMerchant = merchantStatus !== 'active' && merchantStatus !== 'pending';

    const items = [
        {
            id: 'refer',
            title: 'Refer & Earn',
            description: 'Invite friends, earn unlimited rewards.',
            icon: Users,
            color: 'from-pink-500 to-rose-500',
            bgLight: 'bg-pink-50 dark:bg-pink-900/20',
            iconBg: 'bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-400',
            href: '/refer',
            show: true
        },
        {
            id: 'merchant',
            title: 'Become a Merchant',
            description: 'Grow your business with our platform.',
            icon: Store,
            color: 'from-blue-500 to-cyan-500',
            bgLight: 'bg-blue-50 dark:bg-blue-900/20',
            iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
            href: '/merchant-apply',
            show: showMerchant
        },
        {
            id: 'kyc',
            title: 'Complete KYC',
            description: 'Unlock higher transaction limits.',
            icon: ShieldCheck,
            color: 'from-amber-500 to-orange-500',
            bgLight: 'bg-amber-50 dark:bg-amber-900/20',
            iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
            href: '/profile?focus=kyc',
            show: showKyc
        }
    ].filter(item => item.show);

    if (items.length === 0) return null;

    return (
        <div className="bg-surface-container-lowest rounded-3xl p-5 sm:p-7 shadow-xs border border-outline-variant/30">
            <h3 className="text-base sm:text-lg font-black text-on-surface mb-4 tracking-tight">Growth & Opportunities</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {items.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                    >
                        <Link 
                            href={item.href}
                            className="flex items-start gap-3.5 p-4 rounded-2xl bg-surface-container-low/60 hover:bg-surface-container-low border border-outline-variant/20 hover:border-blue-500/40 transition-all duration-200 group h-full"
                        >
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg} group-hover:scale-105 transition-transform shadow-xs`}>
                                <item.icon size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold text-on-surface mb-0.5 truncate">{item.title}</h4>
                                <p className="text-[11px] sm:text-xs text-on-surface-variant font-medium leading-relaxed line-clamp-2 mb-2">
                                    {item.description}
                                </p>
                                <div className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1 group-hover:gap-1.5 transition-all">
                                    <span>Explore</span>
                                    <ArrowRight size={11} />
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

export default React.memo(FintechGrowthSection);
