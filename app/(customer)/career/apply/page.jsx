'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Briefcase, User, Phone, Mail, MapPin, Building2, GraduationCap,
    MessageSquare, ChevronRight, ChevronLeft, CheckCircle, ArrowLeft,
    Sparkles, Zap, Users, TrendingUp, DollarSign, Clock, Star,
    Award, Shield, FileText
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import { toast } from 'react-hot-toast';

const ROLE_CONFIG = {
    freelancer: { label: 'Freelancer', icon: Zap, gradient: 'from-violet-600 to-purple-600', bg: 'from-violet-500/10 to-purple-500/10', border: 'border-violet-500/30' },
    agent: { label: 'Field Agent', icon: Users, gradient: 'from-blue-600 to-cyan-600', bg: 'from-blue-500/10 to-cyan-500/10', border: 'border-blue-500/30' },
    dsa: { label: 'DSA Partner', icon: TrendingUp, gradient: 'from-emerald-600 to-teal-600', bg: 'from-emerald-500/10 to-teal-500/10', border: 'border-emerald-500/30' },
    sales: { label: 'Sales', icon: DollarSign, gradient: 'from-orange-600 to-amber-600', bg: 'from-orange-500/10 to-amber-500/10', border: 'border-orange-500/30' },
    other: { label: 'Other', icon: Briefcase, gradient: 'from-gray-600 to-slate-600', bg: 'from-gray-500/10 to-slate-500/10', border: 'border-gray-500/30' },
};

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu & Kashmir', 'Ladakh'
];

