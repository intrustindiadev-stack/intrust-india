'use client';

import { motion } from 'framer-motion';
import { AlertOctagon, Mail, ShieldAlert, ArrowRight } from 'lucide-react';

export default function MerchantSuspendedPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden transition-colors duration-500">
            {/* Animated Background Gradients */}
            <motion.div 
                animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.4, 0.6, 0.4],
                    rotate: [0, 90, 0]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-red-400/20 dark:bg-red-600/10 rounded-full blur-[100px] pointer-events-none"
            />
            <motion.div 
                animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 0.5, 0.3],
                    rotate: [0, -90, 0]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-orange-400/20 dark:bg-orange-600/10 rounded-full blur-[100px] pointer-events-none"
            />

            {/* Glass Container */}
            <motion.div 
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-2xl bg-white/40 dark:bg-white/[0.03] backdrop-blur-3xl border border-white/60 dark:border-white/10 rounded-[2.5rem] shadow-2xl dark:shadow-[0_8px_40px_0_rgba(0,0,0,0.4)] overflow-hidden"
            >
                {/* Header Section */}
                <div className="relative p-10 pb-8 text-center border-b border-black/5 dark:border-white/10 overflow-hidden">
                    {/* Header bg effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-red-500/10 dark:from-red-500/20 to-transparent pointer-events-none" />
                    
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                        className="mx-auto w-24 h-24 rounded-full bg-white dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 flex items-center justify-center mb-6 relative shadow-xl dark:shadow-[0_0_40px_rgba(239,68,68,0.3)]"
                    >
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <AlertOctagon className="w-12 h-12 text-red-500 drop-shadow-md" />
                        </motion.div>
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-4xl font-display font-black tracking-tight mb-3 text-slate-800 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-white/60"
                    >
                        Account Suspended
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-slate-600 dark:text-slate-400 text-lg font-medium"
                    >
                        Your merchant account has been temporarily disabled.
                    </motion.p>
                </div>

                {/* Content Section */}
                <div className="p-10 space-y-8">
                    {/* Action Required Box */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5, type: "spring" }}
                        whileHover={{ scale: 1.02 }}
                        className="flex items-start gap-5 p-6 bg-white/50 dark:bg-red-500/5 rounded-3xl border border-red-100 dark:border-red-500/20 shadow-sm dark:shadow-none transition-transform"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shrink-0 shadow-lg shadow-red-500/30">
                            <ShieldAlert className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white text-lg mb-1">Action Required</p>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                We've identified an issue with your account. Please contact our support team immediately to resolve this and restore your access.
                            </p>
                        </div>
                    </motion.div>

                    {/* Information List */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-white/40 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-3xl p-8 shadow-sm dark:shadow-none"
                    >
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-6">Current Restrictions</h3>
                        <ul className="space-y-5">
                            {[
                                "Your public storefront is hidden from potential customers",
                                "You cannot accept new orders, bookings, or payments",
                                "Pending orders must still be fulfilled or fully refunded"
                            ].map((step, i) => (
                                <motion.li 
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.7 + (i * 0.1) }}
                                    className="flex items-center gap-4 group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-500 font-bold text-sm border border-red-200 dark:border-red-500/20 shrink-0 group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
                                        {i + 1}
                                    </div>
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">{step}</span>
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Contact Action */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                        className="pt-4"
                    >
                        <motion.a
                            href="mailto:support@intrust.com"
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative flex items-center justify-center gap-3 w-full py-5 px-8 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-lg shadow-[0_10px_30px_rgba(239,68,68,0.3)] dark:shadow-[0_0_30px_rgba(239,68,68,0.4)] overflow-hidden"
                        >
                            {/* Hover light effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                            
                            <Mail className="w-6 h-6" />
                            <span>Contact Support</span>
                            <ArrowRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </motion.a>
                        
                        <p className="text-center text-slate-500 dark:text-slate-500 mt-4 text-sm flex items-center justify-center gap-2 font-medium">
                            Direct email: <span className="text-slate-700 dark:text-slate-300 hover:text-red-500 dark:hover:text-white transition-colors">support@intrust.com</span>
                        </p>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
