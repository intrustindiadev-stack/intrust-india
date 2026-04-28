'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Briefcase, User, Phone, Mail, MapPin, Building2, GraduationCap,
    MessageSquare, ChevronRight, ChevronLeft, CheckCircle2, ArrowLeft,
    Sparkles, Zap, Users, TrendingUp, DollarSign, Shield, FileText,
    Star, Globe, Check
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import { toast } from 'react-hot-toast';

const ROLE_CONFIG = {
    freelancer: { label: 'Freelancer', icon: Zap, gradient: 'from-violet-600 to-purple-700', light: 'from-violet-50 to-purple-50', border: 'border-violet-200', accent: 'text-violet-700' },
    agent: { label: 'Field Agent', icon: Users, gradient: 'from-blue-600 to-cyan-700', light: 'from-blue-50 to-cyan-50', border: 'border-blue-200', accent: 'text-blue-700' },
    dsa: { label: 'DSA Partner', icon: TrendingUp, gradient: 'from-emerald-600 to-teal-700', light: 'from-emerald-50 to-teal-50', border: 'border-emerald-200', accent: 'text-emerald-700' },
    sales: { label: 'Sales', icon: DollarSign, gradient: 'from-orange-500 to-amber-600', light: 'from-orange-50 to-amber-50', border: 'border-orange-200', accent: 'text-orange-700' },
    other: { label: 'Other', icon: Briefcase, gradient: 'from-slate-600 to-gray-700', light: 'from-slate-50 to-gray-50', border: 'border-slate-200', accent: 'text-slate-700' },
};

const INDIAN_STATES = [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
    'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
    'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
    'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
    'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
    'Delhi','Jammu & Kashmir','Ladakh'
];

const LANGUAGES = ['Hindi','English','Marathi','Bengali','Tamil','Telugu','Gujarati','Kannada','Malayalam','Punjabi','Odia','Urdu'];

const STEPS = ['Role', 'Personal', 'Experience', 'Submit'];

