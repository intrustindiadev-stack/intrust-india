'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Smartphone, Search, Wifi, Phone, ShieldCheck, CheckCircle2, ChevronRight, History, Star, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import Image from 'next/image';

export default function MobileRechargePage() {
    const router = useRouter();
    const [number, setNumber] = useState('');
    const [step, setStep] = useState(1); // 1 = Input, 2 = Plans, 3 = Payment Sheet, 4 = Success
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [activeTab, setActiveTab] = useState('Recommended');
    
    // Mock auto-detect
    const detectedOperator = number.length >= 4 ? 'Jio' : null;
    const detectedCircle = number.length >= 4 ? 'Delhi NCR' : null;

    const mockPlans = [
        { id: 1, price: 299, validity: '28 Days', data: '2GB/Day', category: 'Recommended', tags: ['True 5G', 'Most Popular'], description: 'Enjoy unlimited 5G data with unlimited voice calls to any network.' },
        { id: 2, price: 749, validity: '90 Days', data: '2GB/Day', category: 'Recommended', tags: ['Best Value', 'True 5G'], description: 'Get 90 days of uninterrupted service with Disney+ Hotstar Mobile.' },
        { id: 3, price: 2999, validity: '365 Days', data: '2.5GB/Day', category: 'Unlimited', tags: ['Annual', 'True 5G'], description: 'Year-long freedom with extra 75GB data and Apollo 24|7 Circle.' },
        { id: 4, price: 19, validity: 'Base Active', data: '1GB', category: 'Data', tags: ['Add-on'], description: 'Data booster pack. Requires an active base plan.' },
    ];

    const filteredPlans = mockPlans.filter(p => p.category === activeTab);

    const handlePlanSelect = (plan) => {
        setSelectedPlan(plan);
        setStep(3); // Open payment sheet
    };

    const handlePayment = () => {
        setStep(4); // Success state
        setTimeout(() => {
            router.push('/dashboard');
        }, 3000);
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 font-[family-name:var(--font-outfit)] pb-20 relative">
            
            <Navbar theme="light" />

            <main className="max-w-7xl mx-auto px-4 md:px-8 pt-24">
                
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                    <button onClick={() => router.push('/services')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Services</button>
                    <ChevronRight size={14} />
                    <span className="text-gray-900 dark:text-white font-bold">Mobile Recharge</span>
                </nav>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
                    
                    {/* LEFT COLUMN: Main Flow */}
                    <div className="md:col-span-7 xl:col-span-6">
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-6">Prepaid Mobile</h1>

                        {/* STEP 1 & 2: Number Input & Provider Display */}
                        {(step === 1 || step === 2 || step === 3) && (
                            <motion.div layout className="mb-6 relative z-20">
                                <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 relative z-20 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50">
                                    <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 block">Mobile Number</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                                            <Smartphone size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <input 
                                                type="tel"
                                                placeholder="Enter 10 digit number"
                                                className="w-full text-2xl md:text-3xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-700 tracking-wide"
                                                value={number}
                                                onChange={(e) => {
                                                    setNumber(e.target.value.replace(/\D/g, ''));
                                                    if (e.target.value.length === 10) setStep(2);
                                                    else if (e.target.value.length < 10) setStep(1);
                                                }}
                                                maxLength={10}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Slide down auto-detect */}
                                <AnimatePresence>
                                    {detectedOperator && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -20, scaleY: 0 }}
                                            animate={{ opacity: 1, y: 0, scaleY: 1 }}
                                            exit={{ opacity: 0, y: -20, scaleY: 0 }}
                                            style={{ originY: 0 }}
                                            className="bg-gray-100 dark:bg-gray-800 -mt-6 pt-10 pb-4 px-6 rounded-b-3xl border border-t-0 border-gray-200 dark:border-gray-700 flex items-center justify-between z-10 relative shadow-inner"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black shadow-sm">
                                                    {detectedOperator.charAt(0)}
                                                </div>
                                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{detectedOperator} • {detectedCircle}</span>
                                            </div>
                                            <button className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">Change</button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* STEP 2: Plans View */}
                        {step === 2 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8"
                            >
                                {/* Search Plans */}
                                <div className="relative mb-6">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Search for a plan or amount" 
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-12 pr-4 py-4 shadow-sm text-sm focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all font-medium"
                                    />
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-2 sticky top-[72px] z-30 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-md pt-2">
                                    {['Recommended', 'Unlimited', 'Data', 'Talktime'].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                                                activeTab === tab 
                                                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md' 
                                                : 'bg-white text-gray-600 dark:bg-gray-900 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                {/* Plan Cards */}
                                <div className="space-y-4">
                                    <AnimatePresence mode="popLayout">
                                        {filteredPlans.map(plan => (
                                            <motion.div
                                                key={plan.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                onClick={() => handlePlanSelect(plan)}
                                                className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all relative overflow-hidden group"
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">₹{plan.price}</h3>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {plan.tags.map(tag => (
                                                                <span key={tag} className="text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 px-2 py-0.5 rounded-md">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                                                        <ChevronRight className="text-gray-400 group-hover:text-blue-500 transition-colors" size={18} />
                                                    </div>
                                                </div>
                                                
                                                <div className="flex gap-8 mb-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl">
                                                    <div className="flex flex-col gap-1 w-1/2 border-r border-gray-200 dark:border-gray-700">
                                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                            <Wifi size={14} /> Data
                                                        </div>
                                                        <span className="font-bold text-gray-900 dark:text-gray-100">{plan.data}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1 w-1/2 pl-2">
                                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                            <Phone size={14} /> Validity
                                                        </div>
                                                        <span className="font-bold text-gray-900 dark:text-gray-100">{plan.validity}</span>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex items-start gap-2">
                                                    <Info size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                    {plan.description}
                                                </p>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Desktop Sidebar */}
                    <div className="hidden md:block md:col-span-5 xl:col-span-4 lg:pl-8">
                        <div className="sticky top-28 space-y-6">
                            
                            {/* Recent Recharges */}
                            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <History size={18} className="text-blue-500" />
                                    Recent Recharges
                                </h3>
                                <div className="space-y-4">
                                    {[
                                        { num: '98765 43210', op: 'Jio', date: '12 Oct 2026', amount: '299' },
                                        { num: '91234 56780', op: 'Airtel', date: '05 Sep 2026', amount: '749' }
                                    ].map((recent, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400">
                                                    {recent.op.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white">{recent.num}</p>
                                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Last recharged: {recent.date}</p>
                                                </div>
                                            </div>
                                            <div className="font-black text-gray-900 dark:text-white">₹{recent.amount}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Promo Banner */}
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden group hover:shadow-indigo-500/25 transition-shadow">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors" />
                                <Star size={28} className="text-yellow-300 mb-4" />
                                <h3 className="text-2xl font-black mb-2 tracking-tight">Earn 5% Cashback</h3>
                                <p className="text-indigo-100 text-sm mb-6 leading-relaxed">Recharge via Intrust Wallet and get up to ₹50 cashback instantly on every recharge.</p>
                                <button className="bg-white text-indigo-600 px-6 py-3 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-95">
                                    Top up wallet
                                </button>
                            </div>

                        </div>
                    </div>
                </div>

            </main>

            {/* STEP 3: Checkout Bottom Sheet / Modal */}
            <AnimatePresence>
                {step === 3 && selectedPlan && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setStep(2)}
                            className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm z-50"
                        />
                        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 pointer-events-none">
                            <motion.div
                                initial={{ y: "100%", opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: "100%", opacity: 0 }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]"
                            >
                                <div className="p-6 md:p-8 overflow-y-auto">
                                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8 sm:hidden" />
                                    
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Confirm Recharge</h3>
                                    
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-3xl p-6 mb-6 border border-gray-100 dark:border-gray-700">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-gray-500 dark:text-gray-400 font-medium">Mobile Number</span>
                                            <span className="font-bold text-gray-900 dark:text-white text-lg">{number}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-6">
                                            <span className="text-gray-500 dark:text-gray-400 font-medium">Operator</span>
                                            <span className="font-bold text-gray-900 dark:text-white">{detectedOperator} • {detectedCircle}</span>
                                        </div>
                                        
                                        <div className="h-px w-full bg-gray-200 dark:bg-gray-700 my-4 border-dashed" />
                                        
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 dark:text-gray-400 font-bold">Amount to pay</span>
                                            <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">₹{selectedPlan.price}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handlePayment}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 md:py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98]"
                                    >
                                        Pay securely via UPI
                                        <ShieldCheck size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* STEP 4: Success State */}
            <AnimatePresence>
                {step === 4 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-emerald-500 z-50 flex flex-col items-center justify-center text-white"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                            className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-8 shadow-[0_0_100px_rgba(255,255,255,0.4)]"
                        >
                            <CheckCircle2 size={56} className="text-emerald-500" />
                        </motion.div>
                        <motion.h2 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-4xl font-black mb-3 tracking-tight"
                        >
                            Recharge Successful!
                        </motion.h2>
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-emerald-50 font-bold text-lg bg-black/10 px-6 py-2 rounded-full border border-white/10"
                        >
                            ₹{selectedPlan?.price} applied to {number}
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            {(step !== 3 && step !== 4) && <CustomerBottomNav />}
        </div>
    );
}
