'use client';

import { useState, useMemo } from 'react';
import { X, Clock, ShieldCheck, Loader2, Info, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function UdhariRequestModal({ isOpen, onClose, card, user }) {
    const [step, setStep] = useState(1);
    const [duration, setDuration] = useState(15);
    const [customerNote, setCustomerNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isAgreed, setIsAgreed] = useState(false);

    const sellingPrice = useMemo(() => (card?.selling_price_paise / 100) || 0, [card]);
    const fee = useMemo(() => sellingPrice * 0.03, [sellingPrice]);
    const totalPayable = useMemo(() => sellingPrice + fee, [sellingPrice, fee]);

    if (!isOpen || !card) return null;

    const steps = [
        { id: 1, title: 'Overview', icon: <Info size={18} /> },
        { id: 2, title: 'Duration', icon: <Clock size={18} /> },
        { id: 3, title: 'Confirm', icon: <ShieldCheck size={18} /> }
    ];

    async function handleSubmit() {
        if (!user) {
            toast.error('Please log in first.');
            return;
        }

        if (!isAgreed) {
            toast.error('Please agree to the terms first.');
            return;
        }

        setSubmitting(true);
        try {
            const { data: { session } } = await (await import('@/lib/supabaseClient')).supabase.auth.getSession();

            const res = await fetch('/api/udhari/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    couponId: card.id,
                    customerNote: customerNote.trim() || undefined,
                    durationDays: duration
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Failed to submit request');
                return;
            }

            toast.success('Request submitted! Tracking it in Store Credits.');
            onClose();
            setStep(1); // Reset for next time
        } catch (err) {
            console.error('Udhari request error:', err);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    const nextStep = () => setStep(s => Math.min(s + 1, 3));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Ultra-glassy Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
                    />

                    {/* Premium Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/20 dark:border-gray-700/50 overflow-hidden"
                    >
                        {/* Header Section */}
                        <div className="p-8 pb-4">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
                                        <Clock size={24} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Pay Later</h2>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md">Udhari</span>
                                            <span className="text-xs font-medium text-gray-400">• 0% Interest</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all transform hover:rotate-90"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Progress Indicator */}
                            <div className="flex items-center gap-2 mb-8 px-2">
                                {steps.map((s, idx) => (
                                    <div key={idx} className="flex-1 flex items-center gap-2">
                                        <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= s.id ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-gray-200 dark:bg-gray-800'}`} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Content Area with Animations */}
                        <div className="px-8 pb-8">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:scale-110 transition-transform">
                                                <Store size={80} />
                                            </div>
                                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{card.brand}</p>
                                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4">{card.title}</h3>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-black text-gray-900 dark:text-white">₹{sellingPrice}</span>
                                                <span className="text-sm font-bold text-gray-400">Merchant Credit</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                                <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                                                Why choose Pay Later?
                                            </h4>
                                            <div className="grid grid-cols-1 gap-3">
                                                {[
                                                    { icon: <CheckCircle2 size={16} />, text: 'No upfront payment required today' },
                                                    { icon: <CheckCircle2 size={16} />, text: '0% Interest, 0 Late Fees ever' },
                                                    { icon: <CheckCircle2 size={16} />, text: 'Progressive credit score with Intrust' }
                                                ].map((item, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-500/5 text-amber-900 dark:text-amber-100 border border-amber-100/50 dark:border-amber-500/10">
                                                        <div className="text-amber-600 dark:text-amber-400">{item.icon}</div>
                                                        <span className="text-sm font-bold">{item.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="space-y-4">
                                            <label className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider block">Select Repayment Duration</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {[5, 10, 15].map((d) => (
                                                    <button
                                                        key={d}
                                                        onClick={() => setDuration(d)}
                                                        className={`py-4 rounded-2xl font-black text-lg transition-all border-2 ${duration === d
                                                            ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                                                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 hover:border-amber-200 dark:hover:border-amber-500/30'
                                                            }`}
                                                    >
                                                        {d} Days
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 space-y-4 shadow-inner">
                                            <div className="flex justify-between items-center text-sm font-bold">
                                                <span className="text-gray-400">Card Value</span>
                                                <span className="text-gray-900 dark:text-white">₹{sellingPrice.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm font-bold">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400">Platform Fee</span>
                                                    <div className="group relative">
                                                        <Info size={14} className="text-gray-300" />
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                                                            A small 3% fee to maintain secure merchant-customer escrow.
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-amber-600 dark:text-amber-400">+₹{fee.toFixed(2)}</span>
                                            </div>
                                            <div className="h-px bg-gray-200 dark:bg-gray-700" />
                                            <div className="flex justify-between items-center">
                                                <span className="font-black text-gray-900 dark:text-white">Total Payable</span>
                                                <div className="text-right">
                                                    <span className="text-2xl font-black text-gray-900 dark:text-white">₹{totalPayable.toFixed(2)}</span>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Due in {duration} days after approval</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="space-y-4">
                                            <label className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider block">Message to Merchant</label>
                                            <textarea
                                                value={customerNote}
                                                onChange={(e) => setCustomerNote(e.target.value)}
                                                placeholder="Example: I'm a regular customer at your shop, planning to pay by next weekend..."
                                                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none transition-all resize-none shadow-inner dark:text-white"
                                                rows={4}
                                            />
                                        </div>

                                        <div className="flex items-start gap-4 cursor-pointer group" onClick={() => setIsAgreed(!isAgreed)}>
                                            <div className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isAgreed ? 'bg-amber-500 border-amber-500' : 'border-gray-200 dark:border-gray-700'}`}>
                                                {isAgreed && <CheckCircle2 size={16} className="text-white" />}
                                            </div>
                                            <p className="text-xs font-bold text-gray-500 leading-relaxed transition-colors group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white">
                                                I understand this is a <strong className="text-amber-600 dark:text-amber-400 uppercase">Store Credit Request</strong>. I agree to pay the total amount of ₹{totalPayable.toFixed(2)} before the {duration}-day deadline.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-500/5 text-blue-800 dark:text-blue-100 border border-blue-100/50 dark:border-blue-500/10 rounded-2xl">
                                            <ShieldCheck className="text-blue-600 dark:text-blue-400 shrink-0" size={20} />
                                            <span className="text-[10px] font-bold uppercase tracking-tight leading-normal">Your request is protected by Intrust Secure Escrow. Credit is provided directly by the merchant.</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Navigation Buttons */}
                            <div className="flex gap-4 mt-8">
                                {step > 1 && (
                                    <button
                                        onClick={prevStep}
                                        className="p-5 rounded-[1.5rem] bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-all shadow-sm"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                )}
                                <button
                                    onClick={step === 3 ? handleSubmit : nextStep}
                                    disabled={submitting || (step === 3 && !isAgreed)}
                                    className={`
                                        flex-1 py-5 rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl
                                        ${submitting || (step === 3 && !isAgreed)
                                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none'
                                            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-amber-500/30 active:scale-[0.98]'
                                        }
                                    `}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={24} className="animate-spin" />
                                            Submitting Request...
                                        </>
                                    ) : (
                                        <>
                                            {step === 3 ? 'Confirm & Request' : 'Continue'}
                                            {step < 3 && <ChevronRight size={20} />}
                                            {step === 3 && <CheckCircle2 size={20} />}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
