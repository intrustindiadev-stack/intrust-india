'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';
import HeroSection from '@/components/nfc/HeroSection';
import DetailsSection from '@/components/nfc/DetailsSection';
import CradleSection from '@/components/nfc/CradleSection';
import OrderSection from '@/components/nfc/OrderSection';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

export default function NFCServicePage() {
    const [previewData, setPreviewData] = useState({ cardHolderName: "YOUR NAME" });
    const [isSuccess, setIsSuccess] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [viewportWidth, setViewportWidth] = useState(0);

    useEffect(() => {
        setIsMounted(true);
        setViewportWidth(window.innerWidth);
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = viewportWidth < 1024;

    if (!isMounted) return null;

    return (
        <div className="relative min-h-screen bg-[#08090b] selection:bg-blue-500/30 overflow-x-hidden">
            {/* Professional Background Texture */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02]" />
                <div className="absolute inset-x-0 top-0 h-screen bg-gradient-to-b from-blue-600/[0.03] to-transparent" />
            </div>

            <div className="fixed top-0 left-0 right-0 z-[120]">
                <Navbar />
            </div>

            <AnimatePresence mode="wait">
                {isSuccess ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-[#08090b] p-6 text-white"
                    >
                        <div className="text-center max-w-lg">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                                className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/40 border border-white/10"
                            >
                                <ShieldCheck size={48} strokeWidth={2.5} />
                            </motion.div>
                            <h2 className="text-4xl sm:text-5xl font-black mb-4 uppercase tracking-tighter italic leading-none">ORDER PLACED</h2>
                            <p className="text-white/40 font-bold uppercase text-[10px] sm:text-[11px] tracking-[0.4em] mb-12 max-w-[280px] mx-auto">
                                Your digital identity is being physically forged. Welcome to the elite.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link
                                    href="/customer/dashboard"
                                    className="w-full sm:w-auto px-10 py-5 rounded-full bg-white text-black font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <Home size={16} /> DASHBOARD
                                </Link>
                                <button
                                    onClick={() => setIsSuccess(false)}
                                    className="w-full sm:w-auto px-10 py-5 rounded-full bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <ArrowLeft size={16} /> ORDER ANOTHER
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <main className="relative z-10 pt-20">
                        {/* THE JOURNEY: Mobile First & Professional */}
                        <HeroSection previewName={previewData.cardHolderName} />

                        <DetailsSection />

                        {/* Cradle transition provides semantic bridge to order */}
                        <CradleSection name={previewData.cardHolderName} />

                        {/* Order Section with full preview integration */}
                        <OrderSection onPreviewUpdate={setPreviewData} setIsSuccess={setIsSuccess} />

                        <Footer />
                    </main>
                )}
            </AnimatePresence>

            {isMobile && (
                <div className="fixed bottom-0 left-0 right-0 z-[120]">
                    <CustomerBottomNav />
                </div>
            )}

            <style jsx global>{`
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #08090b; }
                ::-webkit-scrollbar-thumb { background: #1a1b1e; border-radius: 10px; }
            `}</style>
        </div>
    );
}

