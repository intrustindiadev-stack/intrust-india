'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Home, ExternalLink, MessageSquare } from 'lucide-react';
import dynamic from 'next/dynamic';

// Confetti Component (Simple Implementation)
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

export default function ApplicationSuccessPage() {
    const router = useRouter();
    const [showConfetti, setShowConfetti] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setShowConfetti(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center relative overflow-hidden font-[family-name:var(--font-outfit)]">
            {showConfetti && <Confetti />}

            {/* Dynamic Background */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-b from-blue-50 to-indigo-50 rounded-full blur-3xl opacity-60 translate-x-1/3 -translate-y-1/4" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-t from-emerald-50 to-teal-50 rounded-full blur-3xl opacity-60 -translate-x-1/3 translate-y-1/4" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-lg bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 md:p-12 text-center relative border border-white/50"
            >
                {/* Checkmark Animation */}
                <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                        className="w-full h-full bg-gradient-to-tr from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30"
                    >
                        <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <motion.path
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.5, delay: 0.5 }}
                                d="M20 6L9 17l-5-5"
                            />
                        </svg>
                    </motion.div>

                    {/* Ripple Effects */}
                    <motion.div
                        animate={{ scale: [1, 1.5, 1.5], opacity: [0.5, 0, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-green-400 rounded-full -z-10"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.8, 1.8], opacity: [0.3, 0, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                        className="absolute inset-0 bg-green-400 rounded-full -z-20"
                    />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Application Submitted!</h1>
                    <p className="text-slate-500 text-lg mb-8 leading-relaxed">
                        We've received your application. Our team will verify your documents and activate your account within <span className="text-slate-900 font-bold">24 hours</span>.
                    </p>

                    <div className="bg-blue-50/50 rounded-2xl p-5 mb-8 border border-blue-100 text-left flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-bold text-lg">
                            1
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-sm">Under Review</h3>
                            <p className="text-xs text-slate-500 mt-1">Our verification team is currently reviewing your GST and Bank details.</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => router.push('/')}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group"
                        >
                            <Home size={18} />
                            Return to Homepage
                        </button>
                        <button
                            onClick={() => router.push('/contact')}
                            className="w-full py-4 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-2xl border border-gray-200 transition-all flex items-center justify-center gap-2 group"
                        >
                            <MessageSquare size={18} />
                            Contact Support
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
