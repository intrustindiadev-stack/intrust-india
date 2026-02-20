'use client';

import './index.css';
import { useState, useEffect, useRef } from 'react';
import {
    Search,
    X,
    ShoppingBag,
    ArrowRight,
    Star,
    CheckCircle2,
    Shield,
    Headphones,
    CreditCard,
    ChevronDown,
    Filter,
    Gift,
    TrendingUp,
    Zap,
    Menu,
    AlertCircle,
    Loader2,
    ChevronRight
} from 'lucide-react';
import { gsap } from 'gsap';
import { supabase } from '../../../lib/supabaseClient';

// Categories configuration
const categories = [
    { id: 1, name: 'All Categories', icon: <Filter size={18} />, count: 0 },
    { id: 2, name: 'Shopping', icon: <ShoppingBag size={18} />, count: 0 },
    { id: 3, name: 'Electronics', icon: <Zap size={18} />, count: 0 },
    { id: 4, name: 'Entertainment', icon: <Star size={18} />, count: 0 },
    { id: 5, name: 'Food', icon: <Gift size={18} />, count: 0 },
    { id: 6, name: 'Travel', icon: <TrendingUp size={18} />, count: 0 },
    { id: 7, name: 'Gaming', icon: <CreditCard size={18} />, count: 0 },
    { id: 8, name: 'Fashion', icon: <ShoppingBag size={18} />, count: 0 },
];

