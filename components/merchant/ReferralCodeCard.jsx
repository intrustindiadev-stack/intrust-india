'use client';

import { useState } from 'react';
import { Copy, Check, Share2, Sparkles, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReferralCodeCard({ referralCode, prizeRupees = 200 }) {
    const [copied, setCopied] = useState(false);
    const shareUrl = `https://intrustindia.com/merchant-apply?ref=${referralCode || ''}`;

    const handleCopy = () => {
        if (!referralCode) return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success('Referral link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (!referralCode) return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join InTrust India as a Partner',
                    text: `Grow your business with InTrust India! Use my referral code: ${referralCode}`,
                    url: shareUrl,
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error sharing:', err);
                }
            }
        } else {
            handleCopy();
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden backdrop-blur-md">
            {/* Transparent geometric illustration in background */}
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 pointer-events-none opacity-5 dark:opacity-10">
                <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#D4AF37]">
                    <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="3" />
                    <circle cx="100" cy="30" r="14" fill="currentColor" />
                    <circle cx="170" cy="100" r="12" fill="currentColor" />
                    <circle cx="100" cy="170" r="10" fill="currentColor" />
                    <circle cx="30" cy="100" r="12" fill="currentColor" />
                    <path d="M100 44V88M100 112V160M42 100H88M112 100H158" stroke="currentColor" strokeWidth="2" />
                </svg>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                        <Sparkles size={13} className="text-amber-500" />
                        Exclusive Referral Link
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Invite Merchants & Grow Together
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                        Share your partner referral code. You&apos;ll receive <span className="font-semibold text-slate-800 dark:text-slate-200">₹{prizeRupees} instant wallet credit</span> when your invited merchant joins and subscribes.
                    </p>
                </div>

                {/* Referral Code Badge */}
                <div className="shrink-0 bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 sm:p-4 text-center min-w-[200px]">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Your Unique Code
                    </div>
                    <div className="font-mono text-2xl font-extrabold text-[#D4AF37] tracking-wider select-all">
                        {referralCode || 'GENERATING'}
                    </div>
                </div>
            </div>

            <div className="relative z-10 mt-6 pt-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-300 font-mono truncate select-all">
                    {shareUrl}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleCopy}
                        disabled={!referralCode}
                        className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15 active:scale-95 transition-all disabled:opacity-50"
                        title="Copy Referral Link"
                    >
                        {copied ? (
                            <>
                                <Check size={16} className="text-emerald-500" />
                                <span>Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy size={16} />
                                <span>Copy Link</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleShare}
                        disabled={!referralCode}
                        className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#c49f2e] text-slate-950 font-bold active:scale-95 transition-all disabled:opacity-50 shadow-sm"
                        title="Share via System Dialog"
                    >
                        <Share2 size={16} />
                        <span>Share</span>
                    </button>

                    <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Grow your business with InTrust India! Use my referral code: ${referralCode || ''} ${shareUrl}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebd59] text-white font-semibold active:scale-95 transition-all shadow-sm ${!referralCode ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                        title="Share on WhatsApp"
                    >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        <span>WhatsApp</span>
                    </a>
                </div>
            </div>
        </div>
    );
}

