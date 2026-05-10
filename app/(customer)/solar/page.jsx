'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sun, Zap, TrendingDown, ShieldCheck, CheckCircle2,
    Phone, Mail, MapPin, User, ChevronRight, Loader2,
    IndianRupee, Home, Building2, Factory, Star, ArrowRight,
    Clock, PhoneCall, CalendarCheck, CheckCircle, XCircle, Bell
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import { createClient } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/contexts/ThemeContext';
import Link from 'next/link';
import Image from 'next/image';

const BILL_RANGES = [
    { id: 'less_1500', label: '< ₹1,500', sub: 'Basic', kw: '1–2 kW' },
    { id: '1500_2500', label: '₹1,500–2,500', sub: 'Standard', kw: '2–3 kW' },
    { id: '2500_4000', label: '₹2,500–4,000', sub: 'Medium', kw: '3–5 kW' },
    { id: '4000_8000', label: '₹4,000–8,000', sub: 'Large', kw: '5–8 kW' },
    { id: 'more_8000', label: '> ₹8,000', sub: 'Commercial', kw: '8+ kW' },
];

const PROPERTY_TYPES = [
    { id: 'residential', label: 'Home', icon: Home },
    { id: 'commercial', label: 'Shop / Office', icon: Building2 },
    { id: 'industrial', label: 'Factory', icon: Factory },
];

const STATS = [
    { value: '₹78,000', label: 'Govt Subsidy', icon: IndianRupee, color: 'text-amber-400' },
    { value: '25 Yrs', label: 'Panel Lifespan', icon: Sun, color: 'text-yellow-400' },
    { value: '0%', label: 'Down Payment', icon: Zap, color: 'text-blue-400' },
    { value: '5★', label: 'InTrust Rating', icon: Star, color: 'text-emerald-400' },
];

const WHY_SOLAR = [
    { title: 'Zero Investment', desc: 'Government subsidy covers your full down payment', icon: IndianRupee },
    { title: 'EMI = Savings', desc: 'Your solar savings cover your monthly EMI completely', icon: TrendingDown },
    { title: 'Savings Guarantee', desc: "You save or we pay — India's first savings guarantee", icon: ShieldCheck },
    { title: '25-Year Warranty', desc: 'Premium panels with manufacturer-backed warranty', icon: CheckCircle2 },
];