// Navigation Component (Matching Home Page)
const Navigation = () => {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [language, setLanguage] = useState('en');

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const menuItems = [
        { label: 'Services', href: '/#services' },
        { label: 'About', href: '/#about' },
        { label: 'Contact', href: '/#contact' },
    ];

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-4 md:pt-6 px-3 md:px-0 transition-all duration-300`}>
            <div className={`w-[96%] md:w-[92%] max-w-7xl bg-white/95 backdrop-blur-2xl rounded-2xl md:rounded-full px-4 md:px-8 py-3 md:py-4 shadow-lg border border-gray-200/60 transition-all duration-500 ${scrolled ? 'shadow-2xl bg-white border-gray-300/80' : ''}`}>
                <div className="flex items-center justify-between">
                    {/* Logo - Left - Clickable to Home */}
                    <a
                        href="/"
                        className="flex items-center gap-2.5 md:gap-3 z-10 group hover:scale-105 active:scale-95 transition-transform duration-200"
                    >
                        <div className="relative w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
                            <img
                                src="/icons/intrustLogo.png"
                                alt="INTRUST"
                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                            />
                        </div>
                        <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-[#7A93AC] via-[#92BCEA] to-[#AFB3F7] bg-clip-text text-transparent tracking-tight">
                            INTRUST
                        </span>
                    </a>

                    {/* Desktop Menu - Center */}
                    <div className="hidden lg:flex items-center gap-2">
                        {menuItems.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                className="relative px-5 py-2.5 text-[15px] font-medium text-[#617073] hover:text-[#171A21] transition-colors duration-300 rounded-full group"
                            >
                                <span className="relative z-10">{item.label}</span>
                                {/* Hover background */}
                                <div className="absolute inset-0 bg-gradient-to-r from-[#92BCEA]/10 to-[#AFB3F7]/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                {/* Animated underline */}
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] rounded-full group-hover:w-8 transition-all duration-300" />
                            </a>
                        ))}
                    </div>

                    {/* Actions - Right */}
                    <div className="flex items-center gap-2 md:gap-3 z-10">
                        {/* Language Switcher - Hidden on mobile */}
                        <div className="hidden lg:block relative">
                            <div className="relative bg-gray-100/80 backdrop-blur-sm rounded-full p-1 flex items-center">
                                {/* Animated sliding background */}
                                <div
                                    className="absolute top-1 bottom-1 bg-white rounded-full shadow-md transition-all duration-300"
                                    style={{
                                        left: language === 'en' ? '4px' : '50%',
                                        width: 'calc(50% - 4px)'
                                    }}
                                />

                                {/* Language buttons */}
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={`relative z-10 px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 min-w-[50px] text-center ${language === 'en' ? 'text-[#171A21]' : 'text-[#617073]'}`}
                                >
                                    EN
                                </button>
                                <button
                                    onClick={() => setLanguage('hi')}
                                    className={`relative z-10 px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 min-w-[50px] text-center ${language === 'hi' ? 'text-[#171A21]' : 'text-[#617073]'}`}
                                >
                                    हिं
                                </button>
                            </div>
                        </div>

                        {/* Auth Buttons */}
                        <div className="hidden lg:flex items-center gap-2">
                            <button
                                onClick={() => window.location.href = '/login'}
                                className="px-5 py-2.5 text-[15px] font-medium text-[#617073] hover:text-[#171A21] transition-colors duration-300 rounded-full hover:bg-gradient-to-r hover:from-[#92BCEA]/10 hover:to-[#AFB3F7]/10"
                            >
                                Login
                            </button>
                            <button
                                onClick={() => window.location.href = '/login'}
                                className="px-6 py-2.5 rounded-full font-semibold text-[15px] bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white shadow-md hover:shadow-xl transition-all duration-300"
                            >
                                Sign Up
                            </button>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="lg:hidden p-2 md:p-2.5 rounded-full hover:bg-[#92BCEA]/10 transition-colors duration-200"
                            aria-label="Toggle menu"
                        >
                            {menuOpen ? (
                                <X size={22} className="text-[#171A21]" strokeWidth={2.5} />
                            ) : (
                                <Menu size={22} className="text-[#171A21]" strokeWidth={2.5} />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => setMenuOpen(false)}
                        className="fixed inset-0 bg-[#171A21]/70 backdrop-blur-md z-[998] lg:hidden"
                    />

                    {/* Menu Panel */}
                    <div className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white z-[999] lg:hidden overflow-y-auto shadow-2xl">
                        {/* Header */}
                        <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-gray-100 p-5 flex items-center justify-between z-10">
                            <a href="/" className="flex items-center gap-2.5">
                                <div className="relative w-8 h-8">
                                    <img
                                        src="/icons/intrustLogo.png"
                                        alt="INTRUST"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <span className="text-lg font-bold bg-gradient-to-r from-[#7A93AC] to-[#92BCEA] bg-clip-text text-transparent">
                                    INTRUST
                                </span>
                            </a>
                            <button
                                onClick={() => setMenuOpen(false)}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                aria-label="Close menu"
                            >
                                <X size={24} className="text-[#171A21]" strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Menu Content */}
                        <div className="p-5 space-y-1.5">
                            {/* Navigation Links */}
                            {menuItems.map((item) => (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => setMenuOpen(false)}
                                    className="group flex items-center justify-between px-4 py-4 text-[#171A21] hover:bg-gradient-to-r hover:from-[#92BCEA]/10 hover:to-[#AFB3F7]/10 rounded-xl font-medium text-[15px] transition-all duration-200"
                                >
                                    <span>{item.label}</span>
                                    <ChevronRight
                                        size={18}
                                        className="text-[#617073] group-hover:text-[#92BCEA] group-hover:translate-x-1 transition-all duration-200"
                                        strokeWidth={2.5}
                                    />
                                </a>
                            ))}

                            {/* Divider */}
                            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-4" />

                            {/* Auth Actions */}
                            <button
                                onClick={() => { window.location.href = '/login'; setMenuOpen(false); }}
                                className="group w-full flex items-center justify-between px-4 py-4 text-[#171A21] hover:bg-gradient-to-r hover:from-[#92BCEA]/10 hover:to-[#AFB3F7]/10 rounded-xl font-medium text-[15px] transition-all duration-200"
                            >
                                <span>Login</span>
                                <ChevronRight
                                    size={18}
                                    className="text-[#617073] group-hover:text-[#92BCEA] group-hover:translate-x-1 transition-all duration-200"
                                    strokeWidth={2.5}
                                />
                            </button>
                            <button
                                onClick={() => { window.location.href = '/login'; setMenuOpen(false); }}
                                className="w-full mt-3 px-4 py-4 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white rounded-xl font-semibold text-[15px] shadow-lg hover:shadow-xl transition-all duration-200 text-center"
                            >
                                Sign Up
                            </button>

                            {/* Language Toggle - Mobile */}
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <p className="text-xs font-semibold text-[#617073] uppercase tracking-wider">
                                        Language
                                    </p>
                                    <span className="text-xs font-medium text-[#92BCEA]">
                                        {language === 'en' ? 'English' : 'हिन्दी'}
                                    </span>
                                </div>

                                <div className="relative bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-1.5 shadow-inner">
                                    {/* Animated Background Slider */}
                                    <div
                                        className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-lg transition-all duration-300"
                                        style={{
                                            left: language === 'en' ? '6px' : 'calc(50% + 0px)'
                                        }}
                                    />

                                    {/* Language Buttons */}
                                    <div className="relative z-10 flex items-center gap-1">
                                        <button
                                            onClick={() => setLanguage('en')}
                                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 text-center ${language === 'en' ? 'text-[#171A21]' : 'text-[#617073]'}`}
                                        >
                                            English
                                        </button>
                                        <button
                                            onClick={() => setLanguage('hi')}
                                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 text-center ${language === 'hi' ? 'text-[#171A21]' : 'text-[#617073]'}`}
                                        >
                                            हिन्दी
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </nav>
    );
};

// Hero Component
const Hero = () => {
    const heroRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.hero-content',
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.2 }
            );
        }, heroRef);
        return () => ctx.revert();
    }, []);

    const stats = [
        { icon: <CheckCircle2 size={18} />, label: '100+ Verified Cards', color: '#92BCEA' },
        { icon: <Headphones size={18} />, label: '24/7 Support', color: '#AFB3F7' },
        { icon: <Shield size={18} />, label: 'Secure Payments', color: '#92BCEA' },
    ];

    return (
        <section ref={heroRef} className="pt-24 pb-8">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="hero-content bg-gradient-to-br from-[#92BCEA]/10 via-[#AFB3F7]/8 to-[#92BCEA]/5 rounded-xl p-8 md:p-10 border border-[#92BCEA]/15">
                    <div className="max-w-2xl">
                        <h1 className="text-3xl md:text-4xl font-semibold text-[#171A21] mb-3 leading-tight">
                            Buy Gift Cards at <span className="text-gradient">Discounted Prices</span>
                        </h1>
                        <p className="text-[#617073] text-base mb-6 leading-relaxed">
                            Save up to 15% on verified gift cards from top brands. Instant delivery, secure transactions, and 24/7 customer support.
                        </p>

                        {/* Stats */}
                        <div className="flex flex-wrap gap-4">
                            {stats.map((stat, index) => (
                                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-white/70 rounded-lg border border-[#92BCEA]/15">
                                    <span style={{ color: stat.color }}>{stat.icon}</span>
                                    <span className="text-sm text-[#617073] font-medium">{stat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// SearchBar Component
const SearchBar = ({ onSearch }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        onSearch(searchQuery);
        setIsOpen(false);
    };

    return (
        <>
            {/* Collapsed Search Bar */}
            <div
                onClick={() => setIsOpen(true)}
                className="relative cursor-pointer group"
            >
                <div className="bg-white/70 backdrop-blur-md rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-300 border border-[#92BCEA]/20 group-hover:border-[#92BCEA]/40 shadow-sm">
                    <Search className="text-[#7A93AC] group-hover:text-[#92BCEA] transition-colors" size={18} />
                    <span className="text-[#7A93AC] text-sm">Search gift cards...</span>
                    <div className="ml-auto">
                        <kbd className="px-2 py-1 rounded-md bg-white/60 text-[#7A93AC] text-xs border border-[#92BCEA]/15">⌘K</kbd>
                    </div>
                </div>
            </div>

            {/* Expanded Search Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-start justify-center pt-[25vh]"
                    onClick={() => setIsOpen(false)}
                >
                    <div className="absolute inset-0 bg-[#F8FAFC]/90 backdrop-blur-md" />

                    <div
                        className="relative w-full max-w-lg mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-[#92BCEA]/20">
                            <form onSubmit={handleSearch} className="flex items-center gap-3 px-4 py-3 border-b border-[#92BCEA]/10">
                                <Search className="text-[#92BCEA]" size={20} />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search gift cards by brand or category..."
                                    className="flex-1 bg-transparent text-[#171A21] text-base placeholder-[#7A93AC] outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 rounded-md hover:bg-[#92BCEA]/10 transition-colors"
                                >
                                    <X className="text-[#7A93AC]" size={18} />
                                </button>
                            </form>

                            {/* Quick Suggestions */}
                            <div className="p-4">
                                <p className="text-xs text-[#7A93AC] uppercase tracking-wider mb-3">Popular Brands</p>
                                <div className="flex flex-wrap gap-2">
                                    {['Amazon', 'Apple', 'Netflix', 'Spotify', 'Uber', 'Starbucks'].map((tag) => (
                                        <button
                                            key={tag}
                                            onClick={() => { setSearchQuery(tag); onSearch(tag); setIsOpen(false); }}
                                            className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] text-[#617073] text-sm hover:bg-[#92BCEA]/10 hover:text-[#171A21] transition-all border border-[#92BCEA]/15"
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Sidebar Component
const Sidebar = ({
    activeCategory,
    onCategoryChange,
    isMobileOpen,
    onMobileClose,
    categoryCounts
}) => {
    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-[280px] flex-shrink-0">
                <div className="bg-white rounded-xl p-5 sticky top-24 border border-[#92BCEA]/10 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter size={18} className="text-[#92BCEA]" />
                        <h3 className="text-sm font-semibold text-[#171A21]">Categories</h3>
                    </div>

                    <div className="space-y-1">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => onCategoryChange(cat.name)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${activeCategory === cat.name
                                    ? 'bg-[#92BCEA]/8 border-l-[3px] border-[#92BCEA]'
                                    : 'hover:bg-[#F8FAFC] text-[#617073] border-l-[3px] border-transparent'
                                    }`}
                            >
                                <span className={activeCategory === cat.name ? 'text-[#92BCEA]' : 'text-[#7A93AC]'}>
                                    {cat.icon}
                                </span>
                                <span className={`text-sm flex-1 ${activeCategory === cat.name ? 'text-[#171A21] font-medium' : ''}`}>
                                    {cat.name}
                                </span>
                                <span className="text-xs text-[#7A93AC]">{categoryCounts[cat.name] || 0}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Mobile Sidebar Dropdown */}
            {isMobileOpen && (
                <div className="lg:hidden fixed inset-0 z-40" onClick={onMobileClose}>
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
                    <div
                        className="absolute top-20 left-4 right-4 bg-white rounded-xl shadow-lg border border-[#92BCEA]/15 p-4 max-h-[70vh] overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-[#171A21]">Categories</h3>
                            <button onClick={onMobileClose} className="p-1 hover:bg-[#F8FAFC] rounded">
                                <X size={18} className="text-[#7A93AC]" />
                            </button>
                        </div>
                        <div className="space-y-1">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => { onCategoryChange(cat.name); onMobileClose(); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${activeCategory === cat.name
                                        ? 'bg-[#92BCEA]/8 border-l-[3px] border-[#92BCEA]'
                                        : 'hover:bg-[#F8FAFC] text-[#617073] border-l-[3px] border-transparent'
                                        }`}
                                >
                                    <span className={activeCategory === cat.name ? 'text-[#92BCEA]' : 'text-[#7A93AC]'}>
                                        {cat.icon}
                                    </span>
                                    <span className={`text-sm flex-1 ${activeCategory === cat.name ? 'text-[#171A21] font-medium' : ''}`}>
                                        {cat.name}
                                    </span>
                                    <span className="text-xs text-[#7A93AC]">{categoryCounts[cat.name] || 0}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// GiftCard Card Component
const GiftCardCard = ({ card }) => {
    const faceValue = (card.face_value_paise / 100).toFixed(2);
    const sellingPrice = (card.selling_price_paise / 100).toFixed(2);
    const savings = (faceValue - sellingPrice).toFixed(2);
    const discountPercent = (((faceValue - sellingPrice) / faceValue) * 100).toFixed(0);

    // Generate brand logo initials
    const logo = card.brand.substring(0, 3).toUpperCase();
    const color = '#' + Math.floor(Math.abs(Math.sin(card.brand.length) * 16777215)).toString(16).padStart(6, '0');

    return (
        <div className="bg-white rounded-2xl p-5 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group border border-[#92BCEA]/8">
            {/* Tag */}
            {card.tags && card.tags.length > 0 && (
                <div className="flex justify-end mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#92BCEA]/15 text-[#92BCEA] text-xs font-medium capitalize">
                        {card.tags[0]}
                    </span>
                </div>
            )}

            {/* Brand Logo */}
            <div className="flex justify-center mb-4">
                {card.image_url ? (
                    <img src={card.image_url} alt={card.brand} className="w-16 h-16 rounded-xl object-cover shadow-sm" />
                ) : (
                    <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                        style={{ backgroundColor: color }}
                    >
                        {logo}
                    </div>
                )}
            </div>

            {/* Brand Name */}
            <h3 className="text-center text-lg font-semibold text-[#171A21] mb-1">{card.brand}</h3>

            {/* Title */}
            <p className="text-center text-sm text-[#617073] mb-4 line-clamp-2">{card.title}</p>

            {/* Value & Price */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <p className="text-xs text-[#7A93AC]">Value</p>
                    <p className="text-lg font-semibold text-[#171A21]">₹{faceValue}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-[#7A93AC]">You Pay</p>
                    <p className="text-lg font-semibold text-[#92BCEA]">₹{sellingPrice}</p>
                </div>
            </div>

            {/* Savings */}
            <div className="flex items-center justify-between mb-4">
                <span className="px-2 py-1 rounded-md bg-[#AFB3F7]/15 text-[#AFB3F7] text-xs font-medium">
                    Save ₹{savings}
                </span>
                <span className="text-xs text-[#7A93AC]">{discountPercent}% OFF</span>
            </div>

            {/* CTA Button */}
            <button className="w-full py-2.5 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] rounded-xl text-white text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2">
                Buy Now
                <ArrowRight size={16} />
            </button>
        </div>
    );
};

// Loading Skeleton
const LoadingSkeleton = () => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(6)].map((_, index) => (
                <div key={index} className="bg-white rounded-2xl p-5 border border-[#92BCEA]/8 animate-pulse">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-xl bg-gray-200"></div>
                    </div>
                    <div className="h-5 bg-gray-200 rounded mb-2 mx-auto w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-4 mx-auto w-3/4"></div>
                    <div className="flex justify-between mb-2">
                        <div className="h-12 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-12 bg-gray-200 rounded w-1/3"></div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                </div>
            ))}
        </div>
    );
};

// Error State
const ErrorState = ({ message, onRetry }) => {
    return (
        <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-[#171A21] mb-2">Something went wrong</h3>
            <p className="text-sm text-[#7A93AC] mb-4">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] rounded-lg text-white text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
                >
                    Try Again
                </button>
            )}
        </div>
    );
};

// Filter Bar Component
const FilterBar = ({ sortBy, setSortBy, priceRange, setPriceRange, minDiscount, setMinDiscount, totalResults }) => {
    const [showFilters, setShowFilters] = useState(false);

    const sortOptions = [
        { value: 'newest', label: 'Newest First' },
        { value: 'price-low', label: 'Price: Low to High' },
        { value: 'price-high', label: 'Price: High to Low' },
        { value: 'discount-high', label: 'Highest Discount' },
    ];

    const discountOptions = [
        { value: 0, label: 'Any Discount' },
        { value: 5, label: '5% or more' },
        { value: 10, label: '10% or more' },
        { value: 15, label: '15% or more' },
    ];

    return (
        <div className="mb-6 space-y-4">
            {/* Filter Bar Header */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Sort Dropdown */}
                <div className="relative">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="appearance-none bg-white border border-[#92BCEA]/20 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-[#171A21] hover:border-[#92BCEA]/40 focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/30 transition-all cursor-pointer"
                    >
                        {sortOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A93AC] pointer-events-none" />
                </div>

                {/* Advanced Filters Toggle */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${showFilters
                        ? 'bg-[#92BCEA]/10 text-[#92BCEA] border border-[#92BCEA]/30'
                        : 'bg-white border border-[#92BCEA]/20 text-[#617073] hover:border-[#92BCEA]/40'
                        }`}
                >
                    <Filter size={16} />
                    Filters
                    {(minDiscount > 0 || priceRange[0] > 0 || priceRange[1] < 5000) && (
                        <span className="w-5 h-5 rounded-full bg-[#92BCEA] text-white text-xs flex items-center justify-center">
                            {(minDiscount > 0 ? 1 : 0) + ((priceRange[0] > 0 || priceRange[1] < 5000) ? 1 : 0)}
                        </span>
                    )}
                </button>

                {/* Results Count */}
                <span className="ml-auto text-sm text-[#7A93AC]">{totalResults} results</span>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
                <div className="bg-white border border-[#92BCEA]/15 rounded-xl p-5 space-y-5">
                    {/* Price Range Filter */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-[#171A21] mb-3">
                            <CreditCard size={16} className="text-[#92BCEA]" />
                            Price Range
                        </label>
                        <div className="space-y-3">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="text-xs text-[#7A93AC] mb-1 block">Min Price</label>
                                    <input
                                        type="number"
                                        value={priceRange[0]}
                                        onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                                        className="w-full border border-[#92BCEA]/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/30"
                                        placeholder="₹0"
                                    />
                                </div>
                                <span className="text-[#7A93AC] mt-5">-</span>
                                <div className="flex-1">
                                    <label className="text-xs text-[#7A93AC] mb-1 block">Max Price</label>
                                    <input
                                        type="number"
                                        value={priceRange[1]}
                                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 5000])}
                                        className="w-full border border-[#92BCEA]/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#92BCEA]/30"
                                        placeholder="₹5000"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-[#7A93AC]">
                                <span>₹{priceRange[0]}</span>
                                <span>₹{priceRange[1]}</span>
                            </div>
                        </div>
                    </div>

                    {/* Minimum Discount Filter */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-[#171A21] mb-3">
                            <TrendingUp size={16} className="text-[#92BCEA]" />
                            Minimum Discount
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {discountOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setMinDiscount(option.value)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${minDiscount === option.value
                                        ? 'bg-[#92BCEA] text-white shadow-sm'
                                        : 'bg-gray-50 text-[#617073] hover:bg-gray-100 border border-gray-200'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Clear Filters */}
                    {(minDiscount > 0 || priceRange[0] > 0 || priceRange[1] < 5000) && (
                        <button
                            onClick={() => {
                                setPriceRange([0, 5000]);
                                setMinDiscount(0);
                            }}
                            className="text-sm text-[#92BCEA] hover:text-[#7A93AC] font-medium transition-colors"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// Main Content Area
const MainContent = ({
    giftCards,
    activeCategory,
    searchQuery,
    onMobileFilterOpen,
    loading,
    error,
    onRetry,
    sortBy,
    setSortBy,
    priceRange,
    setPriceRange,
    minDiscount,
    setMinDiscount
}) => {
    // Filter and sort cards
    let filteredCards = giftCards.filter(card => {
        const sellingPrice = card.selling_price_paise / 100;
        const faceValue = card.face_value_paise / 100;
        const discountPercent = ((faceValue - sellingPrice) / faceValue) * 100;

        const matchesCategory = activeCategory === 'All Categories' || card.category === activeCategory;
        const matchesSearch = card.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            card.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            card.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPrice = sellingPrice >= priceRange[0] && sellingPrice <= priceRange[1];
        const matchesDiscount = discountPercent >= minDiscount;

        return matchesCategory && matchesSearch && matchesPrice && matchesDiscount;
    });

    // Sort cards
    filteredCards = [...filteredCards].sort((a, b) => {
        const aPrice = a.selling_price_paise / 100;
        const bPrice = b.selling_price_paise / 100;
        const aDiscount = ((a.face_value_paise - a.selling_price_paise) / a.face_value_paise) * 100;
        const bDiscount = ((b.face_value_paise - b.selling_price_paise) / b.face_value_paise) * 100;

        switch (sortBy) {
            case 'price-low':
                return aPrice - bPrice;
            case 'price-high':
                return bPrice - aPrice;
            case 'discount-high':
                return bDiscount - aDiscount;
            case 'newest':
            default:
                return new Date(b.created_at) - new Date(a.created_at);
        }
    });

    return (
        <div className="flex-1">
            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-4">
                <button
                    onClick={onMobileFilterOpen}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-[#92BCEA]/15 shadow-sm"
                >
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-[#92BCEA]" />
                        <span className="text-sm text-[#171A21] font-medium">{activeCategory}</span>
                    </div>
                    <ChevronDown size={18} className="text-[#7A93AC]" />
                </button>
            </div>

            {/* Filter Bar */}
            {!loading && !error && (
                <FilterBar
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    minDiscount={minDiscount}
                    setMinDiscount={setMinDiscount}
                    totalResults={filteredCards.length}
                />
            )}

            {/* Loading State */}
            {loading && <LoadingSkeleton />}

            {/* Error State */}
            {error && !loading && <ErrorState message={error} onRetry={onRetry} />}

            {/* Gift Cards Grid */}
            {!loading && !error && filteredCards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredCards.map((card) => (
                        <GiftCardCard key={card.id} card={card} />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredCards.length === 0 && (
                <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-[#92BCEA]/10 flex items-center justify-center mx-auto mb-4">
                        <Search size={24} className="text-[#92BCEA]" />
                    </div>
                    <h3 className="text-lg font-medium text-[#171A21] mb-1">No cards found</h3>
                    <p className="text-sm text-[#7A93AC]">Try adjusting your search or category filter</p>
                </div>
            )}
        </div>
    );
};

// Footer Component
const Footer = () => {
    return (
        <footer className="mt-16 py-10 border-t border-[#92BCEA]/10">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                    <div className="md:col-span-1">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center">
                                <Gift className="text-white" size={14} />
                            </div>
                            <span className="text-base font-semibold text-[#171A21]">INTRUST Gift Cards</span>
                        </div>
                        <p className="text-sm text-[#617073]">The trusted marketplace for discounted gift cards.</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-[#171A21] mb-3">Product</h4>
                        <ul className="space-y-2">
                            {['Buy Cards', 'Sell Cards', 'How It Works', 'Pricing'].map((item) => (
                                <li key={item}>
                                    <a href="#" className="text-sm text-[#617073] hover:text-[#171A21] transition-colors">{item}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-[#171A21] mb-3">Support</h4>
                        <ul className="space-y-2">
                            {['Help Center', 'Contact Us', 'FAQs', 'Security'].map((item) => (
                                <li key={item}>
                                    <a href="#" className="text-sm text-[#617073] hover:text-[#171A21] transition-colors">{item}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-[#171A21] mb-3">Legal</h4>
                        <ul className="space-y-2">
                            {['Privacy Policy', 'Terms of Service', 'Refund Policy'].map((item) => (
                                <li key={item}>
                                    <a href="#" className="text-sm text-[#617073] hover:text-[#171A21] transition-colors">{item}</a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="pt-6 border-t border-[#92BCEA]/10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-[#7A93AC]">2024 INTRUST. All rights reserved.</p>
                    <div className="flex items-center gap-4">
                        <Shield size={16} className="text-[#92BCEA]" />
                        <span className="text-xs text-[#7A93AC]">256-bit SSL Encrypted</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

// Main App
export default function GiftCardsPage() {
    const [activeCategory, setActiveCategory] = useState('All Categories');
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [giftCards, setGiftCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [categoryCounts, setCategoryCounts] = useState({});

    // NEW: Filter and Sort States
    const [sortBy, setSortBy] = useState('newest'); // 'newest', 'price-low', 'price-high', 'discount-high'
    const [priceRange, setPriceRange] = useState([0, 5000]); // Min and Max price in rupees
    const [minDiscount, setMinDiscount] = useState(0); // Minimum discount percentage

    // Fetch gift cards from Supabase
    const fetchGiftCards = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('coupons')
                .select('*')
                .eq('status', 'available')
                .gte('valid_until', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            setGiftCards(data || []);

            // Calculate category counts
            const counts = { 'All Categories': data?.length || 0 };
            data?.forEach(card => {
                counts[card.category] = (counts[card.category] || 0) + 1;
            });
            setCategoryCounts(counts);

        } catch (err) {
            console.error('Error fetching gift cards:', err);
            setError(err.message || 'Failed to load gift cards. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGiftCards();
    }, []);

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Navigation />

            <main>
                <Hero />

                {/* Search Section */}
                <section className="pb-6">
                    <div className="max-w-7xl mx-auto px-6 lg:px-12">
                        <div className="max-w-md">
                            <SearchBar onSearch={setSearchQuery} />
                        </div>
                    </div>
                </section>

                {/* Main Content Area */}
                <section className="py-6">
                    <div className="max-w-7xl mx-auto px-6 lg:px-12">
                        <div className="flex gap-8">
                            <Sidebar
                                activeCategory={activeCategory}
                                onCategoryChange={setActiveCategory}
                                isMobileOpen={isMobileFilterOpen}
                                onMobileClose={() => setIsMobileFilterOpen(false)}
                                categoryCounts={categoryCounts}
                            />

                            <MainContent
                                giftCards={giftCards}
                                activeCategory={activeCategory}
                                searchQuery={searchQuery}
                                onMobileFilterOpen={() => setIsMobileFilterOpen(true)}
                                loading={loading}
                                error={error}
                                onRetry={fetchGiftCards}
                                sortBy={sortBy}
                                setSortBy={setSortBy}
                                priceRange={priceRange}
                                setPriceRange={setPriceRange}
                                minDiscount={minDiscount}
                                setMinDiscount={setMinDiscount}
                            />
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
