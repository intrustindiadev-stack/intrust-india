'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Copy, Check, MessageCircle, Send, Facebook, Linkedin,
    Gift, ExternalLink, Share2, Sparkles
} from 'lucide-react';
import SuccessAnimationModal from './animations/SuccessAnimationModal';
import { supabase } from '@/lib/supabaseClient';

// ─── Platform share helpers (each opens a new tab with the right URL) ────────

function buildWhatsAppUrl(text) {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function buildTelegramUrl(url, text) {
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

function buildTwitterUrl(url, text) {
    return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

function buildFacebookUrl(url) {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

function buildLinkedInUrl(url) {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

// ─── Try to share with product image file via Web Share API ──────────────────
async function fetchImageFile(imageUrl, productId) {
    if (!imageUrl) return null;
    try {
        const res = await fetch(imageUrl);
        if (!res.ok) return null;
        const blob = await res.blob();
        const mimeType = blob.type || 'image/jpeg';
        const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
        return new File([blob], `intrust-deal-${productId || 'offer'}.${ext}`, { type: mimeType });
    } catch {
        return null;
    }
}

async function nativeShare(imgFile, title, text, url) {
    if (typeof navigator === 'undefined' || !navigator.share) return false;
    try {
        const payload = { title, text, url };
        if (imgFile && navigator.canShare?.({ files: [imgFile] })) {
            payload.files = [imgFile];
        }
        await navigator.share(payload);
        return true;
    } catch (err) {
        if (err.name === 'AbortError') return true; // User cancelled — treat as shared
        return false;
    }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ShareModal({
    isOpen,
    onClose,
    product,
    user,
    merchant,
    rewardsConfig
}) {
    const [copied, setCopied]               = useState(false);
    const [shortCode, setShortCode]         = useState('');
    const [loading, setLoading]             = useState(false);
    const [sharing, setSharing]             = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [imgFile, setImgFile]             = useState(null);
    const [imgPreviewOk, setImgPreviewOk]   = useState(true);

    const registrationBonus = Math.round(
        (rewardsConfig?.campaign_share_bonus_paise
        || rewardsConfig?.referral_registration_bonus_paise
        || 5000) / 100
    );
    const orderCashback = Math.round(
        (product?.promo_cashback_paise
        || product?.referral_cashback_paise
        || rewardsConfig?.product_promo_default_cashback_paise
        || rewardsConfig?.referral_order_default_cashback_paise
        || 10000) / 100
    );

    // ── Generate / fetch share code on open ──────────────────────────────────
    useEffect(() => {
        if (!isOpen || !product?.id || !user?.id) return;
        let cancelled = false;

        const initLink = async () => {
            setLoading(true);
            try {
                const isValidUUID = (s) =>
                    typeof s === 'string' &&
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
                const safeProductId = isValidUUID(product.id) ? product.id : null;

                let query = supabase
                    .from('marketing_share_links')
                    .select('code')
                    .eq('user_id', user.id);
                query = safeProductId
                    ? query.eq('product_id', safeProductId)
                    : query.is('product_id', null);

                const { data: existing } = await query.maybeSingle();
                if (cancelled) return;

                if (existing?.code) {
                    setShortCode(existing.code);
                } else {
                    const generatedCode = Math.random().toString(36).substring(2, 9).toUpperCase();
                    const { data: created, error } = await supabase
                        .from('marketing_share_links')
                        .insert({
                            user_id: user.id,
                            user_type: merchant?.id ? 'merchant' : 'customer',
                            merchant_id: merchant?.id || null,
                            product_id: safeProductId,
                            product_type: product.is_merchant_inventory ? 'merchant' : 'platform',
                            code: generatedCode,
                            source: 'direct',
                            shares_count: 1
                        })
                        .select('code')
                        .single();
                    if (!cancelled) setShortCode(!error && created ? created.code : generatedCode);
                }
            } catch {
                if (!cancelled) setShortCode('REF' + Math.floor(1000 + Math.random() * 9000));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        initLink();
        return () => { cancelled = true; };
    }, [isOpen, product?.id, user?.id, merchant?.id]);

    // ── Pre-fetch image file for native share ─────────────────────────────────
    useEffect(() => {
        if (!isOpen || !product) return;
        const imgUrl = product.image || product.image_url;
        if (!imgUrl) return;
        fetchImageFile(imgUrl, product.id).then(f => setImgFile(f));
    }, [isOpen, product?.id]);

    // ── Close on Escape ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !product) return null;

    const origin     = typeof window !== 'undefined' ? window.location.origin : 'https://intrust.in';
    const shareUrl   = `${origin}/r/${shortCode || 'LOADING'}`;
    const prodPrice  = product.price || (product.selling_price_paise ? Math.round(product.selling_price_paise / 100) : 249);
    const prodTitle  = product.name || product.title || 'Verified Deal';
    const prodImage  = product.image || product.image_url;

    // ── Formatted share message ────────────────────────────────────────────────
    // Single clean message: image shows as OG preview from the /r/[code] route
    const shareText = `🛍️ *${prodTitle}*\n💰 Price: ₹${prodPrice}\n\n🎁 Earn ₹${registrationBonus} cashback when a friend joins\n🎁 Earn ₹${orderCashback} cashback when they order\n\n🔗 Get the deal here → ${shareUrl}`;
    const shareTitleShort = `${prodTitle} — ₹${prodPrice} on InTrust`;

    // ── Fire SHARE event (non-blocking) ───────────────────────────────────────
    const trackShare = useCallback(async () => {
        if (!shortCode) return;
        try {
            await supabase.rpc('process_marketing_conversion_reward', {
                p_event_type: 'SHARE',
                p_ref_code: shortCode,
                p_converted_user_id: user?.id,
                p_product_id: product?.id || null
            });
            // Increment shares_count locally in DB
            await supabase
                .from('marketing_share_links')
                .update({ shares_count: supabase.rpc ? undefined : 1 })
                .eq('code', shortCode)
                .then(() => {});
        } catch { /* non-critical */ }
        setShowSuccessModal(true);
    }, [shortCode, user?.id, product?.id]);

    const handleCopy = () => {
        if (typeof navigator === 'undefined') return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
        trackShare();
    };

    // ── Per-channel share handlers ────────────────────────────────────────────
    const shareChannel = async (channelFn) => {
        if (sharing) return;
        setSharing(true);
        try {
            // Try native share with image first (best UX on mobile)
            const shared = await nativeShare(imgFile, shareTitleShort, shareText, shareUrl);
            if (!shared) {
                // Fall back to platform-specific URL
                window.open(channelFn(), '_blank', 'noopener,noreferrer');
            }
            trackShare();
        } finally {
            setSharing(false);
        }
    };

    const shareWhatsApp  = () => shareChannel(() => buildWhatsAppUrl(shareText));
    const shareTelegram  = () => shareChannel(() => buildTelegramUrl(shareUrl, shareText));
    const shareTwitter   = () => shareChannel(() => buildTwitterUrl(shareUrl, shareTitleShort + ' #InTrust #Deals'));
    const shareFacebook  = () => shareChannel(() => buildFacebookUrl(shareUrl));
    const shareLinkedIn  = () => shareChannel(() => buildLinkedInUrl(shareUrl));
    const shareNative    = () => shareChannel(() => buildWhatsAppUrl(shareText)); // fallback

    // ── Social channel buttons config ─────────────────────────────────────────
    const channels = [
        { id: 'whatsapp',  label: 'WhatsApp',  icon: <MessageCircle size={20} />, color: 'bg-emerald-500 hover:bg-emerald-600', fn: shareWhatsApp },
        { id: 'telegram',  label: 'Telegram',  icon: <Send size={20} />,          color: 'bg-sky-500 hover:bg-sky-600',         fn: shareTelegram },
        { id: 'twitter',   label: 'X / Twitter', icon: <span className="font-black text-base leading-none">𝕏</span>, color: 'bg-slate-900 hover:bg-black', fn: shareTwitter },
        { id: 'facebook',  label: 'Facebook',  icon: <Facebook size={20} />,      color: 'bg-blue-600 hover:bg-blue-700',       fn: shareFacebook },
        { id: 'linkedin',  label: 'LinkedIn',  icon: <Linkedin size={20} />,      color: 'bg-blue-700 hover:bg-blue-800',       fn: shareLinkedIn },
        { id: 'more',      label: sharing ? '…' : 'More',  icon: <Share2 size={20} />,       color: 'bg-violet-600 hover:bg-violet-700',   fn: shareNative },
    ];

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm cursor-pointer"
            >
                <motion.div
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="relative w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800 cursor-default"
                >
                    {/* ── CLOSE BUTTON ───────────────────────────── */}
                    <button
                        onClick={onClose}
                        className="absolute top-3.5 right-3.5 z-20 p-1.5 rounded-full bg-white/80 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white shadow-xs transition-colors cursor-pointer"
                    >
                        <X size={16} strokeWidth={2.5} />
                    </button>

                    {/* ── PRODUCT IMAGE — full-width hero ─────────── */}
                    {prodImage && imgPreviewOk ? (
                        <div className="relative w-full bg-slate-100 dark:bg-slate-800" style={{ aspectRatio: '16/9' }}>
                            <img
                                src={prodImage}
                                alt={prodTitle}
                                className="w-full h-full object-contain"
                                onError={() => setImgPreviewOk(false)}
                            />
                            {/* Gradient to blend into card */}
                            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
                        </div>
                    ) : (
                        <div className="w-full h-28 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                            <Sparkles size={32} className="text-blue-400" />
                        </div>
                    )}

                    {/* ── CONTENT ──────────────────────────────────── */}
                    <div className="px-4 pb-5 pt-1 space-y-3.5">

                        {/* Product name + price */}
                        <div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug line-clamp-2">
                                {prodTitle}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-lg font-black text-slate-900 dark:text-white">₹{prodPrice}</span>
                                {product.discount_percent > 0 && (
                                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                        {product.discount_percent}% OFF
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Cashback reward badges */}
                        <div className="flex gap-2">
                            <div className="flex-1 flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60">
                                <Gift size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[9px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider leading-none">New User Joins</p>
                                    <p className="text-xs font-black text-emerald-900 dark:text-emerald-200">Assured Cashback</p>
                                </div>
                            </div>
                            <div className="flex-1 flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60">
                                <Gift size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[9px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider leading-none">They Order</p>
                                    <p className="text-xs font-black text-blue-900 dark:text-blue-200">Instant Cashback</p>
                                </div>
                            </div>
                        </div>

                        {/* Share link — clickable anchor */}
                        <div className="flex items-center gap-2">
                            <a
                                href={loading ? undefined : shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 truncate hover:underline"
                            >
                                <ExternalLink size={11} className="shrink-0 text-slate-400" />
                                {loading ? 'Generating link…' : shareUrl}
                            </a>
                            <button
                                onClick={handleCopy}
                                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                            >
                                {copied ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />}
                                <span>{copied ? 'Copied!' : 'Copy'}</span>
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Share via</span>
                            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                        </div>

                        {/* Social channel grid — each shares image + text + link */}
                        <div className="grid grid-cols-3 gap-2">
                            {channels.map((ch) => (
                                <button
                                    key={ch.id}
                                    onClick={ch.fn}
                                    disabled={sharing || loading}
                                    className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl ${ch.color} text-white text-[10px] font-bold transition-all active:scale-95 shadow-xs disabled:opacity-60 cursor-pointer`}
                                >
                                    <span className="flex items-center justify-center w-5 h-5">{ch.icon}</span>
                                    <span className="leading-none">{ch.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Footer note */}
                        <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 font-medium">
                            Product image + deal link included with every share
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Success celebration */}
            <SuccessAnimationModal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    onClose();
                }}
                productName={prodTitle}
                sharesCount={10}
            />
        </>
    );
}
