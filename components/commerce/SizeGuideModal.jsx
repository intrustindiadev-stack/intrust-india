'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ruler, Check } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';

export default function SizeGuideModal({ isOpen, onClose, category = 'Apparel' }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [unit, setUnit] = useState('in'); // 'in' or 'cm'

    if (!isOpen) return null;

    const isFootwear = category.toLowerCase().includes('shoe') || category.toLowerCase().includes('footwear');

    const apparelData = [
        { size: 'XS', bust_in: '32-34', waist_in: '24-26', hip_in: '34-36', length_in: '43', bust_cm: '81-86', waist_cm: '61-66', hip_cm: '86-91', length_cm: '109' },
        { size: 'S', bust_in: '34-36', waist_in: '26-28', hip_in: '36-38', length_in: '44', bust_cm: '86-91', waist_cm: '66-71', hip_cm: '91-96', length_cm: '112' },
        { size: 'M', bust_in: '36-38', waist_in: '28-30', hip_in: '38-40', length_in: '45', bust_cm: '91-96', waist_cm: '71-76', hip_cm: '96-101', length_cm: '114' },
        { size: 'L', bust_in: '38-40', waist_in: '30-32', hip_in: '40-42', length_in: '45.5', bust_cm: '96-101', waist_cm: '76-81', hip_cm: '101-106', length_cm: '116' },
        { size: 'XL', bust_in: '40-42', waist_in: '32-34', hip_in: '42-44', length_in: '46', bust_cm: '101-106', waist_cm: '81-86', hip_cm: '106-111', length_cm: '117' },
        { size: 'XXL', bust_in: '42-44', waist_in: '34-36', hip_in: '44-46', length_in: '47', bust_cm: '106-111', waist_cm: '86-91', hip_cm: '111-116', length_cm: '119' },
    ];

    const footwearData = [
        { size: 'UK 6', eu: '40', us: '7', cm: '25.0', inches: '9.8' },
        { size: 'UK 7', eu: '41', us: '8', cm: '25.8', inches: '10.2' },
        { size: 'UK 8', eu: '42', us: '9', cm: '26.7', inches: '10.5' },
        { size: 'UK 9', eu: '43', us: '10', cm: '27.5', inches: '10.8' },
        { size: 'UK 10', eu: '44', us: '11', cm: '28.3', inches: '11.1' },
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Window */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className={`relative w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border ${
                        isDark ? 'bg-[#0e1118] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/40">
                                <Ruler size={18} />
                            </div>
                            <div>
                                <h3 className="text-base sm:text-lg font-black tracking-tight">
                                    {isFootwear ? 'Footwear Size Chart' : 'Size & Measurement Guide'}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    Find your perfect fit with standard sizing
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Unit Switcher */}
                    <div className="flex items-center justify-between my-4">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Measurements in:</span>
                        <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => setUnit('in')}
                                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                                    unit === 'in'
                                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Inches (in)
                            </button>
                            <button
                                type="button"
                                onClick={() => setUnit('cm')}
                                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                                    unit === 'cm'
                                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Centimeters (cm)
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 mb-4">
                        {!isFootwear ? (
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 dark:bg-white/5 font-black uppercase text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-white/10">
                                    <tr>
                                        <th className="p-3">Size</th>
                                        <th className="p-3">Bust</th>
                                        <th className="p-3">Waist</th>
                                        <th className="p-3">Hip</th>
                                        <th className="p-3">Length</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-semibold">
                                    {apparelData.map((row) => (
                                        <tr key={row.size} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                            <td className="p-3 font-black text-blue-600 dark:text-sky-400">{row.size}</td>
                                            <td className="p-3">{unit === 'in' ? row.bust_in : row.bust_cm}</td>
                                            <td className="p-3">{unit === 'in' ? row.waist_in : row.waist_cm}</td>
                                            <td className="p-3">{unit === 'in' ? row.hip_in : row.hip_cm}</td>
                                            <td className="p-3">{unit === 'in' ? row.length_in : row.length_cm}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 dark:bg-white/5 font-black uppercase text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-white/10">
                                    <tr>
                                        <th className="p-3">UK / India</th>
                                        <th className="p-3">EU</th>
                                        <th className="p-3">US</th>
                                        <th className="p-3">Foot Length</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-semibold">
                                    {footwearData.map((row) => (
                                        <tr key={row.size} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                            <td className="p-3 font-black text-blue-600 dark:text-sky-400">{row.size}</td>
                                            <td className="p-3">{row.eu}</td>
                                            <td className="p-3">{row.us}</td>
                                            <td className="p-3">{unit === 'in' ? `${row.inches}"` : `${row.cm} cm`}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Tip / Note */}
                    <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/40 text-[11px] text-sky-800 dark:text-sky-300 font-medium">
                        💡 <strong>Fitting Tip:</strong> If your measurements fall between two sizes, order the larger size for a relaxed fit, or the smaller size for a snug fit. All items are backed by InTrust 7-Day Hassle-Free Exchange.
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
