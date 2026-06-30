'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Search, Tv, Zap, Flame, Car, FileText, ChevronRight, ShieldCheck, CheckCircle2, RotateCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

export default function UtilityRechargePage({ params }) {
    const router = useRouter();
    const { type } = params;
    
    const [step, setStep] = useState(1); // 1 = Provider Select, 2 = Enter ID, 3 = Fetching, 4 = Bill Details & Pay, 5 = Success
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [consumerId, setConsumerId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Dynamic config based on type
    const config = {
        dth: { title: 'DTH Recharge', icon: Tv, inputLabel: 'Subscriber ID', inputPlaceholder: 'Enter 10-digit DTH ID' },
        electricity: { title: 'Electricity Bill', icon: Zap, inputLabel: 'Consumer Number', inputPlaceholder: 'Enter Consumer/CA Number' },
        gas: { title: 'Gas Booking', icon: Flame, inputLabel: 'Consumer ID', inputPlaceholder: 'Enter Gas Consumer Number' },
        fastag: { title: 'FASTag Recharge', icon: Car, inputLabel: 'Vehicle Registration', inputPlaceholder: 'e.g., MH01AB1234' }
    }[type] || { title: 'Utility Bill', icon: FileText, inputLabel: 'Account Number', inputPlaceholder: 'Enter ID' };

    const mockProviders = {
        dth: ['Tata Play', 'Airtel Digital TV', 'Dish TV', 'Sun Direct', 'd2h'],
        electricity: ['BSES Rajdhani', 'Tata Power (DDL)', 'Adani Electricity', 'MSEDC (Mahavitaran)'],
        gas: ['Indane Gas', 'Bharat Gas', 'HP Gas'],
        fastag: ['HDFC Bank FASTag', 'ICICI Bank FASTag', 'Paytm Payments Bank', 'IDFC First FASTag']
    }[type] || ['Provider A', 'Provider B'];

    const filteredProviders = mockProviders.filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleProviderSelect = (provider) => {
        setSelectedProvider(provider);
        setStep(2);
    };

    const handleFetchBill = (e) => {
        e.preventDefault();
        setStep(3);
        setTimeout(() => setStep(4), 2500); // Mock fetch time
    };

    const handlePayment = () => {
        setStep(5);
        setTimeout(() => router.push('/dashboard'), 3000);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-[family-name:var(--font-outfit)] relative pb-20">
            
            <Navbar theme="light" />

            <main className="max-w-7xl mx-auto px-4 md:px-8 pt-24">
                
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                    <button onClick={() => router.push('/services')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Services</button>
                    <ChevronRight size={14} />
                    <span className="text-gray-900 dark:text-white font-bold">{config.title}</span>
                </nav>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
                    
                    {/* LEFT COLUMN: Main Flow */}
                    <div className="md:col-span-7 xl:col-span-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <config.icon size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{config.title}</h1>
                        </div>

                        <AnimatePresence mode="wait">
                            
                            {/* STEP 1: Provider Selection */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <div className="relative mb-6">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input 
                                            type="text" 
                                            placeholder="Search by biller name" 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl pl-11 pr-4 py-4 shadow-sm focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all font-medium"
                                        />
                                    </div>

                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 ml-1">All Billers</h3>
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                                        {filteredProviders.map((provider, i) => (
                                            <div 
                                                key={provider}
                                                onClick={() => handleProviderSelect(provider)}
                                                className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${i !== filteredProviders.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400">
                                                    {provider.charAt(0)}
                                                </div>
                                                <span className="font-semibold text-gray-900 dark:text-gray-100">{provider}</span>
                                            </div>
                                        ))}
                                        {filteredProviders.length === 0 && (
                                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">No billers found</div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 2: Enter ID */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between mb-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-lg">
                                                {selectedProvider?.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 dark:text-white">{selectedProvider}</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Selected Biller</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setStep(1)} className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                            Change
                                        </button>
                                    </div>

                                    <form onSubmit={handleFetchBill} className="space-y-6">
                                        <div>
                                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">{config.inputLabel}</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder={config.inputPlaceholder}
                                                value={consumerId}
                                                onChange={(e) => setConsumerId(e.target.value)}
                                                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium shadow-sm"
                                            />
                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 ml-1">Please check your latest bill for the correct {config.inputLabel.toLowerCase()}.</p>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={!consumerId}
                                            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 shadow-md"
                                        >
                                            Fetch Bill
                                        </button>
                                    </form>
                                </motion.div>
                            )}

                            {/* STEP 3: Fetching Loader */}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center justify-center py-32"
                                >
                                    <div className="w-16 h-16 border-4 border-gray-100 dark:border-gray-800 border-t-blue-500 rounded-full animate-spin mb-6" />
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Fetching your bill...</h2>
                                    <p className="text-gray-500 dark:text-gray-400">Connecting to {selectedProvider}</p>
                                </motion.div>
                            )}

                            {/* STEP 4: Bill Details & Pay */}
                            {step === 4 && (
                                <motion.div
                                    key="step4"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                                        {/* Bill receipt design */}
                                        <div className="absolute top-0 left-0 w-full h-2 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-200 via-gray-100 to-transparent dark:from-gray-700 dark:via-gray-800" style={{ backgroundSize: '16px 8px', backgroundRepeat: 'repeat-x' }} />
                                        
                                        <div className="text-center mt-4 mb-8">
                                            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-2xl mx-auto mb-4">
                                                {selectedProvider?.charAt(0)}
                                            </div>
                                            <h3 className="font-bold text-gray-900 dark:text-white mb-1">{selectedProvider}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{consumerId}</p>
                                        </div>

                                        <div className="space-y-4 mb-8">
                                            <div className="flex justify-between items-center pb-4 border-b border-dashed border-gray-200 dark:border-gray-700">
                                                <span className="text-gray-500 dark:text-gray-400 font-medium">Customer Name</span>
                                                <span className="font-bold text-gray-900 dark:text-white">Rajesh Kumar</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-4 border-b border-dashed border-gray-200 dark:border-gray-700">
                                                <span className="text-gray-500 dark:text-gray-400 font-medium">Bill Date</span>
                                                <span className="font-bold text-gray-900 dark:text-white">12 Oct 2026</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-4 border-b border-dashed border-gray-200 dark:border-gray-700">
                                                <span className="text-gray-500 dark:text-gray-400 font-medium">Due Date</span>
                                                <span className="font-black text-red-500">25 Oct 2026</span>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-5 mb-8 flex justify-between items-center border border-gray-100 dark:border-gray-800">
                                            <span className="font-bold text-gray-600 dark:text-gray-400">Total Amount</span>
                                            <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">₹1,450</span>
                                        </div>

                                        <button
                                            onClick={handlePayment}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 active:scale-[0.98]"
                                        >
                                            Pay securely via UPI
                                            <ShieldCheck size={20} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>

                    {/* RIGHT COLUMN: Desktop Sidebar */}
                    <div className="hidden md:block md:col-span-5 xl:col-span-4 lg:pl-8">
                        <div className="sticky top-28 space-y-6">
                            
                            {/* Autopay Banner */}
                            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                                    <RotateCw size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Never miss a due date!</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">Set up AutoPay for {config.title.toLowerCase()}s and we'll automatically pay them before they are due.</p>
                                <button className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    Set up AutoPay
                                </button>
                            </div>

                            {/* Info Banner */}
                            <div className="bg-blue-600 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                                <ShieldCheck size={24} className="text-blue-300 mb-4" />
                                <h3 className="text-lg font-black mb-2 tracking-tight">100% Safe & Secure</h3>
                                <p className="text-blue-100 text-sm leading-relaxed">Your payments are protected by bank-grade encryption and processed instantly.</p>
                            </div>

                        </div>
                    </div>
                </div>

            </main>

            {/* STEP 5: Success State */}
            <AnimatePresence>
                {step === 5 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-green-500 z-50 flex flex-col items-center justify-center text-white p-4 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                            className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl"
                        >
                            <CheckCircle2 size={56} className="text-green-500" />
                        </motion.div>
                        <motion.h2 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-4xl font-black mb-3 tracking-tight"
                        >
                            Payment Successful!
                        </motion.h2>
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-green-50 font-medium text-lg bg-black/10 px-6 py-2 rounded-full"
                        >
                            ₹1,450 paid to {selectedProvider}
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            {(step !== 4 && step !== 5) && <CustomerBottomNav />}
        </div>
    );
}
