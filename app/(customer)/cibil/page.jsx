'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ShieldCheck, ArrowRight, CheckCircle2, Lock, FileText, ChevronRight, Zap, Landmark } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import Navbar from '@/components/layout/Navbar';

export default function CibilPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    
    // Form State
    const [formData, setFormData] = useState({ pan: '', name: '', dob: '', phone: '', consent: false });
    const [loadingText, setLoadingText] = useState('Connecting to Credit Bureau...');

    // Gauge State
    const maxScore = 900;
    const mockScore = 784;
    const scorePercentage = (mockScore / maxScore) * 100;

    const handleFormSubmit = (e) => {
        e.preventDefault();
        setStep(2);
        
        // Mock Loader phases
        setTimeout(() => setLoadingText('Analyzing credit profile...'), 1500);
        setTimeout(() => setLoadingText('Generating insights...'), 3000);
        setTimeout(() => setStep(3), 4500);
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 font-[family-name:var(--font-outfit)] pb-28 relative overflow-hidden">
            <Navbar theme="light" />

            {/* Background Glows (Subtle for both themes) */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 dark:bg-violet-600/20 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 dark:bg-emerald-600/20 blur-[120px] pointer-events-none" />

            <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                    <button onClick={() => router.push('/services')} className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Services</button>
                    <ChevronRight size={14} />
                    <span className="text-gray-900 dark:text-white font-bold">Credit Health</span>
                </nav>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
                    
                    {/* Left Column: Form or Result */}
                    <div className="md:col-span-7 xl:col-span-6">
                        <AnimatePresence mode="wait">
                            {/* STEP 1: FORM */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20, filter: 'blur(5px)' }}
                                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                >
                                    <div className="mb-8">
                                        <h1 className="text-3xl md:text-5xl font-black mb-3 text-gray-900 dark:text-white tracking-tight">
                                            Check your<br />free credit score
                                        </h1>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">Powered by Experian. No impact on your score.</p>
                                    </div>

                                    <form onSubmit={handleFormSubmit} className="space-y-5">
                                        {/* PAN Input */}
                                        <div className="group relative">
                                            <input
                                                type="text"
                                                required
                                                placeholder="PAN Number"
                                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all uppercase shadow-sm"
                                                value={formData.pan}
                                                onChange={(e) => setFormData({...formData, pan: e.target.value.toUpperCase()})}
                                                maxLength={10}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                                <Lock size={16} className="text-violet-500" />
                                            </div>
                                        </div>

                                        {/* Name Input */}
                                        <div className="group relative">
                                            <input
                                                type="text"
                                                required
                                                placeholder="Full Name (as per PAN)"
                                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all shadow-sm"
                                                value={formData.name}
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            />
                                        </div>

                                        {/* DOB Input */}
                                        <div className="group relative">
                                            <input
                                                type="date"
                                                required
                                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all shadow-sm [color-scheme:light] dark:[color-scheme:dark]"
                                                value={formData.dob}
                                                onChange={(e) => setFormData({...formData, dob: e.target.value})}
                                            />
                                        </div>

                                        {/* Phone Input */}
                                        <div className="group relative">
                                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">+91</div>
                                            <input
                                                type="tel"
                                                required
                                                placeholder="Mobile Number"
                                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl pl-14 pr-5 py-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all tracking-wide shadow-sm"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                                                maxLength={10}
                                            />
                                        </div>

                                        {/* Consent Checkbox */}
                                        <label className="flex items-start gap-3 mt-6 cursor-pointer group">
                                            <div className="relative flex-shrink-0 mt-1">
                                                <input
                                                    type="checkbox"
                                                    required
                                                    className="peer sr-only"
                                                    checked={formData.consent}
                                                    onChange={(e) => setFormData({...formData, consent: e.target.checked})}
                                                />
                                                <div className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 peer-checked:bg-violet-600 peer-checked:border-violet-600 transition-colors flex items-center justify-center shadow-sm">
                                                    <CheckCircle2 size={14} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                                                I hereby authorize Intrust to fetch my credit report from Experian & other bureaus. I agree to the <span className="text-violet-600 dark:text-violet-400 underline">Terms & Conditions</span>.
                                            </p>
                                        </label>

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            className="w-full mt-8 bg-gray-900 dark:bg-white text-white dark:text-[#0F1115] font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-200 active:scale-[0.98] transition-all shadow-lg shadow-gray-900/20 dark:shadow-white/10"
                                        >
                                            Fetch Score
                                            <ArrowRight size={20} />
                                        </button>
                                    </form>
                                </motion.div>
                            )}

                            {/* STEP 2: PROCESSING LOADER */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                                    transition={{ duration: 0.5 }}
                                    className="flex flex-col items-center justify-center py-32"
                                >
                                    {/* Scanning Radar Animation */}
                                    <div className="relative w-32 h-32 mb-8">
                                        <motion.div 
                                            animate={{ rotate: 360 }} 
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-0 rounded-full border-t-2 border-r-2 border-violet-500 border-b-2 border-b-transparent border-l-2 border-l-transparent"
                                        />
                                        <motion.div 
                                            animate={{ rotate: -360 }} 
                                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-2 rounded-full border-t-2 border-l-2 border-emerald-500 border-b-2 border-b-transparent border-r-2 border-r-transparent opacity-70"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <ShieldCheck size={32} className="text-gray-900 dark:text-white" />
                                        </div>
                                    </div>
                                    
                                    <motion.h2
                                        key={loadingText}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="text-xl font-bold text-gray-900 dark:text-white tracking-wide text-center"
                                    >
                                        {loadingText}
                                    </motion.h2>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 text-center">Securely processing your data via 256-bit encryption</p>
                                </motion.div>
                            )}

                            {/* STEP 3: RESULT DASHBOARD */}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                    className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 dark:border-gray-700"
                                >
                                    <div className="text-center mb-10">
                                        <motion.div 
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", damping: 12, delay: 0.2 }}
                                            className="inline-block bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-4 py-1.5 rounded-full text-sm font-bold border border-emerald-200 dark:border-emerald-500/30 mb-4 shadow-sm"
                                        >
                                            Excellent
                                        </motion.div>
                                        <h2 className="text-gray-500 dark:text-gray-400 font-medium">Your Experian Score</h2>
                                    </div>

                                    {/* Gauge Chart */}
                                    <div className="relative w-64 md:w-80 h-40 md:h-48 mx-auto mb-10">
                                        {/* Background Arc */}
                                        <svg className="w-full h-full" viewBox="0 0 200 100">
                                            <path
                                                d="M 20 90 A 70 70 0 0 1 180 90"
                                                fill="none"
                                                stroke="currentColor"
                                                className="text-gray-200 dark:text-gray-700"
                                                strokeWidth="12"
                                                strokeLinecap="round"
                                            />
                                            {/* Foreground Arc */}
                                            <motion.path
                                                d="M 20 90 A 70 70 0 0 1 180 90"
                                                fill="none"
                                                stroke="url(#gradient)"
                                                strokeWidth="12"
                                                strokeLinecap="round"
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: mockScore / 900 }}
                                                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                                            />
                                            <defs>
                                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" stopColor="#ef4444" /> {/* Red */}
                                                    <stop offset="50%" stopColor="#eab308" /> {/* Yellow */}
                                                    <stop offset="100%" stopColor="#10b981" /> {/* Green */}
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        
                                        {/* Score Text */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 1 }}
                                                className="text-6xl md:text-7xl font-black tracking-tighter text-gray-900 dark:text-white"
                                            >
                                                {mockScore}
                                            </motion.div>
                                            <span className="text-gray-500 text-sm mt-1">out of 900</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center text-sm text-gray-500 font-medium">
                                        <span>300 (Poor)</span>
                                        <span>900 (Excellent)</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Column: Information or Offers */}
                    <div className="md:col-span-5 xl:col-span-6 hidden md:block pl-0 lg:pl-12">
                        {step !== 3 ? (
                            <div className="h-full flex flex-col justify-center">
                                <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Why check your score?</h3>
                                    <ul className="space-y-6">
                                        <li className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 text-violet-600 dark:text-violet-400">
                                                <ShieldCheck size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 dark:text-white">100% Free & Secure</h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your data is encrypted. Checking your score here won't affect it.</p>
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400">
                                                <Landmark size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 dark:text-white">Better Loan Rates</h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">A higher score gives you negotiating power for better interest rates.</p>
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                                                <Zap size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 dark:text-white">Pre-approved Offers</h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Get instant access to credit cards and loans tailored to your profile.</p>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1.2 }}
                                className="h-full flex flex-col justify-center"
                            >
                                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                                    <Zap size={24} className="text-yellow-500" />
                                    Pre-approved Offers
                                </h3>
                                
                                <div className="space-y-4">
                                    {/* Offer Card */}
                                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 relative overflow-hidden group shadow-sm hover:shadow-lg transition-shadow">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 dark:bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/20 transition-colors" />
                                        
                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div>
                                                <div className="text-gray-500 dark:text-gray-400 text-sm mb-1 font-medium">Personal Loan</div>
                                                <div className="text-3xl font-black text-gray-900 dark:text-white">₹5,00,000</div>
                                            </div>
                                            <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-gray-700">
                                                <Landmark size={24} className="text-gray-600 dark:text-gray-300" />
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-6 text-sm mb-6 relative z-10">
                                            <div className="flex flex-col">
                                                <span className="text-gray-500 dark:text-gray-400">Interest Rate</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">10.49% p.a.</span>
                                            </div>
                                            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
                                            <div className="flex flex-col">
                                                <span className="text-gray-500 dark:text-gray-400">Tenure</span>
                                                <span className="font-bold text-gray-900 dark:text-white text-lg">Up to 60 mos</span>
                                            </div>
                                        </div>
                                        
                                        <button className="w-full py-4 bg-gray-900 dark:bg-white/10 hover:bg-gray-800 dark:hover:bg-white/20 text-white border border-transparent dark:border-white/5 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 relative z-10">
                                            Apply Now <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Show loan offers below gauge on mobile */}
            {step === 3 && (
                <div className="md:hidden px-4 mt-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2 }}
                    >
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                            <Zap size={18} className="text-yellow-500" />
                            Pre-approved Offers
                        </h3>
                        
                        <div className="space-y-4 mb-8">
                            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 relative overflow-hidden group shadow-sm">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 dark:bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/20 transition-colors" />
                                
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div>
                                        <div className="text-gray-500 dark:text-gray-400 text-sm mb-1 font-medium">Personal Loan</div>
                                        <div className="text-2xl font-black text-gray-900 dark:text-white">₹5,00,000</div>
                                    </div>
                                    <div className="w-10 h-10 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center border border-gray-100 dark:border-gray-700">
                                        <Landmark size={20} className="text-gray-600 dark:text-gray-300" />
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm mb-5 relative z-10">
                                    <div className="flex flex-col">
                                        <span className="text-gray-500 dark:text-gray-400">Interest</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">10.49% p.a.</span>
                                    </div>
                                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                                    <div className="flex flex-col">
                                        <span className="text-gray-500 dark:text-gray-400">Tenure</span>
                                        <span className="font-bold text-gray-900 dark:text-white text-base">Up to 60 mos</span>
                                    </div>
                                </div>
                                
                                <button className="w-full py-3 bg-gray-900 dark:bg-white/10 hover:bg-gray-800 dark:hover:bg-white/20 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 relative z-10 border border-transparent dark:border-white/5">
                                    Apply Now <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            <CustomerBottomNav />
        </div>
    );
}
