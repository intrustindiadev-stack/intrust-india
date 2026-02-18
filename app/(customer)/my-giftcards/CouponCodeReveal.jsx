'use client';

import { useState } from 'react';
import { Eye, EyeOff, Copy, Check, Loader2 } from 'lucide-react';

export default function CouponCodeReveal({ couponId }) {
    const [revealedCode, setRevealedCode] = useState(null);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const toggleReveal = async () => {
        // If already revealed, hide it
        if (revealedCode) {
            setRevealedCode(null);
            return;
        }

        // If not revealed, decrypt it
        try {
            setIsDecrypting(true);

            const response = await fetch(`/api/my-coupons/${couponId}/decrypt`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to decrypt code');
            }

            setRevealedCode(data.encrypted_code);
        } catch (err) {
            console.error('Error decrypting code:', err);
            alert(err.message || 'Failed to decrypt code');
        } finally {
            setIsDecrypting(false);
        }
    };

    const copyCode = () => {
        if (!revealedCode) return;
        navigator.clipboard.writeText(revealedCode);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="mb-6">
            <div className="text-sm font-semibold text-gray-900 mb-3">Coupon Code</div>
            <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-mono text-base font-bold text-gray-900">
                    {revealedCode ? revealedCode : '••••••••••••'}
                </div>
                <button
                    onClick={toggleReveal}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all disabled:opacity-50"
                    disabled={isDecrypting}
                >
                    {isDecrypting ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : revealedCode ? (
                        <EyeOff size={20} />
                    ) : (
                        <Eye size={20} />
                    )}
                </button>

                {revealedCode && (
                    <button
                        onClick={copyCode}
                        className="p-3 bg-[#92BCEA]/10 hover:bg-[#92BCEA]/20 text-[#92BCEA] rounded-2xl transition-all"
                    >
                        {isCopied ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                )}
            </div>
        </div>
    );
}
