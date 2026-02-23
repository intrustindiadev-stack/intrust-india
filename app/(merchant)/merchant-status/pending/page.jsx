'use client';

import { useRouter } from 'next/navigation';
import { Clock, Mail, Home, ArrowRight } from 'lucide-react';

export default function MerchantPendingPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden transition-colors">
            {/* Background embellishments */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10 dark:opacity-20"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

            <div className="max-w-2xl w-full merchant-glass rounded-3xl shadow-2xl overflow-hidden border border-black/5 dark:border-white/10">
                {/* Header */}
                <div className="bg-gradient-to-br from-[#D4AF37] to-[#B8860B] dark:from-[#D4AF37]/20 dark:to-[#B8860B]/20 p-8 sm:p-12 text-center relative border-b border-black/5 dark:border-white/10">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-white dark:bg-white/10 shadow-xl rounded-full flex items-center justify-center">
                        <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-[#D4AF37]" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-display font-bold mb-3 text-slate-800 dark:text-white">Application Under Review</h1>
                    <p className="text-slate-600 dark:text-slate-300 text-lg font-medium">We're reviewing your merchant application</p>
                </div>

                {/* Content */}
                <div className="p-8 sm:p-12 space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 dark:border-emerald-500/20">
                            <div className="w-10 h-10 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20 flex items-center justify-center flex-shrink-0 text-white">
                                <span className="material-icons-round">check</span>
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-slate-100">KYC Verified</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Your identity has been verified successfully</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-5 bg-[#D4AF37]/5 rounded-2xl border border-[#D4AF37]/10 dark:border-[#D4AF37]/20">
                            <div className="w-10 h-10 rounded-full bg-[#D4AF37] shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center flex-shrink-0 text-[#020617]">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-slate-100">Merchant Application Pending</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Our team is reviewing your business details</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-6 border border-black/5 dark:border-white/10">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-widest text-[10px]">What happens next?</h3>
                        <ul className="space-y-4">
                            {[
                                "Our team will verify your business details and documents",
                                "You'll receive an email notification once approved",
                                "Access to the merchant panel will be granted immediately"
                            ].map((step, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[#D4AF37] font-bold text-xs shrink-0">{i + 1}</span>
                                    <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{step}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="text-center pt-2">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium inline-flex items-center gap-2">
                            <Mail size={16} className="text-[#D4AF37]" />
                            Estimated approval time: <span className="font-bold text-slate-800 dark:text-white">1-2 business days</span>
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="flex-1 py-4 bg-[#D4AF37] text-white dark:text-[#020617] font-bold rounded-xl shadow-lg shadow-[#D4AF37]/20 hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 gold-glow"
                        >
                            <Home size={20} />
                            Return to Home
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex-1 py-4 bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold rounded-xl border border-black/5 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        >
                            Customer Dashboard
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
