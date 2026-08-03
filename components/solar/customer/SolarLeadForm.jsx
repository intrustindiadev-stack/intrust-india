'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Mail, MapPin, ChevronRight, CheckCircle2, Loader2, Sun } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { BILL_RANGES, PROPERTY_TYPES } from '@/lib/solar/estimator';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function SolarLeadForm({ existingLead, onSubmissionSuccess }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const [form, setForm] = useState({
        name: '',
        mobile: '',
        email: '',
        pincode: '',
        city: '',
        address: '',
        monthly_bill_range: '',
        property_type: 'residential',
    });

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleNextStep = () => {
        if (!form.monthly_bill_range) {
            toast.error('Please select your monthly bill range');
            return;
        }
        setStep(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormErrors({});

        // Basic front-end validation
        const errors = {};
        if (!form.name || form.name.length < 2) errors.name = 'Name is too short';
        if (!/^[6-9]\d{9}$/.test(form.mobile)) errors.mobile = 'Enter a valid 10-digit Indian mobile number';
        if (!/^[1-9][0-9]{5}$/.test(form.pincode)) errors.pincode = 'Enter a valid 6-digit PIN code';
        if (!form.city) errors.city = 'City is required';
        
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            toast.error('Please fix the errors before submitting');
            return;
        }

        setLoading(true);
        const supabase = createClient();

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast.error('Please login to request a solar quote');
                router.push(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
                return;
            }

            const response = await fetch('/api/solar/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.code === 'DUPLICATE_ACTIVE_LEAD') {
                    toast.error('You already have an active request. Tracking updated.');
                    onSubmissionSuccess?.();
                    return;
                }
                throw new Error(data.error || 'Failed to submit request');
            }

            onSubmissionSuccess?.();
            
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Submission failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (existingLead) {
        return (
            <div className={`p-8 text-center rounded-[2.5rem] border ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-black mb-2">Request Active</h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-6`}>
                    You already have an active solar consultation request. Please check the tracker above for updates.
                </p>
                <Link href="/dashboard" className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-sm uppercase tracking-widest inline-flex items-center">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div id="solar-form" className={`rounded-[2.5rem] border p-6 sm:p-8 shadow-2xl ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'}`}>
            <AnimatePresence mode="wait">
                {step === 1 ? (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3" aria-live="polite">Step 1 of 2 — Your electricity bill</p>

                        <div className="grid grid-cols-1 gap-3 mb-6" role="radiogroup" aria-label="Monthly Bill Range">
                            {BILL_RANGES.map(r => (
                                <button key={r.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={form.monthly_bill_range === r.id}
                                    onClick={() => set('monthly_bill_range', r.id)}
                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all ${form.monthly_bill_range === r.id
                                        ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                                        : `border-slate-200 dark:border-white/10 ${isDark ? 'bg-white/5' : 'bg-slate-50'} hover:border-slate-300 dark:hover:border-white/20`}`}>
                                    <div>
                                        <p className={`font-black text-sm ${form.monthly_bill_range === r.id ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>{r.label}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{r.sub} · {r.kw}</p>
                                    </div>
                                    {form.monthly_bill_range === r.id && <CheckCircle2 size={18} className="text-amber-500 shrink-0" />}
                                </button>
                            ))}
                        </div>

                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Property type</p>
                        <div className="flex gap-2 mb-6" role="radiogroup" aria-label="Property Type">
                            {PROPERTY_TYPES.map(p => (
                                <button key={p.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={form.property_type === p.id}
                                    onClick={() => set('property_type', p.id)}
                                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all ${form.property_type === p.id
                                        ? 'border-amber-500 bg-amber-500/10'
                                        : `border-slate-200 dark:border-white/10 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}`}>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${form.property_type === p.id ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>{p.label}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            disabled={!form.monthly_bill_range}
                            onClick={handleNextStep}
                            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95">
                            Continue <ChevronRight size={16} />
                        </button>
                    </motion.div>
                ) : (
                    <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleSubmit} noValidate>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6" aria-live="polite">Step 2 of 2 — Your details</p>

                        <div className="space-y-4">
                            {/* Name */}
                            <div>
                                <label htmlFor="solar_name" className="sr-only">Full Name</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input id="solar_name" type="text" placeholder="Your Name *" value={form.name} onChange={e => set('name', e.target.value)} required aria-invalid={!!formErrors.name}
                                        className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'} ${formErrors.name ? 'border-red-500' : ''}`} />
                                </div>
                                {formErrors.name && <p className="text-red-500 text-xs mt-1 ml-2">{formErrors.name}</p>}
                            </div>

                            {/* Mobile */}
                            <div>
                                <label htmlFor="solar_mobile" className="sr-only">Mobile Number</label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input id="solar_mobile" type="tel" inputMode="numeric" placeholder="Mobile Number *" value={form.mobile} onChange={e => set('mobile', e.target.value)} maxLength={10} required aria-invalid={!!formErrors.mobile}
                                        className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'} ${formErrors.mobile ? 'border-red-500' : ''}`} />
                                </div>
                                {formErrors.mobile && <p className="text-red-500 text-xs mt-1 ml-2">{formErrors.mobile}</p>}
                            </div>

                            {/* Pincode + City */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="solar_pincode" className="sr-only">Pincode</label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input id="solar_pincode" type="text" inputMode="numeric" placeholder="Pincode *" value={form.pincode} onChange={e => set('pincode', e.target.value)} maxLength={6} required aria-invalid={!!formErrors.pincode}
                                            className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'} ${formErrors.pincode ? 'border-red-500' : ''}`} />
                                    </div>
                                    {formErrors.pincode && <p className="text-red-500 text-xs mt-1 ml-2">{formErrors.pincode}</p>}
                                </div>
                                <div>
                                    <label htmlFor="solar_city" className="sr-only">City</label>
                                    <input id="solar_city" type="text" placeholder="City *" value={form.city} onChange={e => set('city', e.target.value)} required aria-invalid={!!formErrors.city}
                                        className={`w-full px-4 py-4 rounded-2xl border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'} ${formErrors.city ? 'border-red-500' : ''}`} />
                                    {formErrors.city && <p className="text-red-500 text-xs mt-1 ml-2">{formErrors.city}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setStep(1)}
                                className={`px-5 py-4 rounded-2xl font-black text-sm border transition-all ${isDark ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                Back
                            </button>
                            <button type="submit" disabled={loading}
                                className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-amber-500/20 disabled:opacity-60 flex items-center justify-center gap-2 active:scale-95 transition-all">
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Sun size={18} />}
                                {loading ? 'Submitting...' : 'Get Free Quote'}
                            </button>
                        </div>

                        <p className="text-center text-[10px] text-slate-400 font-medium mt-4">
                            🔒 Your data is secure. No spam calls. Expert callback within 24 hrs.
                        </p>
                    </motion.form>
                )}
            </AnimatePresence>
        </div>
    );
}
