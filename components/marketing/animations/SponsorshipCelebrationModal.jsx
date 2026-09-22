'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, 
    X, 
    Calendar, 
    ShoppingBag, 
    Coins, 
    Share2, 
    Sparkles, 
    ArrowRight, 
    Clock, 
    Copy, 
    Check,
    Megaphone,
    Store
} from 'lucide-react';
import Confetti from 'react-confetti';
import Image from 'next/image';
import MegaphoneSponsorVector from '../graphics/MegaphoneSponsorVector';

export default function SponsorshipCelebrationModal({
    isOpen,
    onClose,
    bookingDetails = {
        sponsorDate: '2026-09-25',
        products: [],
        feePaidRupees: 999,
        merchantName: 'Partner Store',
        campaignMessage: ''
    }
}) {
    const [copied, setCopied] = useState(false);
    const [windowDimension, setWindowDimension] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
        }
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sponsorDateObj = new Date(bookingDetails?.sponsorDate || Date.now());
    const formattedDate = sponsorDateObj.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const diffDays = Math.max(1, Math.ceil((sponsorDateObj - new Date()) / (1000 * 60 * 60 * 24)));

    const announcementText = `🎉 We are proud to sponsor the InTrust Daily Challenge on ${formattedDate}! Play today's trivia quiz on InTrust, win instant cashback, and shop our exclusive products. Check it out at https://intrust.in/marketing/daily-challenge`;

    const handleCopyAnnouncement = () => {
        if (typeof navigator !== 'undefined') {
            navigator.clipboard.writeText(announcementText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleShareWhatsApp = () => {
        const text = encodeURIComponent(announcementText);
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    };

    return (
        <div 
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md cursor-pointer overflow-y-auto"
        >
            <Confetti
                width={windowDimension.width}
                height={windowDimension.height}
                recycle={false}
                numberOfPieces={220}
                gravity={0.25}
                colors={['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#6366F1', '#EAB308']}
            />

            <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200/80 dark:border-slate-800 text-center max-h-[92vh] overflow-y-auto cursor-default space-y-5 my-auto"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                    <X size={18} />
                </button>

                {/* 3D Animated Megaphone Vector */}
                <div className="flex justify-center -mt-2">
                    <MegaphoneSponsorVector animated={true} className="w-36 h-36 sm:w-44 sm:h-44" />
                </div>

                {/* Headline & Countdown Badge */}
                <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
                        <Clock size={12} className="animate-spin" style={{ animationDuration: '6s' }} />
                        <span>Goes Live in {diffDays} {diffDays === 1 ? 'Day' : 'Days'}</span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        Sponsorship Confirmed! 🎉
                    </h2>

                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
                        Your brand spotlight is officially locked in for{' '}
                        <strong className="text-slate-900 dark:text-white font-bold">{formattedDate}</strong>.
                    </p>
                </div>

                {/* Cashback Incentive Impact Card */}
                <div className="bg-gradient-to-br from-blue-500/5 via-indigo-500/10 to-amber-500/5 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-amber-950/20 border border-blue-500/20 rounded-2xl p-3.5 sm:p-4 text-left space-y-2 shadow-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <Coins size={15} />
                        </div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">
                            High-Intent Shopper Attraction Engine
                        </h4>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Your fee of <strong className="text-blue-600 dark:text-blue-400 font-bold">₹{bookingDetails?.feePaidRupees || 999}</strong> funds instant ₹25 cashbacks for quiz winners. Winners receive direct recommendation prompts to redeem their cashback on your featured products!
                    </p>
                </div>

                {/* Featured Products Preview */}
                {bookingDetails?.products && bookingDetails.products.length > 0 && (
                    <div className="text-left space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                Featured Showcase ({bookingDetails.products.length})
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                ✓ Quiz Spotlight
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {bookingDetails.products.slice(0, 3).map((p) => (
                                <div key={p.id} className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-2 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 relative">
                                        <Image
                                            src={p.image_url || p.image || '/icons/intrustLogo.png'}
                                            alt={p.product_name || p.title || 'Product'}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h5 className="text-[10px] font-black text-slate-900 dark:text-white truncate">
                                            {p.product_name || p.title}
                                        </h5>
                                        <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400">
                                            ₹{p.price || 199}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Shareable Announcement Pass */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 text-left space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Announce on Social Media
                        </span>
                        <button
                            onClick={handleCopyAnnouncement}
                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copied ? 'Copied' : 'Copy Text'}</span>
                        </button>
                    </div>

                    <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 line-clamp-2">
                        {announcementText}
                    </div>

                    <button
                        onClick={handleShareWhatsApp}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-xs"
                    >
                        <Share2 size={14} />
                        <span>Post to WhatsApp Status</span>
                    </button>
                </div>

                {/* Primary Dismiss Button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
                >
                    View in Calendar & Marketing Hub →
                </button>
            </motion.div>
        </div>
    );
}
