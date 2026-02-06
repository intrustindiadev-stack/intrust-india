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
    Loader2
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

// Navigation Component
const Navigation = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-4'}`}>
            <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center shadow-sm">
                        <Gift className="text-white" size={18} />
                    </div>
                    <span className="text-lg font-semibold text-[#171A21]">INTRUST Gift Cards</span>
                </div>

                <div className="hidden md:flex items-center gap-8">
                    <a href="#" className="text-[#617073] hover:text-[#171A21] transition-colors text-sm font-medium">Browse</a>
                    <a href="#" className="text-[#617073] hover:text-[#171A21] transition-colors text-sm font-medium">Sell Cards</a>
                    <a href="#" className="text-[#617073] hover:text-[#171A21] transition-colors text-sm font-medium">How It Works</a>
                    <a href="#" className="text-[#617073] hover:text-[#171A21] transition-colors text-sm font-medium">Support</a>
                </div>

                <div className="flex items-center gap-3">
                    <button className="hidden md:block px-4 py-2 text-[#617073] hover:text-[#171A21] transition-colors text-sm font-medium">
                        Sign In
                    </button>
                    <button className="px-4 py-2 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] rounded-lg text-white text-sm font-medium shadow-sm hover:shadow-md transition-shadow">
                        Get Started
                    </button>
                    <button className="md:hidden text-[#171A21]">
                        <Menu size={22} />
                    </button>
                </div>
            </div>
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

// Main Content Area
const MainContent = ({
    giftCards,
    activeCategory,
    searchQuery,
    onMobileFilterOpen,
    loading,
    error,
    onRetry
}) => {
    // Filter cards
    const filteredCards = giftCards.filter(card => {
        const matchesCategory = activeCategory === 'All Categories' || card.category === activeCategory;
        const matchesSearch = card.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            card.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            card.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
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

            {/* Results Header */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[#171A21]">
                    {activeCategory === 'All Categories' ? 'All Gift Cards' : activeCategory}
                </h2>
                {!loading && <span className="text-sm text-[#7A93AC]">{filteredCards.length} results</span>}
            </div>

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
                            />
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
