'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Users, ArrowRight, Gift } from 'lucide-react';
import Image from 'next/image';

const features = [
    {
        id: 'scratch-cards',
        title: 'Unwrap Rewards',
        description: 'Earn points & scratch to reveal cash.',
        image: '/images/intrust-scratch-promo.png',
        icon: <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />,
        href: '/rewards',
        color: 'from-violet-600/90 to-purple-900/90',
        badge: 'New Feature'
    },
    {
        id: 'referrals',
        title: 'Build Network',
        description: 'Invite friends & earn passive income.',
        image: '/images/intrust-referral-promo.png',
        icon: <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300" />,
        href: '/refer',
        color: 'from-emerald-600/90 to-teal-900/90',
        badge: 'Trending'
    }
];

export default function FeatureAdvertiser({ className = '' }) {
    const router = useRouter();

    return (
        <div className={`w-full grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
            {features.map((feature, idx) => (
                <motion.div
                    key={feature.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => router.push(feature.href)}
                    className="relative overflow-hidden rounded-3xl shadow-lg ring-1 ring-white/10 aspect-[2/1] sm:aspect-[2.5/1] bg-gray-900 cursor-pointer group flex items-center"
                >
                    {/* Background Image */}
                    <div className="absolute inset-0 z-0">
                        <Image 
                            src={feature.image} 
                            alt={feature.title}
                            fill
                            className="object-cover opacity-50 mix-blend-screen group-hover:scale-110 transition-transform duration-700 ease-in-out"
                            sizes="(max-width: 640px) 100vw, 400px"
                        />
                    </div>

                    {/* Gradient Overlay */}
                    <div className={`absolute inset-0 z-10 bg-gradient-to-r ${feature.color} mix-blend-multiply opacity-90`} />
                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Content */}
                    <div className="relative z-20 p-5 sm:p-6 flex flex-col justify-end h-full w-full">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[10px] font-bold text-white uppercase tracking-wider">
                                {feature.badge}
                            </span>
                        </div>
                        
                        <h3 className="text-xl sm:text-2xl font-black text-white mb-1 tracking-tight flex items-center gap-2">
                            {feature.title}
                            <motion.div
                                animate={{ rotate: [0, 15, -15, 0] }}
                                transition={{ duration: 3, repeat: Infinity }}
                            >
                                {feature.icon}
                            </motion.div>
                        </h3>
                        
                        <p className="text-xs sm:text-sm text-white/80 line-clamp-1">
                            {feature.description}
                        </p>
                        
                        <div className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/90 group-hover:bg-white group-hover:text-gray-900 transition-colors">
                            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
