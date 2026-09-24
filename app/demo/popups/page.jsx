'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { 
    ShieldCheck, 
    Store, 
    Sparkles, 
    Info, 
    ShoppingBag, 
    RotateCcw, 
    CheckCircle2, 
    Smartphone, 
    Monitor, 
    ArrowRight,
    HelpCircle,
    UserCheck,
    Layers
} from 'lucide-react';

// Dynamic imports of all modals and popups
const KYCPopup = dynamic(() => import('@/components/kyc/KYCPopup'), { ssr: false });
const MerchantApplyPopup = dynamic(() => import('@/components/merchant/MerchantApplyPopup'), { ssr: false });
const CustomerOnboardingModal = dynamic(() => import('@/components/customer/dashboard/OnboardingModal'), { ssr: false });
const MarketingOnboardingModal = dynamic(() => import('@/components/marketing/onboarding/MarketingOnboardingModal'), { ssr: false });
const GuideInfoModal = dynamic(() => import('@/components/common/GuideInfoModal'), { ssr: false });
const FloatingCart = dynamic(() => import('@/app/(customer)/shop/[merchantSlug]/FloatingCart'), { ssr: false });

import { MARKETING_GUIDES } from '@/lib/marketing-guides';
import { CUSTOMER_GUIDES } from '@/lib/customer-guides';

