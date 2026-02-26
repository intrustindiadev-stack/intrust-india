import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import Link from 'next/link';
import { ShieldCheck, Zap, Clock, ChevronRight } from 'lucide-react';

export const metadata = {
    title: "Personal Loan India | Instant Approval & Low Interest",
    description: "Apply for instant personal loans in India with InTrust India. Get fast approval, minimal documentation, and competitive interest rates for all your needs.",
    keywords: ["personal loan india", "instant loan approval", "low interest loans", "fast personal loans"],
    alternates: {
        canonical: "/loans/personal",
    },
};

export default function PersonalLoanPage() {
    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 font-[family-name:var(--font-outfit)] pb-28">
            <Navbar theme="light" />

            <div className="pt-28 px-4 md:px-8 max-w-4xl mx-auto">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-[#171A21] dark:text-gray-100 mb-6 tracking-tight">
                        Instant Personal Loans in India
                    </h1>
                    <p className="text-lg text-slate-500 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                        Get the financial support you need with our fast, secure, and hassle-free personal loan solutions.
                    </p>
                    <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-[#171A21] text-white rounded-2xl font-semibold hover:scale-105 transition-all">
                        Apply Now
                        <ChevronRight size={20} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                            <Zap size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Instant Approval</h3>
                        <p className="text-slate-500 text-sm">Get your loan status in minutes with our automated processing.</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                            <Clock size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Minimal Docs</h3>
                        <p className="text-slate-500 text-sm">Completely digital process. No physical documents required.</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                            <ShieldCheck size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Secure & Safe</h3>
                        <p className="text-slate-500 text-sm">Your data is encrypted and protected with bank-grade security.</p>
                    </div>
                </div>

                <section className="bg-white dark:bg-gray-800 p-10 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm mb-12">
                    <h2 className="text-2xl font-bold mb-6">Why Choose InTrust India?</h2>
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="mt-1 text-emerald-500"><ShieldCheck size={20} /></div>
                            <div>
                                <h4 className="font-bold">Transparent Rates</h4>
                                <p className="text-sm text-slate-500">No hidden charges. What you see is what you get.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="mt-1 text-emerald-500"><ShieldCheck size={20} /></div>
                            <div>
                                <h4 className="font-bold">Flexible Repayment</h4>
                                <p className="text-sm text-slate-500">Choose a tenure that suits your financial situation.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="mt-1 text-emerald-500"><ShieldCheck size={20} /></div>
                            <div>
                                <h4 className="font-bold">Digital KYC</h4>
                                <p className="text-sm text-slate-500">Quick and easy identity verification from your smartphone.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <CustomerBottomNav />
        </div>
    );
}
