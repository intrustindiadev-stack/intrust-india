'use client';

import { useState, useEffect } from 'react';
import { Menu, X, ChevronRight } from 'lucide-react';

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
                                    <span className="text-xs font-Medium text-[#92BCEA]">
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

export default Navigation;
