'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    X, 
    Copy, 
    Check, 
    Share2, 
    MessageCircle, 
    Instagram, 
    Facebook, 
    Sparkles,
    Gift,
    ExternalLink
} from 'lucide-react';
import SuccessAnimationModal from './animations/SuccessAnimationModal';
import { supabase } from '@/lib/supabaseClient';

export default function ShareModal({ 
    isOpen, 
    onClose, 
    product, 
    user,
    merchant,
    rewardsConfig
}) {
    const [copied, setCopied] = useState(false);
    const [shortCode, setShortCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const registrationBonus = (rewardsConfig?.campaign_share_bonus_paise || rewardsConfig?.referral_registration_bonus_paise || 5000) / 100;
    const orderCashback = ((product?.promo_cashback_paise || product?.referral_cashback_paise || rewardsConfig?.product_promo_default_cashback_paise || rewardsConfig?.referral_order_default_cashback_paise || 10000) / 100);

    // Generate/fetch code on open
    useEffect(() => {
        if (!isOpen || !product?.id || !user?.id) return;

        const initLink = async () => {
            setLoading(true);
            try {
                // Check if existing link exists for user + product
                const { data: existing } = await supabase
                    .from('marketing_share_links')
                    .select('code')
                    .eq('user_id', user.id)
                    .eq('product_id', product.id)
                    .maybeSingle();

                if (existing?.code) {
                    setShortCode(existing.code);
                } else {
                    // Generate a 7-character clean alphanumeric code
                    const generatedCode = Math.random().toString(36).substring(2, 9).toUpperCase();
                    const isMerchant = !!merchant?.id;

                    const { data: created, error } = await supabase
                        .from('marketing_share_links')
                        .insert({
                            user_id: user.id,
                            user_type: isMerchant ? 'merchant' : 'customer',
                            merchant_id: isMerchant ? merchant.id : null,
                            product_id: product.id,
                            product_type: product.is_merchant_inventory ? 'merchant' : 'platform',
                            code: generatedCode,
                            source: 'direct',
                            shares_count: 1
                        })
                        .select('code')
                        .single();

                    if (!error && created) {
                        setShortCode(created.code);
                    } else {
                        setShortCode(generatedCode);
                    }
                }
            } catch (err) {
                console.error('Error generating share link:', err);
                setShortCode('REF' + Math.floor(1000 + Math.random() * 9000));
            } finally {
                setLoading(false);
            }
        };

        initLink();
    }, [isOpen, product?.id, user?.id, merchant?.id]);

    if (!isOpen || !product) return null;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://intrust.in';
    const shareUrl = `${origin}/r/${shortCode || '7K92XA'}`;

    const handleCopy = () => {
        if (typeof navigator !== 'undefined') {
            navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            triggerSuccessDispatch();
        }
    };

    const triggerSuccessDispatch = async () => {
        // Record share event
        try {
            if (shortCode) {
                await supabase.rpc('process_marketing_conversion_reward', {
                    p_event_type: 'SHARE',
                    p_ref_code: shortCode,
                    p_converted_user_id: user?.id,
                    p_product_id: product.id
                });
            }
        } catch (e) {
            // Non-critical
        }
        setShowSuccessModal(true);
    };

    const shareToWhatsApp = () => {
        const text = encodeURIComponent(
            `Check out ${product.name || product.title} on InTrust India!\nSpecial Price: ₹${product.price || product.selling_price_paise / 100 || 249}\nBuy here: ${shareUrl}`
        );
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
        triggerSuccessDispatch();
    };

    const shareToFacebook = () => {
        const url = encodeURIComponent(shareUrl);
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
        triggerSuccessDispatch();
    };

    const shareNative = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: product.name || product.title,
                    text: `Special offer on InTrust: ${product.name || product.title}`,
                    url: shareUrl,
                });
                triggerSuccessDispatch();
            } catch (err) {
                // User cancelled or unsupported
            }
        } else {
            handleCopy();
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-slate-800 text-left overflow-hidden"
                >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                Product Marketing
                            </span>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                                Share & Earn Rewards
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Product Summary Preview */}
                    <div className="py-4 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-black text-slate-400">ITEM</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                {product.name || product.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-black text-slate-900 dark:text-white">
                                    ₹{product.price || (product.selling_price_paise ? product.selling_price_paise / 100 : 249)}
                                </span>
                                {product.discount_percent && (
                                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                        {product.discount_percent}% OFF
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Rewards Teaser Box */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-3.5 mb-5 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Gift size={16} />
                        </div>
                        <div className="text-xs">
                            <span className="font-extrabold text-emerald-900 dark:text-emerald-300 block">
                                Dual Promotion Cashbacks
                            </span>
                            <p className="text-emerald-700 dark:text-emerald-400 text-[11px] leading-relaxed mt-0.5">
                                • Earn <strong className="font-black text-emerald-800 dark:text-emerald-200">₹{registrationBonus}</strong> when a new buyer registers through your campaign link.<br />
                                • Earn <strong className="font-black text-emerald-800 dark:text-emerald-200">₹{orderCashback}</strong> when they complete this product order!
                            </p>
                        </div>
                    </div>

                    {/* Share Link Copy Field */}
                    <div className="mb-5">
                        <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Attributed Share Link
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 truncate">
                                {loading ? 'Generating link...' : shareUrl}
                            </div>
                            <button
                                onClick={handleCopy}
                                className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                <span>{copied ? 'Copied' : 'Copy'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Instant Share Channels */}
                    <div>
                        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                            Quick Dispatch Channels
                        </span>
                        <div className="grid grid-cols-3 gap-2.5">
                            <button
                                onClick={shareToWhatsApp}
                                className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm active:scale-95 gap-1.5"
                            >
                                <MessageCircle size={20} />
                                <span>WhatsApp</span>
                            </button>

                            <button
                                onClick={shareToFacebook}
                                className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 gap-1.5"
                            >
                                <Facebook size={20} />
                                <span>Facebook</span>
                            </button>

                            <button
                                onClick={shareNative}
                                className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition-all shadow-sm active:scale-95 gap-1.5"
                            >
                                <Share2 size={20} />
                                <span>More Channels</span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Success Celebration Modal */}
            <SuccessAnimationModal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    onClose();
                }}
                productName={product.name || product.title}
                sharesCount={10}
            />
        </>
    );
}
