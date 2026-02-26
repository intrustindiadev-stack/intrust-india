import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import Link from 'next/link';
import { Landmark, TrendingUp, Handshake, ChevronRight } from 'lucide-react';

export const metadata = {
    title: "Business Loan Bhopal | Grow Your Business with InTrust India",
    description: "Apply for quick business loans in Bhopal. InTrust India provides collateral-free loans to help small and medium enterprises grow with ease.",
    keywords: ["business loan bhopal", "msme loan bhopal", "business funding bhopal", "unsecured business loans"],
    alternates: {
        canonical: "/loans/business",
    },
};

export default function BusinessLoanPage() {
    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 font-[family-name:var(--font-outfit)] pb-28">
            <Navbar theme="light" />

            <div className="pt-28 px-4 md:px-8 max-w-4xl mx-auto">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-[#171A21] dark:text-gray-100 mb-6 tracking-tight">
                        Business Loans in Bhopal
                    </h1>
                    <p className="text-lg text-slate-500 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                        Fuel your business growth with collateral-free funding designed for Bhopal's entrepreneurs.
                    </p>
                    <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-[#171A21] text-white rounded-2xl font-semibold hover:scale-105 transition-all">
                        Get Started
                        <ChevronRight size={20} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6">
                            <Landmark size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Collateral Free</h3>
                        <p className="text-slate-500 text-sm">No security required for loans up to designated limits.</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                            <TrendingUp size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Quick Funding</h3>
                        <p className="text-slate-500 text-sm">Funds disbursed directly to your business account within days.</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-6">
                            <Handshake size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">MSME Support</h3>
                        <p className="text-slate-500 text-sm">Special schemes and guidance for small business owners.</p>
                    </div>
                </div>

                <section className="bg-[#171A21] text-white p-10 rounded-[32px] shadow-xl mb-12">
                    <h2 className="text-2xl font-bold mb-6">Grow Your Enterprise Today</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 font-medium">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            Easy Application Process
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            Low Processing Fees
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            No Hidden Charges
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            Dedicated Account Manager
                        </div>
                    </div>
                </section>
            </div>

            <CustomerBottomNav />
        </div>
    );
}
