'use client';

import { useState } from 'react';
import PageHero from '@/components/ui/PageHero';
import ContactForm from '@/components/contact/ContactForm';
import Footer from '@/components/layout/Footer';
import CustomerAppShell from '@/components/layout/customer/CustomerAppShell';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Mail, 
    MapPin, 
    Phone, 
    Clock, 
    ExternalLink, 
    ShieldCheck, 
    Headphones, 
    Sparkles, 
    ChevronDown, 
    Store, 
    Building2,
    CheckCircle2
} from 'lucide-react';

const CONTACT_CHANNELS = [
    {
        icon: Phone,
        title: "Toll-Free Helpline",
        subtitle: "Mon–Sat, 9:00 AM – 8:00 PM IST",
        details: "Instant phone support for orders, wallet queries, and merchant assistance.",
        actionText: "1800-203-0052",
        actionHref: "tel:18002030052",
        badge: "Toll-Free",
        color: "from-blue-600 to-indigo-600",
        iconColor: "text-blue-600 dark:text-blue-400",
        bgLight: "bg-blue-50/80 dark:bg-blue-950/30"
    },
    {
        icon: Mail,
        title: "Customer & Support Email",
        subtitle: "Avg. response time: within 24 hours",
        details: "Drop an email for order escalations, refunds, and customer care inquiries.",
        actionText: "info@intrustindia.com",
        actionHref: "mailto:info@intrustindia.com",
        badge: "Within 24h",
        color: "from-purple-600 to-pink-600",
        iconColor: "text-purple-600 dark:text-purple-400",
        bgLight: "bg-purple-50/80 dark:bg-purple-950/30"
    },
    {
        icon: Building2,
        title: "Corporate Headquarters",
        subtitle: "InTrust Financial Services Pvt. Ltd.",
        details: "TF-312/MM09, Ashima Mall, Hoshangabad Rd, Danish Nagar, Bhopal, MP 462026.",
        actionText: "View on Google Maps",
        actionHref: "https://maps.app.goo.gl/intrustbhopal",
        badge: "Head Office",
        color: "from-emerald-600 to-teal-600",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        bgLight: "bg-emerald-50/80 dark:bg-emerald-950/30"
    }
];

const FAQS = [
    {
        q: "How fast is product delivery across India?",
        a: "Standard nationwide orders arrive within 3 to 5 business days. Select city zones also enjoy same-day and 2-hour express store pickups directly from verified neighborhood merchants."
    },
    {
        q: "What if my payment is debited but the order is not confirmed?",
        a: "All transactions on InTrust use high-security banking gateways. If a payment is debited during a bank timeout, our automated reconciliation system either confirms the order or credits your InTrust Wallet/source account within 2 to 24 hours."
    },
    {
        q: "How can local shop owners partner with InTrust?",
        a: "Simply click 'Partner / Merchant Apply' in the sidebar or menu. Verification takes less than 24 hours, and there are zero payment gateway fees on verified store transactions."
    },
    {
        q: "How do InTrust digital gift cards work?",
        a: "Gift cards from over 200+ top brands (Amazon, Flipkart, Swiggy, Zomato, etc.) are delivered instantly via SMS/Email and stored securely in your InTrust customer account."
    }
];

