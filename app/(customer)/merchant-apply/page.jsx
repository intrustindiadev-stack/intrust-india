'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2, FileText, Upload, CheckCircle, ArrowRight, Shield,
    Loader2, ChevronLeft, Store, TrendingUp, Users, Check, Sparkles, CreditCard, Banknote, X, Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import KYCForm from '@/components/kyc/KYCForm';

// Confetti Component
const Confetti = () => {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-50">
            {[...Array(50)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{
                        top: -20,
                        left: Math.random() * 100 + "%",
                        scale: 0,
                    }}
                    animate={{
                        top: "100%",
                        scale: [0, 1, 0.5],
                        rotate: Math.random() * 360,
                    }}
                    transition={{
                        duration: Math.random() * 2 + 2,
                        delay: Math.random() * 0.5,
                        ease: "linear",
                        repeat: 0
                    }}
                    className="absolute w-3 h-3 rounded-full"
                    style={{
                        backgroundColor: ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][Math.floor(Math.random() * 5)]
                    }}
                />
            ))}
        </div>
    );
};

export default function MerchantApplyPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        businessName: '', gstNumber: '', ownerName: '',
        phone: '', email: '', address: '',
        bankAccount: '', ifscCode: '', panCard: '',
    });

    const handleFormSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        // Simulate a realistic API call
        setTimeout(() => {
            setLoading(false);
            setStep(4); // Move to Success Step internally for smooth transition
        }, 2000);
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    // Calculate progress for the progress bar
    const progress = (step / 3) * 100;

    return (
        <div className="h-screen w-full bg-[#FAFAFA] font-[family-name:var(--font-outfit)] overflow-hidden relative flex flex-col md:flex-row">

            {/* Desktop: Left Side Brand Panel (Hidden on Mobile) */}
            <div className="hidden md:flex w-1/2 lg:w-[45%] bg-slate-900 h-full relative overflow-hidden flex-col justify-between p-12 text-white">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-[100px] animate-pulse-slow" />
                    <div className="absolute top-1/2 -left-24 w-72 h-72 bg-purple-500 rounded-full blur-[100px] animate-pulse-slow delay-700" />
                    <div className="absolute -bottom-24 right-24 w-80 h-80 bg-emerald-500 rounded-full blur-[100px]" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 font-bold text-xl">I</div>
                        <span className="text-2xl font-bold tracking-tight">INTRUST</span>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h1 className="text-5xl font-extrabold leading-tight mb-6">
                            Grow your business <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">exponentially.</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-md">
                            Join 2,400+ merchants who are already selling gift cards to millions of customers.
                        </p>
                    </motion.div>
                </div>

                <div className="relative z-10 space-y-6">
                    <TrustItem icon={Users} title="Millions of Customers" text="Access our verified user base instantly." delay={0.4} />
                    <TrustItem icon={Shield} title="Zero Fraud Liability" text="We cover 100% of chargeback risks." delay={0.5} />
                    <TrustItem icon={Banknote} title="Instant Settlements" text="Get paid directly to your bank account." delay={0.6} />
                </div>

                <div className="relative z-10 text-xs text-slate-500 font-medium tracking-widest uppercase">
                    © 2024 Intrust Platform
                </div>
            </div>

            {/* Mobile/Right: App-Like Form Container */}
            <div className="flex-1 h-full relative flex flex-col bg-white">
                {step === 4 && <Confetti />}

                {/* Mobile Header / Navbar Replacement (Hide on Success) */}
                {step < 4 && (
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-20 sticky top-0 transition-opacity">
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">
                                <X size={18} />
                            </button>
                            <span className="font-bold text-slate-800 text-lg">Become a Partner</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">Step {step} of 3</span>
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full bg-blue-600 rounded-full"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-12 md:max-w-2xl md:mx-auto w-full custom-scrollbar relative">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="py-2"
                            >
                                <div className="mb-8">
                                    <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Business Details</h2>
                                    <p className="text-lg text-slate-500">Tell us about your business to get started.</p>
                                </div>

                                <div className="space-y-6">
                                    <SmoothInput label="Business Name" value={formData.businessName} onChange={e => setFormData({ ...formData, businessName: e.target.value })} autoFocus icon={Store} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SmoothInput label="GSTIN" value={formData.gstNumber} onChange={e => setFormData({ ...formData, gstNumber: e.target.value })} icon={FileText} />
                                        <SmoothInput label="Owner Name" value={formData.ownerName} onChange={e => setFormData({ ...formData, ownerName: e.target.value })} icon={Users} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SmoothInput label="Mobile Number" type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} icon={TrendingUp} />
                                        <SmoothInput label="Email Address" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} icon={Building2} />
                                    </div>
                                    <SmoothTextArea label="Registered Address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="py-2"
                            >
                                <div className="mb-8">
                                    <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Banking Details</h2>
                                    <p className="text-lg text-slate-500">Connect your bank account for settlements.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-100 flex gap-4 items-start">
                                        <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-blue-900 text-sm">Secure Verification</p>
                                            <p className="text-blue-700/80 text-sm mt-1 leading-relaxed">We will deposit ₹1 to verify this account automatically. Your banking details are encrypted with 256-bit SSL.</p>
                                        </div>
                                    </div>

                                    <SmoothInput label="Account Number" type="number" value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} autoFocus icon={CreditCard} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SmoothInput label="IFSC Code" value={formData.ifscCode} onChange={e => setFormData({ ...formData, ifscCode: e.target.value })} icon={Banknote} />
                                        <SmoothInput label="PAN Number" value={formData.panCard} onChange={e => setFormData({ ...formData, panCard: e.target.value })} icon={FileText} />
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
                                transition={{ duration: 0.3 }}
                                className="py-2 h-full flex flex-col"
                            >
                                <KYCForm
                                    userType="merchant"
                                    onSubmit={handleFormSubmit}
                                    initialData={{
                                        fullName: formData.ownerName,
                                        panNumber: formData.panCard,
                                        address: formData.address
                                    }}
                                />
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="h-full flex flex-col items-center justify-center text-center p-4"
                            >
                                <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                        className="w-full h-full bg-gradient-to-tr from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40"
                                    >
                                        <Check className="w-16 h-16 text-white stroke-[3px]" />
                                    </motion.div>
                                    <motion.div
                                        animate={{ scale: [1, 1.4, 1.4], opacity: [0.3, 0, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute inset-0 bg-green-400 rounded-full -z-10"
                                    />
                                </div>

                                <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Application Submitted!</h2>
                                <p className="text-slate-500 text-lg max-w-md mx-auto mb-10 leading-relaxed">
                                    We are verifying your documents. You can expect approval within <span className="font-bold text-slate-800">24-48 hours</span>.
                                </p>

                                <div className="w-full max-w-xs space-y-3">
                                    <button
                                        onClick={() => router.push('/')}
                                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Home size={18} />
                                        Return to Dashboard
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Fixed Bottom Action Bar (App Style - Hide on Success) */}
                {step < 3 && (
                    <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-between gap-4 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                        <button
                            onClick={prevStep}
                            disabled={step === 1}
                            className={`px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
                        >
                            Back
                        </button>
                        <button
                            onClick={nextStep}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg"
                        >
                            Continue
                            <ArrowRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper Components
function TrustItem({ icon: Icon, title, text, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.5 }}
            className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
        >
            <div className="shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Icon size={20} className="text-blue-300" />
            </div>
            <div>
                <h3 className="font-bold text-white mb-0.5">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
            </div>
        </motion.div>
    );
}

// Ultra Smooth Inputs
function SmoothInput({ label, className = "", icon: Icon, ...props }) {
    return (
        <div className="group">
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1 group-focus-within:text-blue-600 transition-colors">
                {label}
            </label>
            <div className="relative transform transition-all duration-200 group-focus-within:scale-[1.01]">
                <input
                    className={`w-full px-5 py-4 pl-12 bg-white border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-semibold text-slate-800 placeholder:text-slate-300 shadow-sm group-hover:border-slate-200 ${className}`}
                    placeholder={`Enter ${label}`}
                    {...props}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    {Icon && <Icon size={20} />}
                </div>
            </div>
        </div>
    )
}

function SmoothTextArea({ label, className = "", ...props }) {
    return (
        <div className="group">
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1 group-focus-within:text-blue-600 transition-colors">
                {label}
            </label>
            <textarea
                className={`w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-semibold text-slate-800 placeholder:text-slate-300 shadow-sm group-hover:border-slate-200 resize-none ${className}`}
                placeholder={`Enter ${label}`}
                rows={3}
                {...props}
            />
        </div>
    )
}
