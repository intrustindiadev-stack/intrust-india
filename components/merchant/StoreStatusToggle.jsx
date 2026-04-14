'use client';

import { useState } from 'react';
import { Store, Clock, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

export default function StoreStatusToggle({ initialStoreData }) {
    const supabase = createClient();
    const [isOpen, setIsOpen] = useState(initialStoreData?.is_open ?? true);
    const [openingTime, setOpeningTime] = useState(initialStoreData?.opening_time || '09:00');
    const [closingTime, setClosingTime] = useState(initialStoreData?.closing_time || '21:00');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async (newIsOpen, newOpenTime, newCloseTime) => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('merchants')
                .update({
                    is_open: newIsOpen,
                    opening_time: newOpenTime,
                    closing_time: newCloseTime,
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
            setOpeningTime(initialStoreData?.opening_time || '09:00');
            setClosingTime(initialStoreData?.closing_time || '21:00');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative bg-white dark:bg-[#0c0e16] border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none w-full flex flex-col overflow-hidden transition-all duration-300 hover:border-blue-400/30 group min-h-[220px] lg:min-h-full">
            {/* Soft background glow based on state */}
            <div className={`absolute -top-12 -right-12 w-48 h-48 blur-[80px] rounded-full pointer-events-none transition-colors duration-1000 ${isOpen ? 'bg-emerald-500/30' : 'bg-rose-500/10'}`} />
            
            <div className="relative flex items-center justify-between gap-6 z-10 mb-8 sm:mb-10">
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
                            handleSave(val, openingTime, closingTime);
                        }}
                        disabled={isLoading}
                    />
                    <div className="w-[56px] h-8 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500 peer-checked:dark:bg-emerald-500/80 shadow-inner"></div>
                </label>
            </div>

            <div className="relative grid grid-cols-2 gap-4 sm:gap-6 border-t border-slate-100 dark:border-white/5 pt-6 sm:pt-8 z-10 bg-slate-50/40 dark:bg-white/[0.02] -mx-6 -mb-6 px-6 pb-6 sm:-mx-8 sm:-mb-8 sm:px-8 sm:pb-8 flex-1 items-center">
                <div className="flex flex-col gap-2.5">
                    <label className="text-[10px] sm:text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={12} className="text-emerald-500" />
                        Opening Hrs
                    </label>
                    <input
                        type="time"
                        value={openingTime}
                        onChange={(e) => setOpeningTime(e.target.value)}
                        onBlur={() => handleSave(isOpen, openingTime, closingTime)}
                        disabled={isLoading}
                        className="bg-white dark:bg-[#0c0e16] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-full transition-all shadow-sm group-hover:shadow-md"
                    />
                </div>
                <div className="flex flex-col gap-2.5">
                    <label className="text-[10px] sm:text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={12} className="text-rose-500" />
                        Closing Hrs
                    </label>
                    <input
                        type="time"
                        value={closingTime}
                        onChange={(e) => setClosingTime(e.target.value)}
                        onBlur={() => handleSave(isOpen, openingTime, closingTime)}
                        disabled={isLoading}
                        className="bg-white dark:bg-[#0c0e16] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-full transition-all shadow-sm group-hover:shadow-md"
                    />
                </div>
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
