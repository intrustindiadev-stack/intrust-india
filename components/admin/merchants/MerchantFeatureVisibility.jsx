'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, TrendingUp, ShoppingBag, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const FEATURES = [
    {
        key: 'show_lockin',
        label: 'Lockin Portfolio',
        description: "Controls the merchant's access to /merchant/lockin (Growth Portfolio / fixed deposits).",
        icon: Lock,
    },
    {
        key: 'show_ai_grow',
        label: 'AI Grow',
        description: "Controls the merchant's access to /merchant/investments (Auto-Orders Engine capital).",
        icon: TrendingUp,
    },
    {
        key: 'show_ai_orders',
        label: 'AI Orders (+ My Vault)',
        description: "Controls the merchant's access to /merchant/ai-orders and the dependent /merchant/vault pages.",
        icon: ShoppingBag,
    },
];

export default function MerchantFeatureVisibility({ merchantId }) {
    const router = useRouter();
    const [visibility, setVisibility] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pendingKey, setPendingKey] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await fetch(`/api/admin/merchants/${merchantId}/visibility`);
                if (!res.ok) throw new Error('Failed to load visibility settings');
                const data = await res.json();
                if (!cancelled) setVisibility(data.visibility);
            } catch (err) {
                console.error('Visibility load error:', err);
                if (!cancelled) toast.error('Failed to load feature visibility');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [merchantId]);

    const handleToggle = async (key, nextValue) => {
        setPendingKey(key);
        const toastId = toast.loading(nextValue ? 'Enabling feature...' : 'Hiding feature...');
        try {
            const res = await fetch(`/api/admin/merchants/${merchantId}/visibility`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [key]: nextValue }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update visibility');

            setVisibility((prev) => ({ ...prev, [key]: nextValue }));
            toast.success(
                nextValue
                    ? 'Feature enabled — merchant can now access it.'
                    : 'Feature hidden — merchant pages & sidebar entry are now blocked.',
                { id: toastId }
            );
            router.refresh();
        } catch (err) {
            console.error('Visibility toggle error:', err);
            toast.error(err.message, { id: toastId });
        } finally {
            setPendingKey(null);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-slate-200 shadow-sm flex items-center gap-3 text-sm text-slate-400 font-bold">
                <Loader2 size={18} className="animate-spin" /> Loading feature visibility...
            </div>
        );
    }

    if (!visibility) return null;

    return (
        <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                        <Eye className="text-purple-600" size={18} />
                    </div>
                    Feature Visibility
                </h2>
                <span className="w-fit px-4 py-1.5 bg-purple-50 text-purple-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-purple-100">
                    Super Admin Only
                </span>
            </div>

            <p className="text-sm text-slate-500 mb-6 max-w-2xl">
                Hide or reveal investment features for this merchant. A hidden feature disappears from their
                sidebar, and any direct URL access is redirected to their dashboard. Vault follows AI Orders.
            </p>
            <div className="space-y-4">
                {FEATURES.map(({ key, label, description, icon: Icon }) => {
                    const enabled = visibility[key] !== false;
                    const isPending = pendingKey === key;

                    return (
                        <div
                            key={key}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all ${enabled
                                ? 'border-emerald-100 bg-emerald-50/40'
                                : 'border-rose-200 bg-rose-50/50'
                                }`}
                        >
                            <div className="flex items-start gap-4 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'
                                    }`}>
                                    <Icon size={18} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-black text-slate-900 text-sm sm:text-base">{label}</p>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${enabled
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-rose-100 text-rose-700 border-rose-200'
                                            }`}>
                                            {enabled ? <Eye size={10} /> : <EyeOff size={10} />}
                                            {enabled ? 'Visible' : 'Hidden'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => handleToggle(key, !enabled)}
                                disabled={pendingKey !== null}
                                className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${enabled
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                    }`}
                            >
                                {isPending ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : enabled ? (
                                    <><EyeOff size={14} /> Hide</>
                                ) : (
                                    <><Eye size={14} /> Enable</>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
