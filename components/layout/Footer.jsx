'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { ArrowUp, Twitter, Linkedin, Instagram, Facebook, MapPin, Mail, Phone } from 'lucide-react';

export default function Footer() {

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const footerLinks = {
        services: [
            { label: 'Intrust Mart', href: '/shop' },
            { label: 'Smart NFC Cards', href: '/products/nfc' },
            { label: 'Brand Gift Cards', href: '/gift-cards' },
            { label: 'Merchant Dashboard', href: '/merchant' },
            { label: 'Digital Wallet', href: '/wallet' },
        ],
        company: [
            { label: 'About Us', href: '/about' },
            { label: 'Partner with Us', href: '/merchant-apply' },
            { label: 'Careers', href: '#careers' },
            { label: 'Press & Media', href: '#press' },
            { label: 'Contact Support', href: '/contact' },
        ],
        legal: [
            { label: 'Privacy Policy', href: '/legal' },
            { label: 'Terms of Service', href: '/legal' },
            { label: 'Shipping Policy', href: '/legal' },
            { label: 'Product Policy', href: '/legal' },
            { label: 'Refund Policy', href: '/legal' },
        ],
    };

    const socialLinks = [
        { icon: Twitter, href: '#', label: 'Twitter' },
        { icon: Linkedin, href: '#', label: 'LinkedIn' },
        { icon: Instagram, href: '#', label: 'Instagram' },
        { icon: Facebook, href: '#', label: 'Facebook' },
    ];

    return (
        <footer className="relative bg-white dark:bg-gray-900 text-[#171A21] dark:text-gray-200 pt-16 md:pt-20 pb-10 overflow-hidden border-t border-slate-100 dark:border-gray-800 font-[family-name:var(--font-outfit)]">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-12 md:mb-16">

                    {/* Brand Section — 3 cols */}
                    <div className="lg:col-span-3 flex flex-col items-start">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="relative w-9 h-9">
                                <Image src="/icon.png" alt="INTRUST" fill className="object-contain" />
                            </div>
                            <span className="text-xl font-bold text-[#171A21] dark:text-gray-100 tracking-tight">INTRUST</span>
                        </div>
                        <p className="text-slate-500 text-[15px] leading-relaxed mb-6 max-w-sm font-medium">
                            The ultimate Quick-Commerce platform delivering daily essentials, premium digital gift cards, and smart NFC business utilities at unmatched speed.
                        </p>
                        <div className="flex gap-3">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 hover:border-gray-300 hover:bg-gray-100 flex items-center justify-center transition-all duration-300 group"
                                    aria-label={social.label}
                                >
                                    <social.icon size={18} className="text-gray-500 group-hover:text-[#171A21]" strokeWidth={1.5} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links — 6 cols */}
                    <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
                        <FooterColumn title="Services" links={footerLinks.services} />
                        <FooterColumn title="Company" links={footerLinks.company} />
                        <FooterColumn title="Legal" links={footerLinks.legal} />
                    </div>

                    {/* Contact & Map — 3 cols */}
                    <div className="lg:col-span-3 flex flex-col gap-5">
                        <h4 className="text-[#171A21] dark:text-gray-100 font-semibold text-sm uppercase tracking-wider">
                            Contact Us
                        </h4>

                        <a href="tel:+9118002030052" className="flex items-start gap-3 group">
                            <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center border border-green-100 dark:border-green-500/20 shrink-0">
                                <Phone size={14} className="text-green-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Toll-Free</p>
                                <p className="text-sm font-medium text-slate-600 dark:text-gray-400 group-hover:text-green-600 transition-colors">
                                    +91 1800 203 0052
                                </p>
                            </div>
                        </a>

                        <a href="mailto:info@intrustindia.com" className="flex items-start gap-3 group">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center border border-purple-100 dark:border-purple-500/20 shrink-0">
                                <Mail size={14} className="text-purple-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Email</p>
                                <p className="text-sm font-medium text-slate-600 dark:text-gray-400 group-hover:text-purple-600 transition-colors break-all">
                                    info@intrustindia.com
                                </p>
                            </div>
                        </a>

                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center border border-amber-100 dark:border-amber-500/20 shrink-0">
                                <MapPin size={14} className="text-amber-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">HQ</p>
                                <p className="text-[13px] font-medium text-slate-600 dark:text-gray-400 leading-relaxed">
                                    TF-312/MM09, Ashima Mall,<br />
                                    Narmadapuram Rd, Danish Nagar,<br />
                                    Bhopal, MP – 462026
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-white/10 h-36 shadow-sm">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d29341.251502878356!2d77.4181652069092!3d23.182736102755452!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x397c43970668176f%3A0x6e33b64a351a4ed9!2sINTRUST%20FINANCIAL%20SERVICES%20(INDIA)%20PVT%20LTD!5e0!3m2!1sen!2sin!4v1775679291628!5m2!1sen!2sin"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="INTRUST HQ Location"
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-400">
                    <p>© 2026 InTrust Financial Services (India) Pvt. Ltd. All rights reserved.</p>
                    <button
                        onClick={scrollToTop}
                        className="group flex items-center gap-2 text-[#171A21] dark:text-gray-100 font-medium hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        Back to Top
                        <span className="p-2 rounded-full bg-gray-50 dark:bg-white/5 group-hover:bg-gray-100 dark:group-hover:bg-white/10 transition-colors">
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
            <h4 className="text-[#171A21] dark:text-gray-100 font-semibold text-sm uppercase tracking-wider">{title}</h4>
            <ul className="space-y-4">
                {links.map((link) => (
                    <li key={link.label}>
                        <a href={link.href} className="text-gray-500 hover:text-[#171A21] dark:hover:text-gray-200 transition-colors text-[15px] block py-0.5">
                            {link.label}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