export default function ModalsAndPopupsDemoPage() {
    const [kycOpen, setKycOpen] = useState(false);
    const [merchantOpen, setMerchantOpen] = useState(false);
    const [customerOnboardingOpen, setCustomerOnboardingOpen] = useState(false);
    const [marketingOnboardingOpen, setMarketingOnboardingOpen] = useState(false);
    const [guideModalOpen, setGuideModalOpen] = useState(false);
    const [activeGuideKey, setActiveGuideKey] = useState('/dashboard');
    const [guideScope, setGuideScope] = useState('customer'); // 'customer' | 'marketing'
    const [floatingCartVisible, setFloatingCartVisible] = useState(false);
    const [cartCount, setCartCount] = useState(2);
    const [viewportWidth, setViewportWidth] = useState(0);

    useEffect(() => {
        const updateWidth = () => setViewportWidth(window.innerWidth);
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const resetStoragePreferences = () => {
        try {
            sessionStorage.removeItem('kyc_popup_dismissed');
            localStorage.removeItem('intrust_kyc_popup_dismissed');
            sessionStorage.removeItem('merchant_apply_popup_dismissed');
            localStorage.removeItem('intrust_merchant_popup_dismissed');
            localStorage.removeItem('intrust_onboarding_completed');
            sessionStorage.removeItem('intrust_onboarding_dismissed');
            localStorage.removeItem('intrust_marketing_tour_seen_v1');
            alert('All onboarding & popup dismissal keys reset in localStorage/sessionStorage!');
        } catch (e) {
            console.error(e);
        }
    };

    const currentGuide = guideScope === 'customer' 
        ? CUSTOMER_GUIDES[activeGuideKey] 
        : MARKETING_GUIDES[activeGuideKey];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 sm:p-8 font-sans">
            {/* Header */}
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 text-xs font-black uppercase tracking-wider mb-2 border border-blue-500/20">
                            <Sparkles size={13} />
                            <span>Popups & Modals Inspection Suite</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                            Interactive Modal & Viewport Verification
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Click any trigger below to inspect front-screen viewport centering (100dvh), mobile responsiveness, and linear completion flows.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                            {viewportWidth < 640 ? <Smartphone size={14} className="text-blue-500" /> : <Monitor size={14} className="text-indigo-500" />}
                            <span>{viewportWidth}px • {viewportWidth < 640 ? 'Mobile View' : viewportWidth < 1024 ? 'Tablet' : 'Desktop'}</span>
                        </div>
                        <button
                            onClick={resetStoragePreferences}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
                            title="Reset all popup dismissal flags in browser storage"
                        >
                            <RotateCcw size={13} />
                            <span className="hidden sm:inline">Reset Seen State</span>
                        </button>
                    </div>
                </div>

                {/* Grid of Interactive Triggers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. KYC Popup */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <ShieldCheck size={22} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    Portaled 100dvh
                                </span>
                            </div>
                            <h2 className="text-base font-black">KYC Identity Verification Popup</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Fullscreen on phones, sleek centered card on desktop. Triggers prompt for Aadhaar verification and gold shield unlocking.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setKycOpen(true)}
                            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20"
                        >
                            <span>Trigger KYC Popup</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>

                    {/* 2. Merchant Apply Popup */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                                    <Store size={22} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    Portaled 100dvh
                                </span>
                            </div>
                            <h2 className="text-base font-black">Merchant Partner Network Popup</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Promotes 0% commission Dukaan network onboarding. Anchored directly to visible front screen with backdrop blur.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMerchantOpen(true)}
                            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20"
                        >
                            <span>Trigger Merchant Popup</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>

                    {/* 3. Customer Onboarding Modal */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <UserCheck size={22} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                    No Skip / Linear Flow
                                </span>
                            </div>
                            <h2 className="text-base font-black">Customer Onboarding (3-Step)</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Welcome artwork, service interests, and mobile verification. No Skip or Close buttons — user advances Step 1 → 2 → 3 → Finish.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setCustomerOnboardingOpen(true)}
                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                        >
                            <span>Launch Customer Onboarding</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>

                    {/* 4. Marketing Onboarding Modal */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                    <Layers size={22} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                    No X / Next → Finish
                                </span>
                            </div>
                            <h2 className="text-base font-black">Marketing Workspace Guide (5 Slides)</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                5 visual slides covering product shares, daily quiz, streak freeze, and milestone mystery crates. Skip and Cross removed.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMarketingOnboardingOpen(true)}
                            className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-purple-500/20"
                        >
                            <span>Launch Marketing Onboarding</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>

                    {/* 5. Guide Info Modal */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                                    <HelpCircle size={22} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    Viewport Centered
                                </span>
                            </div>
                            <h2 className="text-base font-black">Page &quot;How It Works&quot; Guide Modal</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Tested across all Customer and Marketing views. Opens centered on front screen with scrollable actions, glossary and tips.
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    onClick={() => { setGuideScope('customer'); setActiveGuideKey('/dashboard'); setGuideModalOpen(true); }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
                                >
                                    Customer Dashboard
                                </button>
                                <button
                                    onClick={() => { setGuideScope('marketing'); setActiveGuideKey('/marketing/targets'); setGuideModalOpen(true); }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
                                >
                                    Marketing Targets
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setGuideModalOpen(true)}
                            className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-sky-500/20"
                        >
                            <Info size={14} />
                            <span>Open Active Guide Modal</span>
                        </button>
                    </div>

                    {/* 6. Floating Cart Simulation */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                    <ShoppingBag size={22} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                    Above Bottom Nav
                                </span>
                            </div>
                            <h2 className="text-base font-black">Floating Store Cart Bar</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Floats at bottom-[calc(68px+env(safe-area-inset-bottom,0px))] on phones and bottom-right on desktop. Never buried in footer.
                            </p>
                            <div className="flex items-center gap-2 pt-1 text-xs">
                                <button
                                    onClick={() => setCartCount(c => Math.max(1, c - 1))}
                                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black"
                                >
                                    -
                                </button>
                                <span className="font-bold">{cartCount} items</span>
                                <button
                                    onClick={() => setCartCount(c => c + 1)}
                                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFloatingCartVisible(v => !v)}
                            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                                floatingCartVisible
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                                    : 'bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600'
                            }`}
                        >
                            <span>{floatingCartVisible ? 'Hide Floating Cart' : 'Show Floating Cart Bar'}</span>
                        </button>
                    </div>
                </div>

                {/* Back Link */}
                <div className="pt-4 flex items-center justify-between text-xs text-slate-500">
                    <Link href="/dashboard" className="hover:text-blue-600 transition-colors font-bold flex items-center gap-1">
                        ← Back to Customer Dashboard
                    </Link>
                    <Link href="/marketing" className="hover:text-blue-600 transition-colors font-bold flex items-center gap-1">
                        Go to Marketing Hub →
                    </Link>
                </div>
            </div>

            {/* Modals Mounting */}
            <KYCPopup 
                isOpen={kycOpen} 
                onClose={() => setKycOpen(false)} 
            />

            <MerchantApplyPopup 
                isOpen={merchantOpen} 
                onClose={() => setMerchantOpen(false)} 
            />

            {customerOnboardingOpen && (
                <CustomerOnboardingModal
                    userId="preview-user-id"
                    initialPhone="9876543210"
                    onComplete={() => setCustomerOnboardingOpen(false)}
                />
            )}

            <MarketingOnboardingModal 
                isOpen={marketingOnboardingOpen} 
                onClose={() => setMarketingOnboardingOpen(false)} 
            />

            <GuideInfoModal 
                guide={currentGuide} 
                open={guideModalOpen} 
                onClose={() => setGuideModalOpen(false)} 
            />

            {floatingCartVisible && (
                <FloatingCart
                    count={cartCount}
                    total={cartCount * 49900}
                    savings={cartCount * 10000}
                    items={[
                        { id: '1', title: 'Smartwatch Titan Pro', quantity: cartCount, retail_price_paise: 49900 }
                    ]}
                />
            )}
        </div>
    );
}
