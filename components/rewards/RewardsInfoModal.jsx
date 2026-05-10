'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, HelpCircle, Gift, TrendingUp, Wallet, Shield, Award, ChevronRight, Zap, Coins, Users } from 'lucide-react';

const TABS = [
    { id: 'basics', label: 'Basics', icon: Info },
    { id: 'earn', label: 'Earn', icon: Gift },
    { id: 'tiers', label: 'Tiers', icon: Award },
    { id: 'redeem', label: 'Redeem', icon: Wallet },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
];

export default function RewardsInfoModal({ isOpen, onClose, userTier = 'bronze' }) {
    const [activeTab, setActiveTab] = useState('basics');

    const tierGradients = {
        bronze: 'from-amber-500 to-orange-600',
        silver: 'from-slate-400 to-gray-600',
        gold: 'from-yellow-400 via-amber-500 to-orange-500',
        platinum: 'from-violet-500 via-purple-600 to-indigo-600',
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'basics':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3">What are Intrust Reward Points?</h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                Intrust Reward Points are loyalty points you collect for using the Intrust ecosystem. They live in your Rewards dashboard and can be converted to wallet cash anytime — <span className="font-bold text-gray-900 dark:text-white">100 points = ₹1</span>.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs text-violet-600 font-bold">1</span>
                                Total vs Current
                            </h4>
                            <p className="text-sm text-gray-500 ml-8">Every point you ever earn is added to your Total Earned. Current Balance is what you can spend right now.</p>
                            
                            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs text-violet-600 font-bold">2</span>
                                Multipliers
                            </h4>
                            <p className="text-sm text-gray-500 ml-8">Your tier (Bronze → Platinum) gives you a bonus multiplier on every future reward.</p>
                            
                            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs text-violet-600 font-bold">3</span>
                                Expiry
                            </h4>
                            <p className="text-sm text-gray-500 ml-8">Points stay active as long as you stay active. After 365 days of no activity, unused points expire.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            {['EARN', 'SCRATCH', 'CLIMB', 'REDEEM'].map((item) => (
                                <div key={item} className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                                    <span className="text-xs font-black tracking-widest text-violet-600 dark:text-violet-400">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'earn':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3">How to Earn Points</h3>
                            <p className="text-sm text-gray-500">You earn points automatically — no claiming needed. The ✨ scratch cards on your dashboard reveal each new reward.</p>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-white/5 text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3 font-bold">Action</th>
                                        <th className="px-4 py-3 font-bold">Points</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {[
                                        ['Sign up', '100 points'],
                                        ['Shop (per ₹100)', '5 points'],
                                        ['Complete KYC', '200 points'],
                                        ['Daily Login', '5 points'],
                                        ['Become Merchant', '500 points'],
                                    ].map(([act, pts]) => (
                                        <tr key={act} className="dark:text-gray-300">
                                            <td className="px-4 py-3">{act}</td>
                                            <td className="px-4 py-3 font-bold text-violet-600">{pts}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-1">
                                <Users size={16} /> Network Rewards
                            </h4>
                            <p className="text-xs text-blue-700 dark:text-blue-400">When someone you referred earns, you get a slice too — up to 5 levels deep!</p>
                        </div>
                    </div>
                );
            case 'tiers':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3">Tiers & Bonus Multipliers</h3>
                            <p className="text-sm text-gray-500">Your tier is based on the size of your referral network. The bigger your network, the higher your tier.</p>
                        </div>
                        <div className="grid gap-3">
                            {[
                                { tier: 'Bronze', size: '0+', multiplier: '1.0x', color: 'text-amber-600' },
                                { tier: 'Silver', size: '25+', multiplier: '1.2x', color: 'text-slate-500' },
                                { tier: 'Gold', size: '100+', multiplier: '1.5x', color: 'text-yellow-600' },
                                { tier: 'Platinum', size: '500+', multiplier: '2.0x', color: 'text-violet-600' },
                            ].map((t) => (
                                <div key={t.tier} className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${t.tier.toLowerCase() === 'bronze' ? 'bg-amber-500' : t.tier.toLowerCase() === 'silver' ? 'bg-slate-400' : t.tier.toLowerCase() === 'gold' ? 'bg-yellow-500' : 'bg-violet-500'}`} />
                                        <span className={`font-black uppercase tracking-tight ${t.color}`}>{t.tier}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">Network: {t.size}</p>
                                        <p className="font-black text-gray-900 dark:text-white">{t.multiplier} Multiplier</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'redeem':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3">Redeeming Points</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Convert your points to wallet cash instantly at <span className="font-bold text-gray-900 dark:text-white">100 points = ₹1</span>.</p>
                        </div>
                        <div className="space-y-4">
                            {[
                                { icon: Zap, label: 'Minimum 100 points per conversion' },
                                { icon: Shield, label: 'Instant & Secure processing' },
                                { icon: Wallet, label: 'Updates your wallet balance immediately' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/5">
                                    <item.icon size={20} className="text-violet-500" />
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'faq':
                return (
                    <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {[
                            { q: "Why don't I see points immediately?", a: "Most rewards appear as scratch cards within seconds. Scratch to reveal!" },
                            { q: "My scratch card vanished!", a: "Scratching is just a reveal — points are added to your balance immediately upon earning." },
                            { q: "Do points expire?", a: "Yes, after 365 days of zero activity. We'll warn you 30 days before!" },
                        ].map((faq, i) => (
                            <div key={i} className="space-y-2">
                                <h4 className="font-black text-gray-900 dark:text-white text-sm">Q. {faq.q}</h4>
                                <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal/Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed inset-x-0 bottom-0 z-[101] bg-white dark:bg-[#1A1A1A] rounded-t-[32px] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:bottom-auto sm:w-full sm:max-w-xl sm:rounded-[32px] overflow-hidden shadow-2xl border border-white/10"
                    >
                        {/* Header/Tier Themed Strip */}
                        <div className={`h-2 bg-gradient-to-r ${tierGradients[userTier]}`} />
                        <div className="p-6 sm:p-8 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${tierGradients[userTier]} flex items-center justify-center text-white shadow-lg`}>
                                    <HelpCircle size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Rewards Guide</h2>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{userTier} Tier Active</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                <X size={20} className="text-gray-600 dark:text-gray-300" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 sm:px-8 flex items-center gap-2 overflow-x-auto pb-4 hide-scrollbar">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? `bg-gradient-to-br ${tierGradients[userTier]} text-white shadow-lg`
                                            : 'bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'
                                    }`}
                                >
                                    <tab.icon size={16} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-6 sm:p-8 pt-2">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {renderTabContent()}
                            </motion.div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 sm:p-8 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                            <p className="text-xs text-gray-400 font-medium">100 Points = ₹1 Rupee</p>
                            <button
                                onClick={onClose}
                                className={`px-6 py-2.5 rounded-xl font-black text-sm text-white bg-gradient-to-r ${tierGradients[userTier]} shadow-lg active:scale-95 transition-all`}
                            >
                                Got it
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
