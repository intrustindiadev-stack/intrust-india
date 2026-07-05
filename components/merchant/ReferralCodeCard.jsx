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
                console.error('Error sharing:', err);
            }
        } else {
            handleCopy();
        }
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
                
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleCopy}
                        disabled={!referralCode}
                        className="flex-1 sm:flex-initial px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-white/5 text-white border border-white/10 hover:bg-white/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    
                    <button
                        onClick={handleShare}
                        disabled={!referralCode}
                        className="flex-1 sm:flex-initial px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-[#D4AF37] text-[#020617] hover:bg-[#B8860B] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#D4AF37]/20"
                    >
                        <Share2 size={18} />
                        Share Link
                    </button>

                    <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Grow your business with InTrust India! Use my referral code: ${referralCode || ''} ${shareUrl}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-1 sm:flex-initial px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-[#25D366] text-white hover:bg-[#128C7E] active:scale-95 shadow-lg shadow-[#25D366]/20 ${!referralCode ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                    >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        WhatsApp
                    </a>
                </div>
            </div>
            
            <div className="mt-4 text-xs text-gray-500 font-mono break-all text-center sm:text-left">
                {shareUrl}
            </div>
        </div>
    );
}
