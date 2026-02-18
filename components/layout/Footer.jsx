'use client';

import { motion } from 'framer-motion';
<<<<<<< HEAD
import { useLanguage } from '@/lib/i18n/LanguageContext';
=======
>>>>>>> origin/yogesh-final
import Image from 'next/image';
import { ArrowUp, Twitter, Linkedin, Instagram, Facebook } from 'lucide-react';

export default function Footer() {
<<<<<<< HEAD
    const { t } = useLanguage();
=======
>>>>>>> origin/yogesh-final

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const footerLinks = {
        services: [
            { label: 'Mobile Recharge', href: '/services/recharge' },
            { label: 'Electricity Bill', href: '/services/electricity' },
            { label: 'Brand Gift Cards', href: '/gift-cards' },
            { label: 'DTH Connection', href: '/services/dth' },
            { label: 'Credit Card Payment', href: '/services/credit-card' },
        ],
        company: [
            { label: 'About Us', href: '#about' },
            { label: 'Partner with Us', href: '/merchant-apply' },
            { label: 'Careers', href: '#careers' },
            { label: 'Press & Media', href: '#press' },
            { label: 'Contact Support', href: '/support' },
        ],
        legal: [
            { label: 'Privacy Policy', href: '#privacy' },
            { label: 'Terms of Service', href: '#terms' },
            { label: 'Refund Policy', href: '#refunds' },
            { label: 'Grievance Officer', href: '#grievance' },
        ],
    };

    const socialLinks = [
        { icon: Twitter, href: '#', label: 'Twitter' },
        { icon: Linkedin, href: '#', label: 'LinkedIn' },
        { icon: Instagram, href: '#', label: 'Instagram' },
        { icon: Facebook, href: '#', label: 'Facebook' },
    ];

    return (
<<<<<<< HEAD
        <footer className="relative bg-white text-[#171A21] pt-16 md:pt-20 pb-10 overflow-hidden border-t border-slate-100 font-[family-name:var(--font-outfit)]">
=======
        <footer className="relative bg-white dark:bg-gray-900 text-[#171A21] dark:text-gray-200 pt-16 md:pt-20 pb-10 overflow-hidden border-t border-slate-100 dark:border-gray-800 font-[family-name:var(--font-outfit)]">
>>>>>>> origin/yogesh-final
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-12 md:mb-16">
                    {/* Brand Section - Spans 4 columns */}
                    <div className="lg:col-span-4 flex flex-col items-start">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="relative w-9 h-9">
                                <Image
                                    src="/icons/intrustLogo.png"
                                    alt="INTRUST"
                                    fill
                                    className="object-contain"
                                />
                            </div>
<<<<<<< HEAD
                            <span className="text-xl font-bold text-[#171A21] tracking-tight">
=======
                            <span className="text-xl font-bold text-[#171A21] dark:text-gray-100 tracking-tight">
>>>>>>> origin/yogesh-final
                                INTRUST
                            </span>
                        </div>
                        <p className="text-slate-500 text-[15px] leading-relaxed mb-6 max-w-sm font-medium">
                            Simplifying digital payments and rewards for everyone. Experience seamless transactions and premium benefits.
                        </p>
                        <div className="flex gap-3">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 hover:border-gray-300 hover:bg-gray-100 flex items-center justify-center transition-all duration-300 group"
                                    aria-label={social.label}
                                >
                                    <social.icon
                                        size={18}
                                        className="text-gray-500 group-hover:text-[#171A21]"
                                        strokeWidth={1.5}
                                    />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Spacer */}
                    <div className="hidden lg:block lg:col-span-1" />

                    {/* Links Section - Spans 7 columns */}
                    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
                        <FooterColumn title="Services" links={footerLinks.services} />
                        <FooterColumn title="Company" links={footerLinks.company} />
                        <FooterColumn title="Legal" links={footerLinks.legal} />
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-400">
                    <p>© 2026 InTrust Platform. All rights reserved.</p>

                    <button
                        onClick={scrollToTop}
<<<<<<< HEAD
                        className="group flex items-center gap-2 text-[#171A21] font-medium hover:text-gray-600 transition-colors"
=======
                        className="group flex items-center gap-2 text-[#171A21] dark:text-gray-100 font-medium hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
>>>>>>> origin/yogesh-final
                    >
                        Back to Top
                        <span className="p-2 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">
                            <ArrowUp size={16} />
                        </span>
                    </button>
                </div>
            </div>
        </footer>
    );
}

function FooterColumn({ title, links }) {
    return (
        <div className="flex flex-col gap-6">
<<<<<<< HEAD
            <h4 className="text-[#171A21] font-semibold text-sm uppercase tracking-wider">
=======
            <h4 className="text-[#171A21] dark:text-gray-100 font-semibold text-sm uppercase tracking-wider">
>>>>>>> origin/yogesh-final
                {title}
            </h4>
            <ul className="space-y-4">
                {links.map((link) => (
                    <li key={link.label}>
                        <a
                            href={link.href}
                            className="text-gray-500 hover:text-[#171A21] transition-colors text-[15px] block py-0.5"
                        >
                            {link.label}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
