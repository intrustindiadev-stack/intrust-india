'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, FileText, Lock, RefreshCcw, ChevronRight, Truck, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import CustomerAppShell from '@/components/layout/customer/CustomerAppShell';
import Footer from '@/components/layout/Footer';
import { LEGAL_DEFAULTS } from '@/lib/legalDefaults';

const tabs = [
    { id: 'terms', label: 'Terms & Conditions', icon: FileText },
    { id: 'privacy', label: 'Privacy Policy', icon: Lock },
    { id: 'shipping', label: 'Shipping & Delivery', icon: Truck },
    { id: 'product', label: 'Product Policy', icon: ShieldCheck },
    { id: 'refund', label: 'Refund Policy', icon: RefreshCcw },
];

const FALLBACK = Object.fromEntries(
    Object.entries(LEGAL_DEFAULTS)
        .filter(([slug]) => slug !== 'kyc_terms')
        .map(([slug, d]) => [slug, {
            title: d.title,
            lastUpdated: new Date(d.effectiveFrom).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
            markdown: d.body,
        }])
);

function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return ''; }
}

function LegalPageContent() {
    const [activeTab, setActiveTab] = useState('terms');
    const [docs, setDocs] = useState(FALLBACK);
    const [versions, setVersions] = useState({});

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && FALLBACK[tab]) setActiveTab(tab);
        (async () => {
            try {
                const results = await Promise.all(tabs.map(async (tb) => {
                    try {
                        const r = await fetch('/api/legal/' + tb.id);
                        const j = await r.json();
                        return [tb.id, j?.data];
                    } catch { return [tb.id, null]; }
                }));
                setDocs((prev) => {
                    const next = { ...prev };
                    const vers = {};
                    for (const [id, d] of results) {
                        if (d?.body_markdown) {
                            next[id] = { title: d.title, lastUpdated: fmtDate(d.effective_from), markdown: d.body_markdown };
                            vers[id] = d.version;
                        }
                    }
                    setVersions(vers);
                    return next;
                });
            } catch { /* keep fallback */ }
        })();
    }, []);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        const url = new URL(window.location);
        url.searchParams.set('tab', tabId);
        window.history.replaceState({}, '', url);
    };

    return (
        <CustomerAppShell fullWidth={true}>
            {/* Compact Header Section */}
            <div className="bg-[#0e121a] text-white pt-20 pb-10 px-4 relative overflow-hidden border-b border-white/5">
                <div className="max-w-6xl mx-auto relative z-10 text-center space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-blue-400 text-xs font-bold mb-1">
                        <Scale size={14} />
                        InTrust Legal Center
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                        Policies & Agreements
                    </h1>
                    <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
                        Official terms and policies for Intrust India (operated by Intrust Financial Services (India) Pvt. Ltd.).
                    </p>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                
                {/* Compact Sticky Tabs Navigation */}
                <div className="w-full md:w-64 shrink-0">
                    {/* Mobile Horizontal Scrollable Tab Bar */}
                    <div className="md:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all shrink-0 ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10'
                                    }`}
                                >
                                    <Icon size={14} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Desktop Vertical Menu */}
                    <div className="hidden md:block sticky top-24 bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-1">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-3 py-1.5">
                            Documents
                        </p>
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all text-left ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                                        <span>{tab.label}</span>
                                    </div>
                                    {isActive && <ChevronRight size={14} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Compact & Clean Document Card */}
                <div className="w-full flex-1">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-white/10 shadow-xs min-h-[480px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="border-b border-slate-100 dark:border-white/10 pb-4 mb-6">
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                        {docs[activeTab]?.title}
                                    </h2>
                                    <p className="text-xs font-semibold text-slate-400 mt-1">
                                        Last Updated: {docs[activeTab]?.lastUpdated}{versions[activeTab] ? ` • ${versions[activeTab]}` : ''}
                                    </p>
                                </div>

                                <div className="space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                                    <ReactMarkdown>{docs[activeTab]?.markdown || ''}</ReactMarkdown>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </main>

            <Footer />
        </CustomerAppShell>
    );
}

export default function LegalCenterPage() {
    return (
        <Suspense fallback={null}>
            <LegalPageContent />
        </Suspense>
    );
}
