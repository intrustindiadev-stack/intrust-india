'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, FileText, Lock, RefreshCcw, ChevronRight, Truck, ShieldCheck, AlertCircle } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function LegalCenterPage() {
    const [activeTab, setActiveTab] = useState('terms');

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
                <div className="space-y-6 text-gray-600 dark:text-gray-300 leading-relaxed">
                    <p>Welcome to Intrust Financial Service India Pvt Ltd. By accessing our platform, you agree to be bound by these Terms and Conditions.</p>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. Account Responsibility</h3>
                    <p>Customers are solely responsible for maintaining the confidentiality of their login details (Username, Password, OTPs) and all activities performed under their account. Intrust will not be liable for any loss resulting from unauthorized access due to user negligence.</p>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. Payments & Transactions</h3>
                    <p>All payments must be made through authorized channels only (UPI, Credit/Debit Cards, NetBanking). While we ensure a secure gateway, we are not liable for transaction failures or delays caused by bank-side technical issues, server downtimes, or network congestion.</p>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. User Conduct & Termination</h3>
                    <p>Any fraudulent, abusive, or illegal activity—including but not limited to attempts to bypass security, spreading malware, or harassing staff—will lead to immediate account termination and reporting to the appropriate authorities.</p>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">4. Force Majeure</h3>
                    <p>We are not responsible for service delays or failures caused by unforeseen events beyond our control, such as strikes, natural disasters, pandemics, or government-mandated internet outages.</p>
                </div>
            )
        },
        shipping: {
            title: "Shipping & Delivery Policy",
            lastUpdated: "March 31, 2026",
            body: (
                <div className="space-y-6 text-gray-600 dark:text-gray-300 leading-relaxed">
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/20 mb-8">
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                            <Truck size={18} /> Typical Delivery Window: 3–7 Business Days
                        </p>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. Dispatch & Tracking</h3>
                    <p>Once your order is shipped, you will receive a Tracking ID via SMS/Email. This ID allows you to monitor the real-time status of your parcel through our logistics partners.</p>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. Delivery Attempts</h3>
                    <p>A maximum of 2 or 3 delivery attempts will be made at your provided address. If the delivery fails after these attempts, the order will be automatically returned to our warehouse, and a return-to-origin fee may apply.</p>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. Customer Responsibility</h3>
                    <p>The customer is responsible for providing the correct delivery address and an active contact number. Failure to provide accurate details that results in delivery failure is not the responsibility of Intrust.</p>

                    <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/20 mt-8 flex items-start gap-4">
                        <AlertCircle className="text-amber-600 shrink-0" size={24} />
                        <div>
                            <p className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">Critical Quality Warning</p>
                            <p className="text-sm font-bold text-amber-600/80">We explicitly advise customers NOT to accept any parcel if the outer packaging is tampered with, torn, or unsealed at the time of delivery.</p>
                        </div>
                    </div>
                </div>
            )
        },
        product: {
            title: "Product Policy",
            lastUpdated: "March 31, 2026",
            body: (
                <div className="space-y-6 text-gray-600 dark:text-gray-300 leading-relaxed">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. Quality Assurance (QC)</h3>
                    <p>All items undergo a rigorous Quality Control (QC) process before dispatch to ensure they are defect-free and meet our premium quality standards.</p>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. Standards & Safety</h3>
                    <p>We guarantee that all products meet applicable safety standards and certification requirements as mandated by Indian regulatory authorities.</p>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. Visual Representation</h3>
                    <p>We strive to ensure that product images and descriptions on our platform match the actual product. However, minor variations in color or packaging may occur due to light and manufacturer updates.</p>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">4. Availability & Warranty</h3>
                    <p>Items are subject to stock availability; orders may be cancelled if an item goes out of stock unexpectedly. Warranty details for each product will clearly state whether it is provided by the Brand/Manufacturer or the Seller.</p>
                </div>
            )
        },
        privacy: {
            title: "Privacy Policy",
            lastUpdated: "January 10, 2026",
            body: (
                <div className="space-y-6 text-gray-600 dark:text-gray-300 leading-relaxed">
                    <p>At Intrust Financial, we take your privacy seriously. This policy dictates how we collect, use, and protect your personal data.</p>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. Information Collection</h3>
                    <p>We collect information you provide during registration, KYC processing, and transactions. This may include your name, email, phone number, government ID data (for KYC), and payment details.</p>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. Use of Information</h3>
                    <p>We use your data to process transactions, verify your identity as required by RBI guidelines, prevent fraud, and provide customer support. We do not sell your personal data to third parties.</p>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. Data Security</h3>
                    <p>We employ industry-standard security measures, including encryption and secure server architectures, to protect your sensitive information from unauthorized access.</p>
                </div>
            )
        },
        refund: {
            title: "Refund Policy",
            lastUpdated: "January 5, 2026",
            body: (
                <div className="space-y-6 text-gray-600 dark:text-gray-300 leading-relaxed">
                    <p>Understanding our refund procedures for different services available on the platform.</p>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. Digital Gift Cards</h3>
                    <p>Due to the nature of digital goods, all sales of Gift Cards are <strong>final and non-refundable</strong> once the code has been delivered. Please explicitly ensure you are purchasing the correct brand and denomination before checking out.</p>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. Failed Transactions</h3>
                    <p>If a wallet deduction or payment gateway charge occurs but the gift card or service is not delivered due to a system error, the amount will be automatically refunded to your originating payment method or Intrust Wallet within 3-5 business days.</p>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. Subscription Services</h3>
                    <p>Purchases for the Gold Membership or similar recurring packages are non-refundable for the current active billing cycle. You may cancel your subscription at any time to prevent future charges.</p>
                </div>
            )
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)]">
            <Navbar />

            {/* Header Section */}
            <div className="bg-[#171A21] text-white pt-[12vh] sm:pt-[15vh] pb-16 px-4 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 w-full h-full bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
                <div className="max-w-7xl mx-auto relative z-10 text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-2xl mb-6 border border-white/10">
                        <Scale size={32} className="text-blue-400" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">Legal Center</h1>
                    <p className="text-gray-400 max-w-2xl mx-auto text-lg">Policies, terms, and agreements dictating the usage of Intrust Financial services.</p>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 flex flex-col lg:flex-row gap-8 lg:gap-12">

                {/* Sidebar Navigation */}
                <div className="lg:w-1/4 shrink-0">
                    <div className="sticky top-28 bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-4 pt-2">Documents</h3>
                        <nav className="space-y-2">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl font-semibold transition-all duration-300
                                            ${isActive
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-inner'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <tab.icon size={20} className={isActive ? 'text-blue-500' : 'text-gray-400'} />
                                            {tab.label}
                                        </div>
                                        {isActive && <ChevronRight size={16} />}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Document Viewer */}
                <div className="lg:w-3/4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-700 min-h-[600px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="border-b border-gray-100 dark:border-gray-700 pb-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                    <div>
                                        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{content[activeTab].title}</h2>
                                        <p className="text-sm font-medium text-gray-500">Effective Date: {content[activeTab].lastUpdated}</p>
                                    </div>
                                </div>

                                <div className="prose prose-blue dark:prose-invert max-w-none">
                                    {content[activeTab].body}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

            </main>

            <Footer />
        </div>
    );
}
