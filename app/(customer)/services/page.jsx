'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FeatureAdvertiser from '@/components/ui/FeatureAdvertiser';
import {
    ShoppingBag, Smartphone,
    Gift, ChevronRight, Sun,
    Store, Zap, ArrowRight, ShieldCheck
} from 'lucide-react';

export default function ServicesPage() {
    const router = useRouter();

    const serviceSections = [
        {
            title: "Core Platform Offerings",
            items: [
                { id: 'store', title: "InTrust Shopping Hub", description: "Order groceries, electronics, and essentials with fast 2-hr local pickup.", icon: ShoppingBag, href: "/shop", badge: "Live" },
                { id: 'gift', title: "Digital Gift Cards", description: "Buy instant vouchers from top brands with guaranteed cashback savings.", icon: Gift, href: "/gift-cards" },
                { id: 'nfc', title: "Smart NFC Business Card", description: "1-Tap digital networking card with instant UPI and contact sharing.", icon: Smartphone, href: "/nfc-service" },
                { id: 'solar', title: "Rooftop Solar Solutions", description: "Subsidized clean energy installations with customized quote calculator.", icon: Sun, href: "/solar" },
            ]
        }
    ];

    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 sm:py-8 space-y-6">
            {/* Header Section */}
            <div>
                <nav className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-3">
                    <button onClick={() => router.push('/dashboard')} className="hover:text-primary transition-colors">Dashboard</button>
                    <ChevronRight size={14} />
                    <span className="text-on-surface font-bold">Services</span>
                </nav>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                    InTrust Services & Utilities
                </h1>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                    Explore verified local retail, digital gift vouchers, smart hardware, and green energy solutions
                </p>
            </div>

            {/* Ad Banner */}
            <div>
                <FeatureAdvertiser />
            </div>

            {/* Categorized Sections */}
            <div className="space-y-6">
                {serviceSections.map((section, idx) => (
                    <div key={section.title} className="space-y-4">
                        <h2 className="text-base font-extrabold text-on-surface">
                            {section.title}
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between group relative overflow-hidden"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                                                    <Icon size={22} />
                                                </div>
                                                {item.badge && (
                                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="text-base font-extrabold text-on-surface mb-1.5 group-hover:text-primary transition-colors">
                                                {item.title}
                                            </h3>
                                            <p className="text-xs text-on-surface-variant line-clamp-3 leading-relaxed">
                                                {item.description}
                                            </p>
                                        </div>

                                        <div className="mt-5 pt-3 border-t border-outline-variant/15 flex items-center justify-between text-xs font-bold text-primary">
                                            <span>Access Service</span>
                                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}