'use client';

import { useState, useEffect } from 'react';
import { Store, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default function StoreStatusToggle({ initialStoreData, compact = false, variant = 'default' }) {
    const supabase = createClient();
    const [isOpen, setIsOpen] = useState(initialStoreData?.is_open ?? true);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!initialStoreData?.id) return;

        const channel = supabase
            .channel(`merchant_toggle_${initialStoreData.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'merchants', filter: `id=eq.${initialStoreData.id}` }, (payload) => {
                if (payload.new) {
                    setIsOpen(payload.new.is_open);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [initialStoreData?.id]);

    const handleSave = async (newIsOpen) => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('merchants')
                .update({
                    is_open: newIsOpen
                })
                .eq('id', initialStoreData.id);

            if (error) throw error;
            toast.success('Store schedule updated successfully', {
                style: {
                    background: '#333',
                    color: '#fff',
                    borderRadius: '10px',
                }
            });
        } catch (error) {
            console.error('Error updating store status:', error);
            toast.error('Failed to update schedule');
            // Revert on error
            setIsOpen(initialStoreData?.is_open ?? true);
        } finally {
            setIsLoading(false);
        }
    };

    if (variant === 'header') {
        const storeHref = initialStoreData?.slug ? `/shop/${initialStoreData.slug}` : '/shop';
        return (
            <div className="relative bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 sm:px-4 sm:py-3 shadow-xs flex items-center justify-between gap-4 sm:gap-6 transition-all hover:border-slate-300 dark:hover:border-white/20 shrink-0 w-full sm:w-auto min-w-fit">
                <div className="flex items-center gap-3 shrink-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isOpen
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                    }`}>
                        <Store size={20} />
                    </div>
                    <div className="flex flex-col shrink-0 min-w-max">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight whitespace-nowrap">
                            Store Status
                        </span>
                        <p className={`text-[11px] font-semibold whitespace-nowrap mt-0.5 ${
                            isOpen ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'
                        }`}>
                            {isOpen ? 'Currently Live' : 'Not Accepting Orders'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isOpen}
                            onChange={(e) => {
                                const val = e.target.checked;
                                setIsOpen(val);
                                handleSave(val);
                            }}
                            disabled={isLoading}
                            aria-label="Toggle store open status"
                        />
                        <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                            isOpen ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                        } peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/40 shadow-inner`}>
                            <span className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform duration-200 ease-in-out shadow-xs ${
                                isOpen ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                        </div>
                    </label>

                    <Link
                        href={storeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors whitespace-nowrap"
                    >
                        <span>View Store</span>
                        <ArrowUpRight size={13} />
                    </Link>
                </div>

                {isLoading && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-[2px] rounded-2xl flex items-center justify-center z-10">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    </div>
                )}
            </div>
        );
    }

    if (compact) {
        return (
            <div className="relative flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-900 uppercase tracking-wide">
                            Store Status
                        </span>
                        <span className={`text-[10px] font-black ${isOpen ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {isOpen ? 'LIVE' : 'OFFLINE'}
                        </span>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isOpen}
                        onChange={(e) => {
                            const val = e.target.checked;
                            setIsOpen(val);
                            handleSave(val);
                        }}
                        disabled={isLoading}
                    />
                    <div className="w-9 h-5 bg-slate-400/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                </label>
                {isLoading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="relative bg-white dark:bg-[#0c0e16] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/50 dark:shadow-none w-full sm:w-auto flex flex-col justify-center overflow-hidden transition-all duration-300 hover:border-blue-400/30 group min-w-[280px]">
            <div className="relative flex items-center justify-between gap-4 z-10">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-inner transition-all duration-500 group-hover:scale-110 ${isOpen ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-white/5 text-slate-400'}`}>
                        <Store size={26} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2.5 text-lg sm:text-xl tracking-tight leading-none">
                            Store Status
                            {isOpen && (
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                </span>
                            )}
                        </h3>
                        <p className={`text-[11px] sm:text-xs font-bold mt-2 leading-none uppercase tracking-[0.1em] ${isOpen ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-500'}`}>
                            {isOpen ? 'Currently Live' : 'Not Accepting Orders'}
                        </p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isOpen}
                        onChange={(e) => {
                            const val = e.target.checked;
                            setIsOpen(val);
                            handleSave(val);
                        }}
                        disabled={isLoading}
                    />
                    <div className="w-[56px] h-8 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500 peer-checked:dark:bg-emerald-500/80 shadow-inner"></div>
                </label>
            </div>

            {isLoading && (
                <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[4px] flex items-center justify-center z-20 transition-all rounded-[2rem]">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-500 drop-shadow-lg" />
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest animate-pulse">Syncing...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
