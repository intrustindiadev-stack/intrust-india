'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Image from 'next/image';
import { Github, Twitter, Linkedin, Mail, ArrowUp, Send, Facebook, Instagram } from 'lucide-react';

export default function Footer() {
    const { t } = useLanguage();

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
        <footer className="relative bg-[#0F1115] text-white pt-20 pb-10 overflow-hidden font-[family-name:var(--font-outfit)]">
            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Main Links Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
                    {/* Brand Column */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="relative w-10 h-10">
                                <Image src="/icons/intrustLogo.png" alt="INTRUST" fill className="object-contain" />
                            </div>
                            <span className="text-2xl font-bold bg-gradient-to-r from-blue-100 to-indigo-100 bg-clip-text text-transparent">
                                INTRUST
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-sm">
                            Your trusted partner for seamless digital payments and premium rewards. Simplified finance for everyone.
                        </p>
                        <div className="flex gap-4">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    className="w-10 h-10 rounded-full bg-gray-800 hover:bg-blue-600 flex items-center justify-center transition-all duration-300 group"
                                    aria-label={social.label}
                                >
                                    <social.icon size={18} className="text-gray-400 group-hover:text-white" strokeWidth={2} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links Columns */}
                    <FooterColumn title="Services" links={footerLinks.services} />
                    <FooterColumn title="Company" links={footerLinks.company} />
                    <FooterColumn title="Legal" links={footerLinks.legal} />
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
                    <p>© 2026 InTrust Platform. All rights reserved.</p>

                    <div className="flex items-center gap-6">
                        <button onClick={scrollToTop} className="flex items-center gap-2 hover:text-white transition-colors">
                            Back to Top <ArrowUp size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function FooterColumn({ title, links }) {
    return (
        <div>
            <h4 className="text-white font-bold text-lg mb-6">{title}</h4>
            <ul className="space-y-4">
                {links.map((link) => (
                    <li key={link.label}>
                        <a
                            href={link.href}
                            className="text-gray-400 hover:text-blue-400 transition-colors text-sm font-medium flex items-center gap-2 group"
                        >
                            <span className="w-0 group-hover:w-2 h-px bg-blue-400 transition-all duration-300" />
                            {link.label}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