const LANGUAGES = ['Hindi', 'English', 'Marathi', 'Bengali', 'Tamil', 'Telugu', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Odia', 'Urdu'];

function CareerApplyForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, profile } = useAuth();

    const [step, setStep] = useState(1); // 1: Choose Role, 2: Personal Info, 3: Professional, 4: Cover
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [roles, setRoles] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(true);

    const [form, setForm] = useState({
        job_role_id: searchParams.get('role') || '',
        role_category: '',
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        email: user?.email || '',
        city: '',
        state: '',
        experience_years: 0,
        current_occupation: '',
        education: '',
        languages_known: [],
        cover_message: '',
        referral_code: '',
    });

    const selectedRole = roles.find(r => r.id === form.job_role_id);
    const config = ROLE_CONFIG[selectedRole?.category || form.role_category] || ROLE_CONFIG.other;

    useEffect(() => {
        async function fetchRoles() {
            const { data } = await supabase
                .from('career_job_roles')
                .select('*')
                .eq('is_active', true);
            setRoles(data || []);
            setLoadingRoles(false);

            // Auto-select if role id in query param
            const roleId = searchParams.get('role');
            if (roleId && data) {
                const r = data.find(x => x.id === roleId);
                if (r) {
                    setForm(prev => ({ ...prev, job_role_id: r.id, role_category: r.category }));
                    setStep(2);
                }
            }
        }
        fetchRoles();
    }, []);

    useEffect(() => {
        if (profile) {
            setForm(prev => ({
                ...prev,
                full_name: prev.full_name || profile.full_name || '',
                phone: prev.phone || profile.phone || '',
                email: prev.email || user?.email || '',
            }));
        }
    }, [profile, user]);

    const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const toggleLanguage = (lang) => {
        setForm(prev => ({
            ...prev,
            languages_known: prev.languages_known.includes(lang)
                ? prev.languages_known.filter(l => l !== lang)
                : [...prev.languages_known, lang]
        }));
    };

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
                referral_code: form.referral_code,
            }]);

            if (error) throw error;
            setSubmitted(true);
        } catch (err) {
            toast.error(err.message || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    const InputField = ({ label, id, type = 'text', value, onChange, required, placeholder, icon: Icon }) => (
        <div>
            <label htmlFor={id} className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                {Icon && <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />}
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm`}
                />
            </div>
        </div>
    );

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md"
                >
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/30">
                        <CheckCircle size={44} className="text-white" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">Application Submitted!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">
                        We've received your application for <strong>{selectedRole?.title}</strong>. Our team will review it and get back to you within 2–3 business days.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold rounded-2xl">
                            Back to Dashboard
                        </Link>
                        <Link href="/career/apply" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            Apply for Another Role
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950">
            <Navbar />
            <div className="pt-24 sm:pt-32 pb-32 px-4 sm:px-6">
                <div className="max-w-2xl mx-auto">
                    {/* Back */}
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-8 transition-colors">
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>

                    {/* Header */}
                    <div className="mb-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold mb-4">
                            <Sparkles size={12} /> Career Application
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                            Join Intrust Financial
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            Fill out the form below. Our team reviews all applications within 48 hours.
                        </p>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2 mb-8">
                        {['Role', 'Personal', 'Professional', 'Submit'].map((label, i) => (
                            <div key={i} className="flex items-center gap-2 flex-1">
                                <div className="flex flex-col items-center flex-1">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                        {step > i + 1 ? <CheckCircle size={16} /> : i + 1}
                                    </div>
                                    <span className={`text-[10px] mt-1 font-medium ${step === i + 1 ? 'text-violet-600' : 'text-gray-400'}`}>{label}</span>
                                </div>
                                {i < 3 && <div className={`h-0.5 flex-1 rounded-full -mt-4 ${step > i + 1 ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                            </div>
                        ))}
                    </div>

                    {/* Card */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl p-6 sm:p-8">
                        <AnimatePresence mode="wait">
                            {/* STEP 1: Choose Role */}
                            {step === 1 && (
                                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Choose a Role</h2>
                                    <p className="text-sm text-gray-500 mb-6">Select the opportunity you'd like to apply for.</p>

                                    {loadingRoles ? (
                                        <div className="space-y-3">
                                            {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {roles.map(role => {
                                                const cfg = ROLE_CONFIG[role.category] || ROLE_CONFIG.other;
                                                const Icon = cfg.icon;
                                                const isSelected = form.job_role_id === role.id;
                                                return (
                                                    <button
                                                        key={role.id}
                                                        type="button"
                                                        onClick={() => updateForm('job_role_id', role.id)}
                                                        className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${isSelected ? `border-violet-500 bg-gradient-to-br ${cfg.bg}` : 'border-gray-200 dark:border-gray-700 hover:border-violet-200 dark:hover:border-violet-800'}`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                                                            <Icon size={18} className="text-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-gray-900 dark:text-white text-sm">{role.title}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{role.description}</p>
                                                        </div>
                                                        {isSelected && <CheckCircle size={20} className="text-violet-600 flex-shrink-0 mt-0.5" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* STEP 2: Personal Info */}
                            {step === 2 && (
                                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Personal Information</h2>
                                    <p className="text-sm text-gray-500 mb-6">We need your basic contact details.</p>
                                    <div className="space-y-4">
                                        <InputField label="Full Name" id="full_name" value={form.full_name} onChange={v => updateForm('full_name', v)} required placeholder="Your full name" icon={User} />
                                        <InputField label="Phone Number" id="phone" type="tel" value={form.phone} onChange={v => updateForm('phone', v)} required placeholder="10-digit mobile number" icon={Phone} />
                                        <InputField label="Email Address" id="email" type="email" value={form.email} onChange={v => updateForm('email', v)} required placeholder="your@email.com" icon={Mail} />
                                        <InputField label="City" id="city" value={form.city} onChange={v => updateForm('city', v)} placeholder="Your city" icon={MapPin} />
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">State</label>
                                            <select
                                                value={form.state}
                                                onChange={e => updateForm('state', e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                                            >
                                                <option value="">Select state</option>
                                                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3: Professional */}
                            {step === 3 && (
                                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Professional Background</h2>
                                    <p className="text-sm text-gray-500 mb-6">Tell us about your experience.</p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Years of Experience</label>
                                            <select
                                                value={form.experience_years}
                                                onChange={e => updateForm('experience_years', e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                                            >
                                                <option value="0">Fresher (0 years)</option>
                                                <option value="1">1 year</option>
                                                <option value="2">2 years</option>
                                                <option value="3">3 years</option>
                                                <option value="5">5+ years</option>
                                                <option value="10">10+ years</option>
                                            </select>
                                        </div>
                                        <InputField label="Current Occupation" id="current_occupation" value={form.current_occupation} onChange={v => updateForm('current_occupation', v)} placeholder="e.g. Sales Executive, Student, etc." icon={Building2} />
                                        <InputField label="Highest Education" id="education" value={form.education} onChange={v => updateForm('education', v)} placeholder="e.g. B.Com, MBA, 12th Pass" icon={GraduationCap} />

                                        {/* Languages */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Languages Known</label>
                                            <div className="flex flex-wrap gap-2">
                                                {LANGUAGES.map(lang => (
                                                    <button
                                                        key={lang}
                                                        type="button"
                                                        onClick={() => toggleLanguage(lang)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${form.languages_known.includes(lang) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-300'}`}
                                                    >
                                                        {lang}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <InputField label="Referral Code (Optional)" id="referral_code" value={form.referral_code} onChange={v => updateForm('referral_code', v)} placeholder="If someone referred you" icon={Star} />
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 4: Cover Message */}
                            {step === 4 && (
                                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Your Application</h2>
                                    <p className="text-sm text-gray-500 mb-6">Tell us why you want to join and what makes you great for this role.</p>

                                    {/* Role summary */}
                                    {selectedRole && (
                                        <div className={`p-4 rounded-2xl border ${config.border} bg-gradient-to-br ${config.bg} mb-6`}>
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Applying for</p>
                                            <p className="font-bold text-gray-900 dark:text-white">{selectedRole.title}</p>
                                            {selectedRole.commission_structure && (
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{selectedRole.commission_structure.split('\n')[0]}</p>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            Cover Message <span className="text-gray-400 font-normal">(optional but recommended)</span>
                                        </label>
                                        <textarea
                                            value={form.cover_message}
                                            onChange={e => updateForm('cover_message', e.target.value)}
                                            rows={5}
                                            placeholder="Tell us about your motivation, relevant skills, and why you're a great fit..."
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none text-sm"
                                        />
                                    </div>

                                    <div className="mt-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-start gap-2">
                                            <Shield size={14} className="flex-shrink-0 mt-0.5" />
                                            Your information is secure and will only be used for the application review process. Admin will contact you via phone/email if selected.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Navigation */}
                        <div className="flex gap-3 mt-8">
                            {step > 1 && (
                                <button
                                    onClick={() => setStep(s => s - 1)}
                                    className="flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm"
                                >
                                    <ChevronLeft size={16} /> Back
                                </button>
                            )}
                            {step < 4 ? (
                                <button
                                    onClick={() => {
                                        if (step === 1 && !form.job_role_id) { toast.error('Please select a role to continue'); return; }
                                        setStep(s => s + 1);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold rounded-2xl transition-all text-sm shadow-lg shadow-violet-500/25"
                                >
                                    Continue <ChevronRight size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl transition-all text-sm shadow-lg shadow-emerald-500/25 disabled:opacity-60"
                                >
                                    {submitting ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                                    ) : (
                                        <><FileText size={16} /> Submit Application</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <CustomerBottomNav />
        </div>
    );
}

export default function CareerApplyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <CareerApplyForm />
        </Suspense>
    );
}
