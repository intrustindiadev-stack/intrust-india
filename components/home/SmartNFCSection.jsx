'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Nfc, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const BULLETS = [
    'No App Needed on the Receiver\'s End',
    'Eco-Friendly & Premium Durable Material',
    'Share Profile, Payment QR & Social Links',
];

function NFCFlipCard() {
    const [flipped, setFlipped] = useState(false);

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Flip container */}
            <div
                className="relative cursor-pointer select-none"
                style={{
                    width: '100%',
                    maxWidth: '340px',
                    aspectRatio: '1.586 / 1', // standard card ratio
                    perspective: '1000px',
                }}
                onClick={() => setFlipped(f => !f)}
                aria-label={flipped ? 'Click to see front of card' : 'Click to see back of card'}
            >
                <motion.div
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                        width: '100%',
                        height: '100%',
                        transformStyle: 'preserve-3d',
                        position: 'relative',
                    }}
                >
                    {/* FRONT */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 25px 60px -10px rgba(0,0,0,0.35)',
                        }}
                    >
                        <Image
                            src="/nfc/front.png"
                            alt="InTrust NFC Card – Front"
                            fill
                            className="object-cover"
                            priority
                            sizes="(max-width: 768px) 90vw, 340px"
                        />
                    </div>

                    {/* BACK */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 25px 60px -10px rgba(0,0,0,0.35)',
                        }}
                    >
                        <Image
                            src="/nfc/back.png"
                            alt="InTrust NFC Card – Back"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 90vw, 340px"
                        />
                    </div>
                </motion.div>
            </div>

            {/* Flip hint */}
            <motion.button
                onClick={() => setFlipped(f => !f)}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200"
                style={{
                    color: 'var(--text-secondary)',
                    borderColor: 'var(--border-color)',
                    background: 'var(--card-bg)',
                }}
            >
                <RotateCcw size={12} />
                {flipped ? 'See front' : 'Flip to see back'}
            </motion.button>
        </div>
    );
}

export default function SmartNFCSection() {
    return (
        <section
            className="py-14 md:py-24 font-[family-name:var(--font-outfit)] relative overflow-hidden"
            style={{ background: 'var(--bg-primary)' }}
        >
            {/* Ambient glow */}
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#92BCEA]/10 blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-[#AFB3F7]/10 blur-[80px] pointer-events-none" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col-reverse md:flex-row items-center gap-12 md:gap-16">

                    {/* ── Left: Text ── */}
                    <motion.div
                        initial={{ opacity: 0, x: -28 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        className="flex-1 min-w-0"
                    >
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#92BCEA] mb-4">
                            <Nfc size={13} /> Smart NFC
                        </span>

                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-snug mb-4"
                            style={{ color: 'var(--text-primary)' }}>
                            Step into the Future with{' '}
                            <span className="gradient-text">Smart NFC</span>
                        </h2>

                        <p className="text-sm md:text-base leading-relaxed mb-6 max-w-md"
                            style={{ color: 'var(--text-secondary)' }}>
                            One tap replaces your entire stack of business cards. Your profile, links, payment QR and contact info — all in a single touch.
                        </p>

                        {/* Bullets */}
                        <ul className="space-y-3 mb-8">
                            {BULLETS.map((b, i) => (
                                <motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: -12 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                                    className="flex items-start gap-2.5 text-sm font-medium"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    <CheckCircle2
                                        size={17}
                                        className="text-emerald-500 shrink-0 mt-0.5"
                                        strokeWidth={2.5}
                                    />
                                    {b}
                                </motion.li>
                            ))}
                        </ul>

                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Link
                                href="/nfc-service"
                                className="
                                    inline-flex items-center gap-2 px-6 py-3 rounded-xl
                                    bg-[#171A21] dark:bg-[#92BCEA]
                                    text-white dark:text-[#171A21]
                                    text-sm font-bold
                                    hover:opacity-90 transition-all duration-200
                                    shadow-lg shadow-black/10 dark:shadow-[#92BCEA]/20
                                "
                            >
                                Order Your Card <ArrowRight size={15} />
                            </Link>
                        </motion.div>
                    </motion.div>

                    {/* ── Right: Flip Card ── */}
                    <motion.div
                        initial={{ opacity: 0, x: 28 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                        className="flex-1 min-w-0 flex items-center justify-center w-full"
                    >
                        <NFCFlipCard />
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