export default function ContactPage() {
    const [openFaq, setOpenFaq] = useState(null);

    const toggleFaq = (idx) => {
        setOpenFaq(openFaq === idx ? null : idx);
    };

    return (
        <CustomerAppShell fullWidth={true}>
            {/* Header / Hero Section */}
            <div className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white pt-20 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-5xl mx-auto text-center relative z-10 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-blue-300">
                        <Sparkles size={14} className="text-amber-400 animate-pulse" />
                        We&apos;re Here For You 24/7
                    </div>
                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                        Let&apos;s Connect &amp; Support You.
                    </h1>
                    <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
                        Have a question about your order, wallet, merchant partnership, or smart NFC solutions? Our team across India is ready to assist you.
                    </p>

                    {/* Trust indicators */}
                    <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-300">
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck size={16} className="text-emerald-400" />
                            <span>100% Verified Support</span>
                        </div>
                        <span className="opacity-40">•</span>
                        <div className="flex items-center gap-1.5">
                            <Headphones size={16} className="text-blue-400" />
                            <span>Toll-Free Assistance</span>
                        </div>
                        <span className="opacity-40">•</span>
                        <div className="flex items-center gap-1.5">
                            <Clock size={16} className="text-amber-400" />
                            <span>Fast Escalation Desk</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Channels Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {CONTACT_CHANNELS.map((channel, idx) => {
                        const Icon = channel.icon;
                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + idx * 0.08 }}
                                className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-lg shadow-slate-900/5 dark:shadow-none flex flex-col justify-between group hover:-translate-y-1 transition-all duration-200"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className={`w-11 h-11 rounded-2xl ${channel.bgLight} ${channel.iconColor} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                                            <Icon size={22} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                            {channel.badge}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                                            {channel.title}
                                        </h3>
                                        <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                                            {channel.subtitle}
                                        </p>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {channel.details}
                                    </p>
                                </div>

                                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5">
                                    <a
                                        href={channel.actionHref}
                                        target={channel.actionHref.startsWith('http') ? '_blank' : undefined}
                                        rel={channel.actionHref.startsWith('http') ? 'noopener noreferrer' : undefined}
                                        className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <span>{channel.actionText}</span>
                                        <ExternalLink size={13} />
                                    </a>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Form & Map Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    {/* Left Column: Form */}
                    <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-white/10 shadow-sm">
                        <div className="mb-8">
                            <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                Send A Direct Message
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                                Tell Us How We Can Help
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                                Fill in the details below. Our customer care team responds within 24 hours on email.
                            </p>
                        </div>
                        <ContactForm />
                    </div>

                    {/* Right Column: Google Map & Office Info */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Office Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                                        Head Office &amp; Operations Center
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Serving all 28 states &amp; 8 UTs across India
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                InTrust Financial Services India Pvt. Ltd. <br />
                                TF-312/MM09, Ashima Mall, Hoshangabad Road, Danish Nagar, Bhopal, Madhya Pradesh – 462026.
                            </p>
                            <div className="flex items-center gap-2 pt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Support Active • Mon–Sat 9:00 AM – 8:00 PM</span>
                            </div>
                        </div>

                        {/* Interactive Styled Google Map */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                            <div className="rounded-2xl overflow-hidden h-72 w-full relative">
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d29341.251502878356!2d77.4181652069092!3d23.182736102755452!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x397c43970668176f%3A0x6e33b64a351a4ed9!2sINTRUST%20FINANCIAL%20SERVICES%20(INDIA)%20PVT%20LTD!5e0!3m2!1sen!2sin!4v1775679291628!5m2!1sen!2sin"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen=""
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    className="w-full h-full"
                                    title="InTrust India Corporate Office Location"
                                />
                                <div className="absolute top-3 right-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md border border-slate-200/60 dark:border-white/10 text-[11px] font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                                    <MapPin size={13} className="text-red-500" />
                                    <span>Ashima Mall HQ</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mt-20 pt-16 border-t border-slate-200/80 dark:border-white/10 max-w-4xl mx-auto">
                    <div className="text-center mb-10 space-y-2">
                        <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                            Quick Answers
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Frequently Asked Questions
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                            Find immediate answers to common questions regarding delivery, payments, gift cards, and merchant store accounts.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {FAQS.map((faq, idx) => {
                            const isOpen = openFaq === idx;
                            return (
                                <div
                                    key={idx}
                                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs transition-colors"
                                >
                                    <button
                                        onClick={() => toggleFaq(idx)}
                                        className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <span>{faq.q}</span>
                                        <ChevronDown
                                            size={18}
                                            className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`}
                                        />
                                    </button>
                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-6 pb-4 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-white/5">
                                                    {faq.a}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <Footer />
        </CustomerAppShell>
    );
}