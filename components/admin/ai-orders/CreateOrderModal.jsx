'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function CreateOrderModal({ onCreated }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.target);
        
        try {
            const res = await fetch('/api/admin/ai-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_name: formData.get('product_name'),
                    wholesale_price_paise: parseFloat(formData.get('wholesale_price')) * 100,
                    retail_price_paise: parseFloat(formData.get('retail_price')) * 100,
                    profit_margin_paise: parseFloat(formData.get('profit_margin')) * 100,
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('AI Order pushed live!');
            setOpen(false);
            if (onCreated) onCreated();
            
        } catch (error) {
            toast.error(error.message || 'Failed to create order');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button 
                onClick={() => setOpen(true)}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
                <Plus size={16} className="mr-2" />
                Feed New Order
            </button>

            <AnimatePresence>
                {open && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Feed New AI Order</h2>
                                <button 
                                    onClick={() => setOpen(false)}
                                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <X size={16} className="text-slate-500" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Product Name</label>
                                    <input 
                                        required 
                                        name="product_name" 
                                        placeholder="e.g. iPhone 15 Pro Max" 
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] dark:text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Wholesale Price (₹)</label>
                                        <input 
                                            required 
                                            name="wholesale_price" 
                                            type="number" 
                                            min="0" 
                                            step="0.01" 
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Retail Price (₹)</label>
                                        <input 
                                            required 
                                            name="retail_price" 
                                            type="number" 
                                            min="0" 
                                            step="0.01" 
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Guaranteed Profit Margin (₹)</label>
                                    <input 
                                        required 
                                        name="profit_margin" 
                                        type="number" 
                                        min="0" 
                                        step="0.01" 
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] dark:text-white"
                                    />
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className="inline-flex items-center justify-center rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-bold text-slate-900 hover:bg-[#B8860B] transition-colors disabled:opacity-50"
                                    >
                                        {isLoading && <Loader2 size={16} className="mr-2 animate-spin" />}
                                        Push Order Live
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
