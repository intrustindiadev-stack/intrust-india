'use client';
import { useEffect } from 'react';
import { X, Lightbulb, Info } from 'lucide-react';

export default function GuideInfoModal({ guide, open, onClose }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev || 'unset';
        };
    }, [open, onClose]);
    if (!guide || !open) return null;
    const badge = (tone) => tone === 'green'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : tone === 'red' ? 'bg-rose-50 text-rose-700 border-rose-200'
        : tone === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200'
        : tone === 'indigo' ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
        : 'bg-slate-100 text-slate-700 border-slate-200';
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
            <div className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-scaleUp">
                <div className="relative px-6 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br from-blue-50 via-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-t-3xl">
                    <button onClick={onClose} aria-label="Close guide" className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer">
                        <X size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                            <Info size={22} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">How this page works</p>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{guide.title}</h2>
                        </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-3">{guide.overview}</p>
                </div>
                <div className="p-6 flex flex-col gap-6">
                    {guide.keyActions?.length > 0 && (
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3">Do this</h3>
                            <ol className="space-y-3 list-decimal list-outside ml-4">
                                {guide.keyActions.map((a, i) => (
                                    <li key={i} className="text-sm pl-1">
                                        <span className="font-bold text-slate-800 dark:text-slate-100 block">{a.label}</span>
                                        <span className="text-slate-500 dark:text-slate-400 mt-0.5 block text-[13px]">{a.description}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                    {guide.glossary?.length > 0 && (
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3">Meanings</h3>
                            <div className="space-y-3">
                                {guide.glossary.map((g, i) => (
                                    <div key={i}>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold border ${badge(g.badgeTone)}`}>{g.term}</span>
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">{g.meaning}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {guide.tips?.length > 0 && (
                        <div className="bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/50">
                            <div className="flex items-center gap-2 mb-2">
                                <Lightbulb size={15} className="text-amber-500" />
                                <h3 className="text-sm font-black text-slate-900 dark:text-white">Tip</h3>
                            </div>
                            <ul className="space-y-1.5">
                                {guide.tips.map((t, i) => (<li key={i} className="text-[13px] text-slate-600 dark:text-slate-300">• {t}</li>))}
                            </ul>
                        </div>
                    )}
                    <button onClick={onClose} className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black transition-all active:scale-[0.99] cursor-pointer">Got it</button>
                </div>
            </div>
        </div>
    );
}
