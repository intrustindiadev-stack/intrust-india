'use client';

import React from 'react';
import NFCOrderForm from './NFCOrderForm';
import { motion } from 'framer-motion';

export default function OrderSection({ setIsSuccess }) {
    return (
        <section id="nfc-order-section" className="relative min-h-screen bg-[#08090b] pt-24 pb-32 px-6 overflow-hidden">
            {/* Architectural Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-blue-600/[0.03] blur-[120px] rounded-full" />
                <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#08090b] to-transparent z-10" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16 sm:mb-24"
                >
                    <span className="text-[10px] sm:text-[12px] font-black uppercase tracking-[0.6em] text-blue-500 block mb-6">Forge Your Identity</span>
                    <h2 className="text-4xl sm:text-7xl font-black tracking-tighter uppercase italic leading-[0.9] text-white">
                        THE IDENTITY<br /><span className="text-blue-600">STATION.</span>
                    </h2>
                    <p className="text-white/30 font-bold uppercase text-[10px] sm:text-[11px] tracking-[0.3em] mt-8 max-w-md mx-auto">
                        Precision engineering meets personalized identity. Configure your InTrust One below.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* The Hub Form */}
                    <div className="lg:col-span-8 lg:col-start-3">
                        <NFCOrderForm setIsSuccess={setIsSuccess} />
                    </div>
                </div>
            </div>

            {/* Background Texture */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] pointer-events-none" />
        </section>
    );
}