// Status config
const STATUS_STEPS = [
    { key: 'new', label: 'Request Received', icon: Bell, color: 'text-sky-400', bg: 'bg-sky-500/15', border: 'border-sky-500/30' },
    { key: 'contacted', label: 'Team Contacted You', icon: PhoneCall, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
    { key: 'site_visit', label: 'Site Survey Done', icon: CalendarCheck, color: 'text-violet-400', bg: 'bg-violet-500/15', border: 'border-violet-500/30' },
    { key: 'quoted', label: 'Quote Sent', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
    { key: 'converted', label: 'Installation Done', icon: Sun, color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30' },
];

const BILL_LABEL = {
    less_1500: '< ₹1,500',
    '1500_2500': '₹1,500–2,500',
    '2500_4000': '₹2,500–4,000',
    '4000_8000': '₹4,000–8,000',
    more_8000: '> ₹8,000',
};

export default function SolarServicePage() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [isMounted, setIsMounted] = useState(false);
    const [step, setStep] = useState(1);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [existingLead, setExistingLead] = useState(null);
    const [leadLoading, setLeadLoading] = useState(true);

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

    useEffect(() => { setIsMounted(true); }, []);

    // Fetch user's most recent solar lead
    useEffect(() => {
        const fetchLead = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { setLeadLoading(false); return; }
                const { data } = await supabase
                    .from('solar_leads')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                setExistingLead(data || null);
            } catch (e) {
                // silent — not logged in
            } finally {
                setLeadLoading(false);
            }
        };
        fetchLead();
    }, [submitted]);

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleSubmit = async () => {
        if (!form.name || !form.mobile || !form.monthly_bill_range) {
            toast.error('Please fill in all required fields');
            return;
        }
        if (!/^\d{10}$/.test(form.mobile)) {
            toast.error('Enter a valid 10-digit mobile number');
            return;
        }
        setLoading(true);
        const supabase = createClient();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                toast.error('Please login to request a solar quote');
                router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
                return;
            }

            const { error } = await supabase.from('solar_leads').insert([{
                ...form,
                user_id: user.id,
                source: 'website',
            }]);
            if (error) throw error;
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            toast.error('Submission failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };


    if (!isMounted) return (
        <div className={`min-h-screen ${isDark ? 'bg-[#08090b]' : 'bg-slate-50'}`}>
            <div className="fixed top-0 inset-x-0 h-16 bg-white/10 animate-pulse" />
        </div>
    );

    // My Request Status Banner
    const MyRequestBanner = () => {
        if (leadLoading || !existingLead) return null;
        const currentIdx = STATUS_STEPS.findIndex(s => s.key === existingLead.status);
        const currentStep = STATUS_STEPS[currentIdx] ?? STATUS_STEPS[0];
        const isClosed = existingLead.status === 'closed';
        const isConverted = existingLead.status === 'converted';

        return (
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`mx-4 mt-24 mb-2 rounded-[2rem] border overflow-hidden ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'
                    } shadow-xl`}
            >
                {/* Header strip */}
                <div className={`flex items-center gap-3 px-5 py-4 border-b ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-100'
                    }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${currentStep.bg} border ${currentStep.border}`}>
                        <currentStep.icon size={16} className={currentStep.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">Your Solar Request</p>
                        <p className={`font-black text-sm leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {isClosed ? 'Request Closed' : currentStep.label}
                        </p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isConverted ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : isClosed ? 'bg-red-500/15 border-red-500/30 text-red-400'
                                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        }`}>
                        {isConverted ? '✓ Done' : isClosed ? 'Closed' : 'In Progress'}
                    </div>
                </div>

                {/* Progress timeline */}
                {!isClosed && (
                    <div className="px-5 py-4">
                        <div className="flex items-center gap-0">
                            {STATUS_STEPS.filter(s => s.key !== 'closed').map((s, i) => {
                                const done = i <= currentIdx;
                                const active = i === currentIdx;
                                return (
                                    <div key={s.key} className="flex items-center flex-1 last:flex-none">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${done
                                                ? `${s.bg} ${s.border} ${s.color}`
                                                : isDark ? 'bg-white/5 border-white/10 text-white/20' : 'bg-slate-100 border-slate-200 text-slate-300'
                                            } ${active ? 'ring-2 ring-offset-1 ring-amber-400/50' : ''}`}>
                                            <s.icon size={13} />
                                        </div>
                                        {i < STATUS_STEPS.filter(s => s.key !== 'closed').length - 1 && (
                                            <div className={`flex-1 h-0.5 mx-1 rounded-full ${i < currentIdx
                                                    ? 'bg-amber-400'
                                                    : isDark ? 'bg-white/10' : 'bg-slate-200'
                                                }`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <p className={`text-xs font-medium mt-3 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                            Step {Math.min(currentIdx + 1, 5)} of 5 — {currentStep.label}
                        </p>
                    </div>
                )}

                {/* Details row */}
                <div className={`flex flex-wrap gap-x-6 gap-y-1 px-5 pb-4 text-[11px] font-medium ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                    <span>📋 {BILL_LABEL[existingLead.monthly_bill_range] || existingLead.monthly_bill_range}</span>
                    <span>📍 {existingLead.city || existingLead.pincode || '—'}</span>
                    <span>📞 {existingLead.mobile}</span>
                </div>

                {/* Note from team */}
                {existingLead.notes && (
                    <div className={`mx-4 mb-4 p-3 rounded-2xl text-xs font-medium leading-relaxed border ${isDark ? 'bg-sky-500/10 border-sky-500/20 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-700'
                        }`}>
                        <span className="font-black">💬 Team Note: </span>{existingLead.notes}
                    </div>
                )}

                {/* Standard contact note */}
                <div className={`flex items-center gap-2 mx-4 mb-4 p-3 rounded-2xl border ${isDark ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                    }`}>
                    <PhoneCall size={14} className="text-emerald-500 shrink-0" />
                    <p className={`text-xs font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        Our SolarSquare team will contact you at <span className="font-black">{existingLead.mobile}</span> within 24 hours for a free consultation.
                    </p>
                </div>
            </motion.div>
        );
    };

    return (
        <div className={`min-h-screen ${isDark ? 'bg-[#08090b] text-white' : 'bg-slate-50 text-slate-900'} overflow-x-hidden`}>
            <div className="fixed top-0 left-0 right-0 z-[120]">
                <Navbar />
            </div>

            {/* My Request Banner — shown when user has existing lead */}
            {isMounted && <MyRequestBanner />}

            <AnimatePresence mode="wait">
                {submitted ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-gradient-to-br from-amber-950 via-orange-900 to-yellow-900 p-6"
                    >
                        <div className="text-center max-w-md">
                            <motion.div
                                initial={{ scale: 0, rotate: -30 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
                                className="w-24 h-24 bg-amber-400 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-400/40"
                            >
                                <Sun size={48} className="text-amber-900" />
                            </motion.div>
                            <h2 className="text-4xl font-black text-white mb-3 tracking-tight">Request Received!</h2>
                            <p className="text-amber-200/70 font-medium mb-2">
                                Our solar expert will contact you within <span className="text-amber-300 font-black">24 hours</span> for a free consultation.
                            </p>
                            <p className="text-amber-200/50 text-sm mb-10">Reference: {form.mobile}</p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Link href="/dashboard" className="px-8 py-4 bg-amber-400 text-amber-900 rounded-2xl font-black text-sm uppercase tracking-widest">
                                    Go to Dashboard
                                </Link>
                                <button onClick={() => { setSubmitted(false); setStep(1); setForm({ name: '', mobile: '', email: '', pincode: '', city: '', address: '', monthly_bill_range: '', property_type: 'residential' }); }}
                                    className="px-8 py-4 bg-white/10 border border-white/20 text-white rounded-2xl font-black text-sm uppercase tracking-widest">
                                    New Request
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <main className="relative z-10 pt-4">
                        {/* ── HERO ── */}
                        <section className="relative overflow-hidden px-4 pt-6 pb-10">
                            {/* Gradient BG */}
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-[#08090b]" />
                            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-400/10 rounded-full blur-[100px] pointer-events-none" />

                            <div className="relative z-10 max-w-5xl mx-auto">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

                                    {/* Left: text */}
                                    <div>
                                        {/* Badge */}
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest mb-5">
                                            <Sun size={12} className="animate-spin" style={{ animationDuration: '8s' }} />
                                            InTrust × SolarSquare Partner
                                        </motion.div>

                                        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight mb-4">
                                            <span className="text-slate-900 dark:text-white">Go Solar.</span>
                                            <br />
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                                                Save Every Month.
                                            </span>
                                        </motion.h1>

                                        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                                            className="text-slate-500 dark:text-slate-400 text-base font-medium mb-6 leading-relaxed max-w-md">
                                            Install solar at <span className="font-black text-amber-500">₹0 upfront cost</span>. Government subsidy covers your down payment. Your electricity savings cover your EMI.
                                        </motion.p>

                                        {/* Stat pills */}
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                            className="flex flex-wrap gap-2 mb-6">
                                            {[
                                                { icon: '🏛️', label: '₹78,000 Govt Subsidy' },
                                                { icon: '⚡', label: '₹0 Down Payment' },
                                                { icon: '🌟', label: '25-Year Warranty' },
                                            ].map((b, i) => (
                                                <div key={i} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold ${isDark ? 'bg-white/5 border-white/10 text-white/70' : 'bg-white border-slate-200 text-slate-700'
                                                    } shadow-sm`}>
                                                    <span>{b.icon}</span> {b.label}
                                                </div>
                                            ))}
                                        </motion.div>

                                        <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                                            onClick={() => document.getElementById('solar-form')?.scrollIntoView({ behavior: 'smooth' })}
                                            className="inline-flex items-center gap-3 px-7 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/50 transition-all active:scale-95">
                                            Get Free Consultation <ArrowRight size={16} />
                                        </motion.button>
                                    </div>

                                    {/* Right: house image */}
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18, duration: 0.6 }}
                                        className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl shadow-amber-900/20"
                                    >
                                        <Image
                                            src="/solar-home.png"
                                            alt="Solar powered Indian home — SolarSquare installation"
                                            fill
                                            className="object-cover object-center"
                                            sizes="(max-width: 1024px) 100vw, 50vw"
                                            priority
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                                        {/* Overlay badge */}
                                        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-sky-600/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-sky-400/30">
                                            <Zap size={13} className="text-white" />
                                            <span className="text-white text-[10px] font-black">On our way to power your home</span>
                                        </div>
                                        <div className="absolute top-4 right-4 bg-emerald-500/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-center border border-emerald-400/30">
                                            <p className="text-emerald-100 text-[8px] font-black uppercase tracking-widest">Avg Monthly Saving</p>
                                            <p className="text-white font-black text-base leading-none">₹7,500+</p>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </section>

                        {/* ── WHY SOLAR ── */}
                        <section className={`py-16 px-4 ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}>
                            <div className="max-w-4xl mx-auto">
                                <div className="text-center mb-10">
                                    <p className="text-xs font-black uppercase tracking-widest text-amber-500 mb-2">Why Solar?</p>
                                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                        India's smartest energy move
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {WHY_SOLAR.map((item, i) => (
                                        <motion.div key={i}
                                            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                                            className={`flex gap-4 p-6 rounded-3xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                                                <item.icon size={22} className="text-amber-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-900 dark:text-white mb-1">{item.title}</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* ── FORM ── */}
                        <section id="solar-form" className="py-16 px-4">
                            <div className="max-w-lg mx-auto">
                                <div className="text-center mb-8">
                                    <p className="text-xs font-black uppercase tracking-widest text-amber-500 mb-2">Free Consultation</p>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Book Your Solar Site Survey</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Takes less than 60 seconds. No commitment required.</p>
                                </div>

                                <div className={`rounded-[2.5rem] border p-6 sm:p-8 shadow-2xl ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'}`}>

                                    <AnimatePresence mode="wait">
                                        {step === 1 ? (
                                            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                                {/* Step 1: Bill Range + Property Type */}
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Step 1 of 2 — Your electricity bill</p>

                                                <div className="grid grid-cols-1 gap-3 mb-6">
                                                    {BILL_RANGES.map(r => (
                                                        <button key={r.id}
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
                                                <div className="flex gap-2 mb-6">
                                                    {PROPERTY_TYPES.map(p => (
                                                        <button key={p.id}
                                                            onClick={() => set('property_type', p.id)}
                                                            className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all ${form.property_type === p.id
                                                                ? 'border-amber-500 bg-amber-500/10'
                                                                : `border-slate-200 dark:border-white/10 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}`}>
                                                            <p.icon size={18} className={form.property_type === p.id ? 'text-amber-500' : 'text-slate-400'} />
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${form.property_type === p.id ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>{p.label}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                <button
                                                    disabled={!form.monthly_bill_range}
                                                    onClick={() => setStep(2)}
                                                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95">
                                                    Continue <ChevronRight size={16} />
                                                </button>
                                            </motion.div>
                                        ) : (
                                            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                                {/* Step 2: Contact Details */}
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Step 2 of 2 — Your details</p>

                                                <div className="space-y-4">
                                                    {/* Name */}
                                                    <div className="relative">
                                                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="text" placeholder="Your Name *" value={form.name} onChange={e => set('name', e.target.value)}
                                                            className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`} />
                                                    </div>
                                                    {/* Mobile */}
                                                    <div className="relative">
                                                        <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="tel" placeholder="Mobile Number *" value={form.mobile} onChange={e => set('mobile', e.target.value)} maxLength={10}
                                                            className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`} />
                                                    </div>
                                                    {/* Email */}
                                                    <div className="relative">
                                                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="email" placeholder="Email (Optional)" value={form.email} onChange={e => set('email', e.target.value)}
                                                            className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`} />
                                                    </div>
                                                    {/* Pincode + City */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="relative">
                                                            <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            <input type="text" placeholder="Pincode" value={form.pincode} onChange={e => set('pincode', e.target.value)} maxLength={6}
                                                                className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`} />
                                                        </div>
                                                        <input type="text" placeholder="City" value={form.city} onChange={e => set('city', e.target.value)}
                                                            className={`w-full px-4 py-4 rounded-2xl border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`} />
                                                    </div>
                                                    {/* Address */}
                                                    <textarea placeholder="Address (Optional)" value={form.address} onChange={e => set('address', e.target.value)} rows={2}
                                                        className={`w-full px-4 py-4 rounded-2xl border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all resize-none ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`} />
                                                </div>

                                                <div className="flex gap-3 mt-6">
                                                    <button onClick={() => setStep(1)}
                                                        className={`px-5 py-4 rounded-2xl font-black text-sm border transition-all ${isDark ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                                        Back
                                                    </button>
                                                    <button onClick={handleSubmit} disabled={loading}
                                                        className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-amber-500/20 disabled:opacity-60 flex items-center justify-center gap-2 active:scale-95 transition-all">
                                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Sun size={18} />}
                                                        {loading ? 'Submitting...' : 'Get Free Quote'}
                                                    </button>
                                                </div>

                                                <p className="text-center text-[10px] text-slate-400 font-medium mt-4">
                                                    🔒 Your data is secure. No spam calls. Expert callback within 24 hrs.
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </section>

                        <Footer />
                    </main>
                )}
            </AnimatePresence>

            <div className="fixed bottom-0 left-0 right-0 z-[120]">
                <CustomerBottomNav />
            </div>
        </div>
    );
}
