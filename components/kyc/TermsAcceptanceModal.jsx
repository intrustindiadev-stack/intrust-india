'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, FileText, Loader2, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function TermsAcceptanceModal({ open, doc, loading, onClose, onAccept, alreadyAccepted = false }) {
    const scrollRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const [scrolledToEnd, setScrolledToEnd] = useState(false);
    const [checked, setChecked] = useState(false);
    const [accepting, setAccepting] = useState(false);

    useEffect(() => {
        if (open) {
            // If the user is re-reading after already accepting, keep the
            // checkbox checked and treat the document as fully read so they
            // can close/re-accept without having to scroll through again.
            const wasAccepted = alreadyAccepted === true;
            setProgress(wasAccepted ? 100 : 0);
            setScrolledToEnd(wasAccepted);
            setChecked(wasAccepted);
            setAccepting(false);
            if (!wasAccepted) {
                requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }));
            }
        }
    }, [open, doc?.version, alreadyAccepted]);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open ]);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const max = el.scrollHeight - el.clientHeight;
        // 50px tolerance buffer to solve mobile sub-pixel and safe-area calculation issues
        const isBottom = max <= 0 || Math.ceil(el.scrollTop + el.clientHeight) >= (el.scrollHeight - 50);

        if (isBottom) {
            setProgress(100);
            setScrolledToEnd(true);
        } else if (!scrolledToEnd) {
            const pct = max <= 0 ? 100 : Math.min(100, Math.round((el.scrollTop / max) * 100));
            setProgress(pct);
        }
    };

    // Check if content fits without scrolling once loaded
    useEffect(() => {
        if (open && !loading && !alreadyAccepted) {
            const checkFits = () => {
                const el = scrollRef.current;
                if (!el) return;
                const max = el.scrollHeight - el.clientHeight;
                const isBottom = max <= 0 || Math.ceil(el.scrollTop + el.clientHeight) >= (el.scrollHeight - 50);
                if (isBottom) {
                    setProgress(100);
                    setScrolledToEnd(true);
                }
            };

            const rafId = requestAnimationFrame(checkFits);
            const timerId = setTimeout(checkFits, 120);
            return () => {
                cancelAnimationFrame(rafId);
                clearTimeout(timerId);
            };
        }
    }, [open, loading, alreadyAccepted, doc?.body_markdown]);

    const canAccept = scrolledToEnd && checked && !accepting && !loading;
    const handleAccept = async () => {
        if (!canAccept) return;
        setAccepting(true);
        try { await onAccept(); } finally { setAccepting(false); }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-6"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
                    <motion.div
                        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
                        role="dialog" aria-modal="true" aria-label="Terms and conditions">
                        <div className="bg-[#0e1a3a] px-5 sm:px-7 pt-5 pb-4 shrink-0">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-2xl bg-white/10">
                                        <ShieldCheck size={22} className="text-emerald-300" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300">Intrust India - KYC Agreement</p>
                                        <h2 className="text-white font-extrabold text-base sm:text-lg leading-tight">{doc?.title || 'Terms & Consent'}</h2>
                                    </div>
                                </div>
                                <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="h-1.5 mt-3 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-blue-500 transition-all duration-150" style={{ width: progress + '%' }} />
                            </div>
                        </div>
                        <div
                            ref={scrollRef}
                            onScroll={handleScroll}
                            onTouchMove={handleScroll}
                            onTouchEnd={handleScroll}
                            className="terms-scroll flex-1 px-5 sm:px-7 py-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300 min-h-[220px]"
                        >
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                                    <Loader2 className="animate-spin" size={28} />
                                    <p className="text-xs font-semibold">Loading latest terms…</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <ReactMarkdown>{doc?.body_markdown || ''}</ReactMarkdown>
                                </div>
                            )}
                            {!loading && !scrolledToEnd && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const el = scrollRef.current;
                                        if (el) {
                                            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                                        }
                                    }}
                                    className="mt-5 w-full text-center text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 transition-colors cursor-pointer"
                                >
                                    <span>Scroll to the bottom to unlock acceptance ({progress}% read)</span>
                                    <span className="text-xs font-black">↓</span>
                                </button>
                            )}
                            {!loading && scrolledToEnd && (
                                <p className="mt-5 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle size={15} /> Full document read.
                                </p>
                            )}
                        </div>
                        <div className="shrink-0 border-t border-slate-100 dark:border-white/10 px-5 sm:px-7 py-4 bg-slate-50/80 dark:bg-slate-950/40">
                            <label
                                className={`flex items-start gap-3 p-3 rounded-2xl border transition-all duration-200 select-none ${
                                    !scrolledToEnd
                                        ? 'opacity-50 cursor-not-allowed border-slate-200/70 dark:border-white/5 bg-slate-100/60 dark:bg-white/[0.02]'
                                        : 'cursor-pointer border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-blue-400 dark:hover:border-white/20'
                                }`}
                                onClick={(e) => {
                                    if (!scrolledToEnd) {
                                        e.preventDefault();
                                    }
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={!scrolledToEnd}
                                    onChange={(e) => setChecked(e.target.checked)}
                                    className={`mt-0.5 w-5 h-5 rounded accent-blue-600 transition-opacity ${
                                        !scrolledToEnd ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                                    }`}
                                />
                                <span
                                    className={`text-xs sm:text-sm leading-relaxed transition-colors ${
                                        !scrolledToEnd ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    I have read <strong>{doc?.title} ({doc?.version})</strong> and agree to be bound by it. Intrust India may record this acceptance with timestamp, IP, and a signed PDF copy.
                                </span>
                            </label>
                            <div className="flex gap-3 mt-3">
                                <button onClick={onClose} className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-white/15 text-sm font-bold text-slate-600 dark:text-slate-300">
                                    {alreadyAccepted ? 'Close' : 'Decline'}
                                </button>
                                <button onClick={handleAccept} disabled={!canAccept} className="flex-[2] py-3.5 rounded-xl text-sm font-extrabold text-white bg-gradient-to-r from-blue-600 to-blue-800 disabled:opacity-40 flex items-center justify-center gap-2">
                                    {accepting ? (<><Loader2 size={17} className="animate-spin" /> Generating signed copy…</>) : (<><FileText size={17} /> {alreadyAccepted ? 'Confirm Acceptance' : 'Accept & Continue'}</>)}
                                </button>
                            </div>
                            {!scrolledToEnd && (<p className="text-center text-[11px] font-semibold text-amber-600 mt-2">Version {doc?.version || '—'} — scroll fully to unlock checkbox</p>)}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

