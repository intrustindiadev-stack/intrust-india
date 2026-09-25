'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Copy, Check, MessageCircle, Send, Facebook, Linkedin,
    Gift, ExternalLink, Share2, Sparkles
} from 'lucide-react';
import SuccessAnimationModal from './animations/SuccessAnimationModal';
import { supabase } from '@/lib/supabaseClient';

// ─── Platform share helpers (each opens a new tab with the right URL) ────────

// Each builder receives the share URL separately so it appears exactly once.
// shareText must NOT contain the URL — it is appended by the builder or passed
// as a separate param to the platform (prevents double-link on WhatsApp).

function buildWhatsAppUrl(text, url) {
    // WhatsApp: text + URL on a new line = one clean clickable preview
    return `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`;
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

// ─── Convert any image (including WebP) to clean JPEG for social apps ─────────
async function fetchImageFile(imageUrl, productId) {
    if (!imageUrl || typeof window === 'undefined') return null;
    try {
        const cleanName = `deal-${(productId || 'offer').toString().replace(/[^a-zA-Z0-9_-]/g, '')}.jpg`;

        // 1. Fetch source blob
        const res = await fetch(imageUrl, { mode: 'cors' }).catch(() => null);
        if (!res || !res.ok) return null;
        const sourceBlob = await res.blob();

        // 2. If it is already clean JPEG or PNG and not WebP, return directly
        if ((sourceBlob.type === 'image/jpeg' || sourceBlob.type === 'image/png') && !sourceBlob.type.includes('webp')) {
            const ext = sourceBlob.type === 'image/png' ? 'png' : 'jpg';
            return new File([sourceBlob], `deal-${productId || 'offer'}.${ext}`, { type: sourceBlob.type });
        }

        // 3. Canvas transcode pipeline: Convert WebP / any image format to standard JPEG
        return await new Promise((resolve) => {
            const img = document.createElement('img');
            img.crossOrigin = 'anonymous';
            const blobUrl = URL.createObjectURL(sourceBlob);

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width || 600;
                    canvas.height = img.naturalHeight || img.height || 600;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        URL.revokeObjectURL(blobUrl);
                        return resolve(new File([sourceBlob], cleanName, { type: 'image/jpeg' }));
                    }

                    // Fill solid white background in case of transparent webp/png
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob(
                        (jpegBlob) => {
                            URL.revokeObjectURL(blobUrl);
                            if (jpegBlob) {
                                resolve(new File([jpegBlob], cleanName, { type: 'image/jpeg' }));
                            } else {
                                resolve(new File([sourceBlob], cleanName, { type: 'image/jpeg' }));
                            }
                        },
                        'image/jpeg',
                        0.92
                    );
                } catch {
                    URL.revokeObjectURL(blobUrl);
                    resolve(new File([sourceBlob], cleanName, { type: 'image/jpeg' }));
                }
            };

            img.onerror = () => {
                URL.revokeObjectURL(blobUrl);
                resolve(null);
            };

            img.src = blobUrl;
        });
    } catch {
        return null;
    }
}

