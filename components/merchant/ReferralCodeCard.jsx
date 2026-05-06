'use client';

import { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';

export default function ReferralCodeCard({ referralCode }) {
    const [copied, setCopied] = useState(false);
    const shareUrl = `https://intrustindia.com/merchant-apply?ref=${referralCode || ''}`;

    const handleCopy = () => {
        if (!referralCode) return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-gradient-to-br from-[#1a1c23] to-[#2d3748] rounded-2xl p-6 shadow-xl border border-white/10 relative overflow-hidden">
            {/* Subtle glow effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/20 rounded-full blur-[50px] -mr-16 -mt-16 pointer-events-none" />
            
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Share2 className="text-[#D4AF37]" size={20} />
                My Referral Code
            </h3>
            <p className="text-gray-400 text-sm mb-6">
                Share this link with other businesses. You'll earn cash prizes when they join and subscribe!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-lg font-bold text-[#D4AF37] tracking-wider text-center sm:text-left flex items-center justify-center sm:justify-start">
                    {referralCode || 'Generating...'}
                </div>
                
                <button
                    onClick={handleCopy}
                    disabled={!referralCode}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-[#D4AF37] text-[#020617] hover:bg-[#B8860B] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {copied ? (
                        <>
                            <Check size={18} />
                            Copied!
                        </>
                    ) : (
                        <>
                            <Copy size={18} />
                            Copy Link
                        </>
                    )}
                </button>
            </div>
            
            <div className="mt-4 text-xs text-gray-500 font-mono break-all text-center sm:text-left">
                {shareUrl}
            </div>
        </div>
    );
}