function ProgressBar({ step }) {
    return (
        <div className="flex items-center gap-0 mb-8">
            {STEPS.map((label, i) => {
                const done = step > i + 1;
                const active = step === i + 1;
                return (
                    <div key={label} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-200 text-gray-400'}`}>
                                {done ? <Check size={14} /> : i + 1}
                            </div>
                            <span className={`text-[10px] mt-1 font-semibold whitespace-nowrap ${active ? 'text-indigo-600' : done ? 'text-emerald-600' : 'text-gray-400'}`}>{label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-1 -mt-4 rounded-full transition-all duration-500 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function InputField({ label, id, type = 'text', value, onChange, required, placeholder, icon: Icon }) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">
                {Icon && <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />}
                <input
                    id={id} type={type} value={value}
                    onChange={e => onChange(e.target.value)} placeholder={placeholder}
                    className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm`}
                />
            </div>
        </div>
    );
}

function SelectField({ label, value, onChange, children }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                {children}
            </select>
        </div>
    );
}

function CareerApplyForm() {
    const searchParams = useSearchParams();
    const { user, profile } = useAuth();

    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [roles, setRoles] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(true);

    const [form, setForm] = useState({
        job_role_id: '',
        role_category: '',
        full_name: '',
        phone: '',
        email: '',
        city: '',
        state: '',
        experience_years: 0,
        current_occupation: '',
        education: '',
        languages_known: [],
        cover_message: '',
        referral_code: '',
    });

    const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
    const toggleLanguage = lang => setForm(prev => ({
        ...prev,
        languages_known: prev.languages_known.includes(lang)
            ? prev.languages_known.filter(l => l !== lang)
            : [...prev.languages_known, lang]
    }));

    const selectedRole = roles.find(r => r.id === form.job_role_id);
    const config = ROLE_CONFIG[selectedRole?.category || form.role_category] || ROLE_CONFIG.other;
    const RoleIcon = config.icon;

    useEffect(() => {
        async function fetchRoles() {
            const { data } = await supabase.from('career_job_roles').select('*').eq('is_active', true).order('created_at', { ascending: false });
            const list = data || [];
            setRoles(list);
            setLoadingRoles(false);
            const roleId = searchParams.get('role');
            if (roleId && list.length) {
                const r = list.find(x => x.id === roleId);
                if (r) {
                    setForm(prev => ({ ...prev, job_role_id: r.id, role_category: r.category }));
                    setStep(2);
                }
            }
        }
        fetchRoles();
    }, []);

    useEffect(() => {
        if (profile || user) {
            setForm(prev => ({
                ...prev,
                full_name: prev.full_name || profile?.full_name || '',
                phone: prev.phone || profile?.phone || '',
                email: prev.email || user?.email || '',
            }));
        }
    }, [profile, user]);

    const handleSubmit = async () => {
        if (!user) { toast.error('Please login first'); return; }
        if (!form.job_role_id) { toast.error('Please select a role'); return; }
        if (!form.full_name || !form.phone || !form.email) { toast.error('Please fill all required fields'); return; }
        setSubmitting(true);
        try {
            const { error } = await supabase.from('career_applications').insert([{
                user_id: user.id,
                job_role_id: form.job_role_id,
                role_category: selectedRole?.category || form.role_category,
                full_name: form.full_name,
                phone: form.phone,
                email: form.email,
                city: form.city,
                state: form.state,
                experience_years: parseInt(form.experience_years) || 0,
                current_occupation: form.current_occupation,
                education: form.education,
                languages_known: form.languages_known,
                cover_message: form.cover_message,
                referral_code: form.referral_code || null,
            }]);
            if (error) throw error;
            setSubmitted(true);
        } catch (err) {
            toast.error(err.message || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    // ── SUCCESS STATE ──────────────────────────────────────────────
    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-emerald-50 to-teal-50">
                <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                        className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-400/40">
                        <CheckCircle2 size={52} className="text-white" />
                    </motion.div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Application Sent! 🎉</h2>
                    <p className="text-gray-500 mb-2">We've received your application for <strong className="text-gray-800">{selectedRole?.title || 'the role'}</strong>.</p>
                    <p className="text-sm text-gray-400 mb-8">Our HR team will review it and reach out within 2–3 business days.</p>
                    <div className="flex flex-col gap-3">
                        <Link href="/career/applications" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/25 hover:from-emerald-500 transition-all">
                            Track My Application <ChevronRight size={16} />
                        </Link>
                        <Link href="/career" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                            Browse more open positions
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ── MAIN FORM ──────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="pt-20 pb-32">

                {/* Hero strip */}
                <div className={`bg-gradient-to-r ${config.gradient} text-white px-4 py-8 relative overflow-hidden`}>
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                    <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                    <div className="max-w-2xl mx-auto relative z-10">
                        <Link href="/career" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors">
                            <ArrowLeft size={15} /> Back to Jobs
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                                <RoleIcon size={22} className="text-white" />
                            </div>
                            <div>
                                <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Career Application</p>
                                <h1 className="text-xl font-black">
                                    {selectedRole?.title || 'Join InTrust Financial'}
                                </h1>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto px-4 pt-8">
                    <ProgressBar step={step} />

                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                        <AnimatePresence mode="wait">

                            {/* ── STEP 1: Choose Role ── */}
                            {step === 1 && (
                                <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="p-6 sm:p-8">
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">Choose a Role</h2>
                                    <p className="text-sm text-gray-400 mb-6">Select the opportunity you'd like to apply for. Tap to select & continue.</p>
                                    {loadingRoles ? (
                                        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}</div>
                                    ) : roles.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
                                            <p className="font-semibold">No open positions right now</p>
                                            <p className="text-sm mt-1">Check back soon!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {roles.map(role => {
                                                const cfg = ROLE_CONFIG[role.category] || ROLE_CONFIG.other;
                                                const Icon = cfg.icon;
                                                const isSelected = form.job_role_id === role.id;
                                                return (
                                                    <motion.button key={role.id} type="button" whileTap={{ scale: 0.98 }}
                                                        onClick={() => {
                                                            setForm(prev => ({ ...prev, job_role_id: role.id, role_category: role.category }));
                                                            setTimeout(() => setStep(2), 200);
                                                        }}
                                                        className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${isSelected ? `border-indigo-500 bg-gradient-to-br ${cfg.light}` : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'}`}>
                                                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                                                            <Icon size={20} className="text-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <p className="font-bold text-gray-900 text-sm">{role.title}</p>
                                                                {role.location && <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0"><MapPin size={10} />{role.location}</span>}
                                                            </div>
                                                            {role.commission_structure && (
                                                                <p className={`text-xs font-semibold mt-1 ${cfg.accent}`}>{role.commission_structure.split('\n')[0]}</p>
                                                            )}
                                                            {role.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{role.description}</p>}
                                                        </div>
                                                        {isSelected && <CheckCircle2 size={20} className="text-indigo-600 flex-shrink-0 mt-0.5" />}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* ── STEP 2: Personal Info ── */}
                            {step === 2 && (
                                <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="p-6 sm:p-8">
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">Personal Information</h2>
                                    <p className="text-sm text-gray-400 mb-6">Your contact details so our team can reach you.</p>
                                    <div className="space-y-4">
                                        <InputField label="Full Name" id="full_name" value={form.full_name} onChange={v => updateForm('full_name', v)} required placeholder="Your full name" icon={User} />
                                        <InputField label="Phone Number" id="phone" type="tel" value={form.phone} onChange={v => updateForm('phone', v)} required placeholder="10-digit mobile number" icon={Phone} />
                                        <InputField label="Email Address" id="email" type="email" value={form.email} onChange={v => updateForm('email', v)} required placeholder="your@email.com" icon={Mail} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputField label="City" id="city" value={form.city} onChange={v => updateForm('city', v)} placeholder="Your city" icon={MapPin} />
                                            <SelectField label="State" value={form.state} onChange={v => updateForm('state', v)}>
                                                <option value="">Select state</option>
                                                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </SelectField>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── STEP 3: Professional ── */}
                            {step === 3 && (
                                <motion.div key="s3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="p-6 sm:p-8">
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">Professional Background</h2>
                                    <p className="text-sm text-gray-400 mb-6">Tell us about your experience and skills.</p>
                                    <div className="space-y-4">
                                        <SelectField label="Years of Experience" value={form.experience_years} onChange={v => updateForm('experience_years', v)}>
                                            <option value="0">Fresher (0 years)</option>
                                            <option value="1">1 year</option>
                                            <option value="2">2 years</option>
                                            <option value="3">3 years</option>
                                            <option value="5">5+ years</option>
                                            <option value="10">10+ years</option>
                                        </SelectField>
                                        <InputField label="Current Occupation" id="occupation" value={form.current_occupation} onChange={v => updateForm('current_occupation', v)} placeholder="e.g. Sales Executive, Student" icon={Building2} />
                                        <InputField label="Highest Education" id="education" value={form.education} onChange={v => updateForm('education', v)} placeholder="e.g. B.Com, MBA, 12th Pass" icon={GraduationCap} />
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Globe size={14} /> Languages Known</label>
                                            <div className="flex flex-wrap gap-2">
                                                {LANGUAGES.map(lang => (
                                                    <button key={lang} type="button" onClick={() => toggleLanguage(lang)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${form.languages_known.includes(lang) ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'}`}>
                                                        {lang}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <InputField label="Referral Code (Optional)" id="referral_code" value={form.referral_code} onChange={v => updateForm('referral_code', v)} placeholder="If someone referred you" icon={Star} />
                                    </div>
                                </motion.div>
                            )}

                            {/* ── STEP 4: Cover Message ── */}
                            {step === 4 && (
                                <motion.div key="s4" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="p-6 sm:p-8">
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">Final Step</h2>
                                    <p className="text-sm text-gray-400 mb-6">Add a personal note and review your application.</p>

                                    {/* Role summary card */}
                                    {selectedRole && (
                                        <div className={`p-4 rounded-2xl border-2 ${config.border} bg-gradient-to-br ${config.light} mb-5`}>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Applying for</p>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0`}>
                                                    <RoleIcon size={17} className="text-white" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{selectedRole.title}</p>
                                                    {selectedRole.commission_structure && (
                                                        <p className={`text-xs font-semibold ${config.accent}`}>{selectedRole.commission_structure.split('\n')[0]}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                                            <MessageSquare size={14} /> Cover Message <span className="text-gray-400 font-normal text-xs">(optional but recommended)</span>
                                        </label>
                                        <textarea value={form.cover_message} onChange={e => updateForm('cover_message', e.target.value)} rows={5}
                                            placeholder="Tell us about your motivation, relevant experience, and why you're a great fit..."
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm" />
                                    </div>

                                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                                        <p className="text-xs text-amber-700 font-medium flex items-start gap-2">
                                            <Shield size={14} className="flex-shrink-0 mt-0.5" />
                                            Your information is secure and will only be used for the application review process. We'll contact you via phone/email if selected.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Navigation */}
                        {step > 1 && (
                            <div className="flex gap-3 px-6 sm:px-8 pb-6 sm:pb-8">
                                <button onClick={() => setStep(s => s - 1)}
                                    className="flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all text-sm">
                                    <ChevronLeft size={16} /> Back
                                </button>
                                {step < 4 ? (
                                    <button onClick={() => {
                                        if (step === 2 && (!form.full_name || !form.phone || !form.email)) { toast.error('Please fill all required fields'); return; }
                                        setStep(s => s + 1);
                                    }} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl transition-all text-sm shadow-lg shadow-indigo-500/20">
                                        Continue <ChevronRight size={16} />
                                    </button>
                                ) : (
                                    <button onClick={handleSubmit} disabled={submitting}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl transition-all text-sm shadow-lg shadow-emerald-500/25 disabled:opacity-60">
                                        {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</> : <><FileText size={16} /> Submit Application</>}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <CustomerBottomNav />
        </div>
    );
}

export default function CareerApplyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <CareerApplyForm />
        </Suspense>
    );
}
