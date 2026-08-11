'use client';

import { motion } from 'framer-motion';
import { Users, Store, ShieldCheck, ArrowRight, Share2 } from 'lucide-react';
import Link from 'next/link';

export default function FintechGrowthSection({ userData }) {
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
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-gray-200/40 dark:shadow-black/20 border border-gray-100 dark:border-gray-700/50 mt-6 sm:mt-8">
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6">Growth & Opportunities</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Link 
                            href={item.href}
                            className={`flex items-start gap-4 p-4 sm:p-5 rounded-2xl ${item.bgLight} border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all group`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg} group-hover:scale-110 transition-transform shadow-sm`}>
                                <item.icon size={22} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{item.title}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-3">
                                    {item.description}
                                </p>
                                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                                    Explore Now <ArrowRight size={12} />
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
