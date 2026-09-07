'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, FileText, Lock, RefreshCcw, ChevronRight, Truck, ShieldCheck, AlertCircle } from 'lucide-react';
import CustomerAppShell from '@/components/layout/customer/CustomerAppShell';
import Footer from '@/components/layout/Footer';

const tabs = [
    { id: 'terms', label: 'Terms & Conditions', icon: FileText },
    { id: 'privacy', label: 'Privacy Policy', icon: Lock },
    { id: 'shipping', label: 'Shipping & Delivery', icon: Truck },
    { id: 'product', label: 'Product Policy', icon: ShieldCheck },
    { id: 'refund', label: 'Refund Policy', icon: RefreshCcw },
];

const content = {
    terms: {
        title: "Terms and Conditions",
        lastUpdated: "March 31, 2026",
        body: (
            <div className="space-y-5 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                <p>Welcome to Intrust Financial Service India Pvt Ltd. By accessing our platform, you agree to be bound by these Terms and Conditions.</p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">1. Account Responsibility</h3>
                <p>Customers are solely responsible for maintaining the confidentiality of their login details (Username, Password, OTPs) and all activities performed under their account. Intrust will not be liable for any loss resulting from unauthorized access due to user negligence.</p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">2. Payments & Transactions</h3>
                <p>All payments must be made through authorized channels only (UPI, Credit/Debit Cards, NetBanking). While we ensure a secure gateway, we are not liable for transaction failures or delays caused by bank-side technical issues, server downtimes, or network congestion.</p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">3. User Conduct & Termination</h3>
                <p>Any fraudulent, abusive, or illegal activity—including but not limited to attempts to bypass security, spreading malware, or harassing staff—will lead to immediate account termination and reporting to the appropriate authorities.</p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">4. Force Majeure</h3>
                <p>We are not responsible for service delays or failures caused by unforeseen events beyond our control, such as strikes, natural disasters, pandemics, or government-mandated internet outages.</p>
            </div>
        )
    },
    shipping: {
        title: "Shipping & Delivery Policy",
        lastUpdated: "March 31, 2026",
        body: (
            <div className="space-y-5 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 mb-6">
                    <p className="text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                        <Truck size={18} /> Typical Delivery Window: 3–7 Business Days
                    </p>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">1. Dispatch & Tracking</h3>
                <p>Once your order is shipped, you will receive a Tracking ID via SMS/Email. This ID allows you to monitor the real-time status of your parcel through our logistics partners.</p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">2. Delivery Attempts</h3>
                <p>A maximum of 2 or 3 delivery attempts will be made at your provided address. If the delivery fails after these attempts, the order will be automatically returned to our warehouse, and a return-to-origin fee may apply.</p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">3. Customer Responsibility</h3>
                <p>The customer is responsible for providing the correct delivery address and an active contact number. Failure to provide accurate details that results in delivery failure is not the responsibility of Intrust.</p>

                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/20 mt-6 flex items-start gap-3">
                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                    <div>
                        <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">Critical Quality Warning</p>
                        <p className="text-xs sm:text-sm font-semibold text-amber-700/80 dark:text-amber-300/80">We explicitly advise customers NOT to accept any parcel if the outer packaging is tampered with, torn, or unsealed at the time of delivery.</p>
                    </div>
                </div>
            </div>
        )
    },
    product: {
        title: "Product Policy",
        lastUpdated: "March 31, 2026",
        body: (
            <div className="space-y-5 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">1. Quality Assurance (QC)</h3>
                <p>All items undergo a rigorous Quality Control (QC) process before dispatch to ensure they are defect-free and meet our premium quality standards.</p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">2. Standards & Safety</h3>
                <p>We guarantee that all products meet applicable safety standards and certification requirements as mandated by Indian regulatory authorities.</p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">3. Visual Representation</h3>
                <p>We strive to ensure that product images and descriptions on our platform match the actual product. However, minor variations in color or packaging may occur due to light and manufacturer updates.</p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">4. Availability & Warranty</h3>
                <p>Items are subject to stock availability; orders may be cancelled if an item goes out of stock unexpectedly. Warranty details for each product will clearly state whether it is provided by the Brand/Manufacturer or the Seller.</p>
            </div>
        )
    },
    privacy: {
        title: "Privacy Policy",
        lastUpdated: "January 10, 2026",
        body: (
            <div className="space-y-5 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                <p>At Intrust Financial, we take your privacy seriously. This policy dictates how we collect, use, and protect your personal data.</p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">1. Information Collection</h3>
                <p>We collect information you provide during registration, KYC processing, and transactions. This may include your name, email, phone number, government ID data (for KYC), and payment details.</p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">2. Use of Information</h3>
                <p>We use your data to process transactions, verify your identity as required by RBI guidelines, prevent fraud, and provide customer support. We do not sell your personal data to third parties.</p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">3. Data Security</h3>
                <p>We employ industry-standard security measures, including encryption and secure server architectures, to protect your sensitive information from unauthorized access.</p>
            </div>
        )
    },
    refund: {
        title: "Refund Policy",
        lastUpdated: "January 5, 2026",
        body: (
            <div className="space-y-5 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                <p>Understanding our refund procedures for different services available on the platform.</p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">1. Digital Gift Cards</h3>
                <p>Due to the nature of digital goods, all sales of Gift Cards are <strong>final and non-refundable</strong> once the code has been delivered. Please explicitly ensure you are purchasing the correct brand and denomination before checking out.</p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">2. Failed Transactions</h3>
                <p>If a wallet deduction or payment gateway charge occurs but the gift card or service is not delivered due to a system error, the amount will be automatically refunded to your originating payment method or Intrust Wallet within 3-5 business days.</p>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-4">3. Subscription Services</h3>
                <p>Purchases for the Gold Membership or similar recurring packages are non-refundable for the current active billing cycle. You may cancel your subscription at any time to prevent future charges.</p>
            </div>
        )
    }
};

function LegalPageContent() {
    const [activeTab, setActiveTab] = useState('terms');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && content[tab]) {
            setActiveTab(tab);
        }
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
                        Official terms, conditions, and usage policies for Intrust Financial Services.
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
                                        {content[activeTab].title}
                                    </h2>
                                    <p className="text-xs font-semibold text-slate-400 mt-1">
                                        Last Updated: {content[activeTab].lastUpdated}
                                    </p>
                                </div>

                                <div>
                                    {content[activeTab].body}
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
