'use client';

import { motion } from 'framer-motion';
import { Sparkles, Bell, ArrowLeft, Construction, Clock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function ComingSoonPage() {
    return (
        <div className="min-h-screen flex flex-col bg-[#FAFAFA] dark:bg-gray-900 font-[family-name:var(--font-outfit)]">
            <Navbar />

            <main className="flex-grow flex items-center justify-center relative overflow-hidden pt-[10vh] pb-20 px-4 sm:px-6 z-10">
                {/* Background Elements */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }} />

                <div className="max-w-3xl w-full mx-auto text-center relative z-20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="mb-8 flex justify-center"
                    >
                        <div className="w-20 h-20 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl border border-white/40 dark:border-gray-700 shadow-2xl rounded-3xl flex items-center justify-center">
                            <Construction size={40} className="text-blue-500" />
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-4xl sm:text-6xl font-black text-gray-900 dark:text-white tracking-tight mb-6"
                    >
                        We're Crafting <br className="hidden sm:block" />
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Something Amazing</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed"
                    >
                        Our team is working hard to bring you this new feature. It's currently under construction and will be available very soon.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-8 rounded-3xl border border-white/50 dark:border-gray-700 shadow-xl max-w-lg mx-auto mb-12"
                    >
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-2">
                            <Sparkles size={20} className="text-blue-500" />
                            Available on Main Website
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                            While we are building the new integrated experience here, you can seamlessly access all these services right now on our main website.
                        </p>

                        <a
                            href="https://intrustfinanceindia.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex justify-center items-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all transform hover:scale-[1.02] active:scale-95"
                        >
                            Go to intrustfinanceindia.com
                            <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-6"
                    >
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 font-bold rounded-xl hover:shadow-lg transition-all"
                        >
                            <ArrowLeft size={18} />
                            Back to Dashboard
                        </Link>

                        <div className="flex items-center gap-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1"><Clock size={16} /> Coming Soon</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                            <span className="flex items-center gap-1"><ShieldCheck size={16} /> Safe & Secure</span>
                        </div>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
