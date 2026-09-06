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

    const renderTabContent = () => {
        switch (activeTab) {
            case 'basics':
                return (
                    <div className="space-y-5">
                        <div>
                            <h3 className="text-lg font-black text-on-surface mb-2">What are InTrust Reward Coins?</h3>
                            <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed font-medium">
                                InTrust Coins are loyalty currency you collect for using the InTrust ecosystem. They can be redeemed into InTrust Wallet cash anytime at <span className="font-extrabold text-blue-600 dark:text-blue-400">100 Coins = ₹1</span>.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low/70 border border-outline-variant/20">
                                <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">1</span>
                                <div>
                                    <h4 className="font-extrabold text-xs text-on-surface">Total Earned vs Current Balance</h4>
                                    <p className="text-xs text-on-surface-variant mt-0.5">Every coin earned counts toward your lifetime progress. Current Balance is what you can redeem right now.</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low/70 border border-outline-variant/20">
                                <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">2</span>
                                <div>
                                    <h4 className="font-extrabold text-xs text-on-surface">Tier Multipliers</h4>
                                    <p className="text-xs text-on-surface-variant mt-0.5">Your tier (Bronze to Platinum) awards bonus multiplier boosts on every future order and transaction.</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low/70 border border-outline-variant/20">
                                <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">3</span>
                                <div>
                                    <h4 className="font-extrabold text-xs text-on-surface">Validity Period</h4>
                                    <p className="text-xs text-on-surface-variant mt-0.5">Coins remain active for a full 365 days from the date earned, with auto-notifications before expiry.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                            {['EARN COINS', 'SCRATCH LOOT', 'CLIMB TIERS', 'WALLET CASH'].map((item) => (
                                <div key={item} className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                                    <span className="text-[10px] font-black tracking-wider text-on-surface">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'earn':
                return (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-black text-on-surface mb-1">How to Earn Coins</h3>
                            <p className="text-xs text-on-surface-variant">Earn coins automatically on purchases, invites, daily check-ins, and verified reviews.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {[
                                { act: 'Sign up Bonus', pts: '100 pts', icon: '👋' },
                                { act: 'Shopping (per ₹100)', pts: '5 pts', icon: '🛍️' },
                                { act: 'Complete KYC', pts: '200 pts', icon: '✓' },
                                { act: 'Daily Check-in', pts: '5 pts', icon: '📅' },
                                { act: 'Refer a Friend', pts: '500 pts', icon: '👥' },
                            ].map(({ act, pts, icon }) => (
                                <div key={act} className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-base">
                                            {icon}
                                        </div>
                                        <span className="text-xs font-bold text-on-surface">{act}</span>
                                    </div>
                                    <span className="font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-500/20 px-2 py-0.5 rounded-md text-xs">{pts}</span>
                                </div>
                            ))}
                        </div>
                        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-500/20 flex items-start gap-2.5">
                            <Users size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-black text-blue-900 dark:text-blue-200">Network Commission Multipliers</h4>
                                <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">Earn passive commission coins across 7 tiers whenever your network shops or refers friends.</p>
                            </div>
                        </div>
                    </div>
                );
            case 'tiers':
                return (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-black text-on-surface mb-1">Tiers &amp; Multipliers</h3>
                            <p className="text-xs text-on-surface-variant">Ascend tiers based on total coins earned and active community referrals.</p>
                        </div>
                        <div className="space-y-2.5">
                            {[
                                { tier: 'Bronze', size: '0+', multiplier: '1.0x', color: 'text-amber-600' },
                                { tier: 'Silver', size: '25+', multiplier: '1.2x', color: 'text-slate-500' },
                                { tier: 'Gold', size: '100+', multiplier: '1.5x', color: 'text-yellow-600' },
                                { tier: 'Platinum', size: '500+', multiplier: '2.0x', color: 'text-blue-600' },
                            ].map((t) => (
                                <div key={t.tier} className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                                        <span className={`font-black uppercase tracking-tight text-xs ${t.color}`}>{t.tier} Tier</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-on-surface-variant uppercase font-bold">Network: {t.size}</p>
                                        <p className="font-black text-xs text-on-surface">{t.multiplier} Multiplier</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'redeem':
                return (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-black text-on-surface mb-1">Redeeming to Wallet</h3>
                            <p className="text-xs text-on-surface-variant">Convert coins directly into your InTrust Wallet balance to pay at stores or buy gift cards.</p>
                        </div>
                        <div className="space-y-2.5">
                            {[
                                { icon: Zap, label: 'Minimum 100 coins per redemption (₹1.00)' },
                                { icon: Shield, label: 'Instant, secure atomic conversion' },
                                { icon: Wallet, label: 'Instantly usable for all checkout orders and store payments' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20">
                                    <item.icon size={18} className="text-blue-600 shrink-0" />
                                    <p className="text-xs font-bold text-on-surface">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'faq':
                return (
                    <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                        {[
                            { q: "Why don't I see coins immediately?", a: "Most coins appear as scratch cards within seconds. Scratch them from your dashboard to reveal!" },
                            { q: "My scratch card vanished!", a: "Scratching is just a visual reveal — your points are credited automatically on transaction approval." },
                            { q: "Do coins expire?", a: "Points stay active for 365 days from acquisition. You will receive reminder alerts before any expiry." },
                        ].map((faq, i) => (
                            <div key={i} className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 space-y-1">
                                <h4 className="font-extrabold text-on-surface text-xs">Q: {faq.q}</h4>
                                <p className="text-xs text-on-surface-variant leading-relaxed">{faq.a}</p>
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
                <div 
                    className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-lg bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl shadow-2xl border border-outline-variant/30 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-5 sm:p-6 pb-3 flex items-center justify-between border-b border-outline-variant/15">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                                    <HelpCircle size={22} />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black text-on-surface tracking-tight leading-none">Rewards Guide</h2>
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mt-1">{userTier} Tier Active</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="px-5 sm:px-6 pt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap active:scale-95 ${
                                        activeTab === tab.id
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                                    }`}
                                >
                                    <tab.icon size={13} />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-5 sm:p-6 pt-3">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                {renderTabContent()}
                            </motion.div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 sm:p-5 bg-surface-container-low border-t border-outline-variant/15 flex items-center justify-between">
                            <p className="text-xs text-on-surface-variant font-bold">100 Coins = ₹1.00</p>
                            <button
                                onClick={onClose}
                                className="px-5 py-2 rounded-xl font-black text-xs text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-500/25 active:scale-95 transition-all"
                            >
                                Understand
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