// nativeShare is ONLY used by the "More" button — platform-specific buttons
// go direct to their URLs to avoid the double-link problem.
async function nativeShare(imgFile, title, text, url) {
    if (typeof navigator === 'undefined' || !navigator.share) return false;
    try {
        // text must NOT already contain the URL — pass url separately so the
        // OS share sheet appends it once in the standard position.
        const payload = { title, text, url };
        if (imgFile && navigator.canShare?.({ files: [imgFile] })) {
            payload.files = [imgFile];
        }
        await navigator.share(payload);
        return true;
    } catch (err) {
        if (err.name === 'AbortError') return true;
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
    rewardsConfig,
    onMetricUpdated
}) {
    const [copied, setCopied]               = useState(false);
    const [shortCode, setShortCode]         = useState('');
    const [linkMetrics, setLinkMetrics]     = useState({ shares: 1, clicks: 0, registrations: 0, orders: 0 });
    const [loading, setLoading]             = useState(false);
    const [sharing, setSharing]             = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [imgFile, setImgFile]             = useState(null);
    const [imgPreviewOk, setImgPreviewOk]   = useState(true);
    const [linkError, setLinkError]         = useState(null);
    const [retryCount, setRetryCount]       = useState(0);

    const [mounted, setMounted]             = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const prodTitle = product?.title || product?.product_name || product?.name || 'Exclusive Deal';
    const prodPrice = product?.price || product?.retail_price || product?.selling_price || 0;
    const prodImage = product?.image || product?.image_url || '';
    const origin = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin) : 'https://intrustindia.com';
    // Always use /r/{code} so clicks are tracked. Falls back to direct product URL.
    const shareUrl = shortCode ? `${origin}/r/${shortCode}` : `${origin}/shop/product/${product?.product_id || product?.id || ''}`;
    const shareTitleShort = `Check out ${prodTitle} on InTrust!`;
    // ⚠️ shareText must NOT contain the URL — each platform builder appends it
    // once in the correct position. This prevents the double-link bug.
    const shareText = `🔥 Special Deal: ${prodTitle} at just ₹${prodPrice}!\nOrder now and get exclusive cashback on InTrust.`;

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

    // ── Generate / fetch share code & authentic metrics on open ──────────────
    useEffect(() => {
        if (!isOpen || !product || !user?.id) return;
        let cancelled = false;

        const initLink = async () => {
            setLoading(true);
            setLinkError(null);
            try {
                const isValidUUID = (s) =>
                    typeof s === 'string' &&
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
                
                // For merchant items, resolve the genuine underlying product ID
                const rawId = product.product_id || product.id;
                const safeProductId = isValidUUID(rawId) ? rawId : null;

                let query = supabase
                    .from('marketing_share_links')
                    .select('id, code, clicks_count, shares_count, registrations_count, orders_count')
                    .eq('user_id', user.id);
                query = safeProductId
                    ? query.eq('product_id', safeProductId)
                    : query.is('product_id', null);

                const { data: existing } = await query.maybeSingle();
                if (cancelled) return;

                if (existing?.code) {
                    setShortCode(existing.code);
                    setLinkMetrics({
                        shares: Number(existing.shares_count || 1),
                        clicks: Number(existing.clicks_count || 0),
                        registrations: Number(existing.registrations_count || 0),
                        orders: Number(existing.orders_count || 0)
                    });
                } else {
                    const generateCryptoCode = () => {
                        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                        let code = '';
                        if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
                            const bytes = new Uint8Array(8);
                            window.crypto.getRandomValues(bytes);
                            for (let i = 0; i < 8; i++) code += chars[bytes[i] % chars.length];
                        } else {
                            for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
                        }
                        return code;
                    };

                    let created = null;
                    let lastErr = null;
                    for (let attempt = 0; attempt < 3; attempt++) {
                        const candidateCode = generateCryptoCode();
                        const { data, error } = await supabase
                            .from('marketing_share_links')
                            .insert({
                                user_id: user.id,
                                user_type: merchant?.id ? 'merchant' : 'customer',
                                merchant_id: merchant?.id || null,
                                product_id: safeProductId,
                                product_type: product.is_merchant_inventory ? 'merchant' : 'platform',
                                code: candidateCode,
                                source: 'direct',
                                shares_count: 1
                            })
                            .select('id, code, clicks_count, shares_count, registrations_count, orders_count')
                            .single();

                        if (!error && data) {
                            created = data;
                            break;
                        }
                        lastErr = error;
                        if (error?.code !== '23505') break; // Non-uniqueness error, don't spin
                    }

                    if (!cancelled) {
                        if (created?.code) {
                            setShortCode(created.code);
                            setLinkMetrics({
                                shares: Number(created?.shares_count || 1),
                                clicks: Number(created?.clicks_count || 0),
                                registrations: Number(created?.registrations_count || 0),
                                orders: Number(created?.orders_count || 0)
                            });
                        } else {
                            console.error('[ShareModal] Could not create share link:', lastErr);
                            setLinkError('Failed to generate tracking link. Please tap Retry.');
                        }
                    }
                }
            } catch (err) {
                console.error('[ShareModal] initLink failed:', err);
                if (!cancelled) setLinkError('Network error initializing link.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        initLink();
        return () => { cancelled = true; };
    }, [isOpen, product?.id, product?.product_id, user?.id, merchant?.id, retryCount]);

    // ── Pre-fetch & convert image file for native share (No WebP) ────────────
    useEffect(() => {
        if (!isOpen || !product) return;
        const imgUrl = product.image || product.image_url;
        if (!imgUrl) return;
        fetchImageFile(imgUrl, product.product_id || product.id).then(f => setImgFile(f));
    }, [isOpen, product?.id, product?.product_id]);

    // ── Close on Escape ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // ── Fire SHARE event & refresh real telemetry ─────────────────────────────
    const trackShare = useCallback(async () => {
        if (!shortCode || !product) return;
        try {
            const rawId = product.product_id || product.id;
            const safeProductId = typeof rawId === 'string' && rawId.length === 36 ? rawId : null;

            await supabase.rpc('process_marketing_referral_reward', {
                p_event_type: 'SHARE',
                p_ref_code: shortCode,
                p_converted_user_id: user?.id,
                p_product_id: safeProductId
            });

            // Re-fetch updated link metrics
            const { data: updatedLink } = await supabase
                .from('marketing_share_links')
                .select('shares_count, clicks_count, registrations_count, orders_count')
                .eq('code', shortCode)
                .maybeSingle();

            if (updatedLink) {
                const nextMetrics = {
                    shares: Number(updatedLink.shares_count || 1),
                    clicks: Number(updatedLink.clicks_count || 0),
                    registrations: Number(updatedLink.registrations_count || 0),
                    orders: Number(updatedLink.orders_count || 0)
                };
                setLinkMetrics(nextMetrics);
                if (onMetricUpdated) {
                    onMetricUpdated(rawId, nextMetrics);
                }
            } else {
                setLinkMetrics(prev => ({ ...prev, shares: prev.shares + 1 }));
            }
        } catch { /* non-critical */ }
        setShowSuccessModal(true);
    }, [shortCode, user?.id, product?.id, product?.product_id, onMetricUpdated]);

    const handleCopy = () => {
        if (typeof navigator === 'undefined') return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
        trackShare();
    };

    // ── Per-channel share handlers ────────────────────────────────────────────
    // Platform-specific buttons go DIRECTLY to the platform URL — no nativeShare().
    // nativeShare is reserved for the "More" button only. This prevents the
    // double-link bug where the URL appeared in both shareText and as the native
    // share `url` field.
    const shareDirect = async (urlFn) => {
        if (sharing) return;
        setSharing(true);
        try {
            window.open(urlFn(), '_blank', 'noopener,noreferrer');
            trackShare();
        } finally {
            setSharing(false);
        }
    };

    // "More" button — uses native OS share sheet (image + text + url separately)
    const shareNativeMore = async () => {
        if (sharing) return;
        setSharing(true);
        try {
            const shared = await nativeShare(imgFile, shareTitleShort, shareText, shareUrl);
            if (!shared) {
                window.open(buildWhatsAppUrl(shareText, shareUrl), '_blank', 'noopener,noreferrer');
            }
            trackShare();
        } finally {
            setSharing(false);
        }
    };

    const shareWhatsApp = () => shareDirect(() => buildWhatsAppUrl(shareText, shareUrl));
    const shareTelegram = () => shareDirect(() => buildTelegramUrl(shareUrl, shareText));
    const shareTwitter  = () => shareDirect(() => buildTwitterUrl(shareUrl, shareTitleShort + ' #InTrust #Deals'));
    const shareFacebook = () => shareDirect(() => buildFacebookUrl(shareUrl));
    const shareLinkedIn = () => shareDirect(() => buildLinkedInUrl(shareUrl));
    const shareNative   = shareNativeMore; // alias for channel config below

    // ── Social channel buttons config ─────────────────────────────────────────
    const channels = [
        { id: 'whatsapp',  label: 'WhatsApp',  icon: <MessageCircle size={20} />, color: 'bg-emerald-500 hover:bg-emerald-600', fn: shareWhatsApp },
        { id: 'telegram',  label: 'Telegram',  icon: <Send size={20} />,          color: 'bg-sky-500 hover:bg-sky-600',         fn: shareTelegram },
        { id: 'twitter',   label: 'X / Twitter', icon: <span className="font-black text-base leading-none">𝕏</span>, color: 'bg-slate-900 hover:bg-black', fn: shareTwitter },
        { id: 'facebook',  label: 'Facebook',  icon: <Facebook size={20} />,      color: 'bg-blue-600 hover:bg-blue-700',       fn: shareFacebook },
        { id: 'linkedin',  label: 'LinkedIn',  icon: <Linkedin size={20} />,      color: 'bg-blue-700 hover:bg-blue-800',       fn: shareLinkedIn },
        { id: 'more',      label: sharing ? '…' : 'More',  icon: <Share2 size={20} />,       color: 'bg-violet-600 hover:bg-violet-700',   fn: shareNative },
    ];

    if (!isOpen || !mounted) return null;

    const modalContent = (
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
                                {product?.discount_percent > 0 && (
                                    <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                        {product.discount_percent}% OFF
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Cashback reward badges */}
                        <div className="flex gap-2">
                            <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60">
                                <Gift size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider leading-none">New User Joins</p>
                                    <p className="text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-200 mt-0.5">Assured Cashback</p>
                                </div>
                            </div>
                            <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60">
                                <Gift size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider leading-none">They Order</p>
                                    <p className="text-xs sm:text-sm font-black text-blue-900 dark:text-blue-200 mt-0.5">Instant Cashback</p>
                                </div>
                            </div>
                        </div>

                        {/* Share link — clickable anchor or error retry */}
                        {linkError ? (
                            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs">
                                <span className="font-semibold text-rose-600 dark:text-rose-400">{linkError}</span>
                                <button
                                    onClick={() => setRetryCount(c => c + 1)}
                                    className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shrink-0"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <a
                                    href={loading ? undefined : shareUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="min-h-[44px] flex-1 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 truncate hover:underline"
                                >
                                    <ExternalLink size={13} className="shrink-0 text-slate-400" />
                                    <span className="truncate">{loading ? 'Generating link…' : shareUrl}</span>
                                </a>
                                <button
                                    onClick={handleCopy}
                                    disabled={loading || !shortCode}
                                    className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                                >
                                    {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
                                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                                </button>
                            </div>
                        )}

                        {/* Divider */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Share via</span>
                            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                        </div>

                        {/* Social channel grid — each shares image + text + link */}
                        <div className="grid grid-cols-3 gap-2">
                            {channels.map((ch) => (
                                <button
                                    key={ch.id}
                                    onClick={ch.fn}
                                    disabled={sharing || loading}
                                    className={`min-h-[48px] flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-2xl ${ch.color} text-white text-xs font-bold transition-all active:scale-95 shadow-xs disabled:opacity-60 cursor-pointer`}
                                >
                                    <span className="flex items-center justify-center w-5 h-5">{ch.icon}</span>
                                    <span className="leading-none mt-0.5">{ch.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Footer note */}
                        <p className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Product image + deal link included with every share
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Authentic Success & Link Telemetry Modal */}
            <SuccessAnimationModal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    onClose();
                }}
                productName={prodTitle}
                shortCode={shortCode}
                shareUrl={shareUrl}
                metrics={linkMetrics}
            />
        </>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
