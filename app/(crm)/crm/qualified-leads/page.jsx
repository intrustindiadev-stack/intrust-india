'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingCart, Sun, Smartphone, CreditCard, FileText, Monitor, Car } from 'lucide-react';

const SERVICES = [
    { id: 'e-commerce', name: 'E-commerce', icon: ShoppingCart, color: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-500/30' },
    { id: 'solar', name: 'Solar', icon: Sun, color: 'from-amber-400 to-orange-500', shadow: 'shadow-orange-500/30' },
    { id: 'nfc', name: 'NFC', icon: Smartphone, color: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-500/30' },
    { id: 'loan', name: 'Loan', icon: CreditCard, color: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-500/30' },
    { id: 'cibil', name: 'CIBIL', icon: FileText, color: 'from-slate-600 to-slate-800', shadow: 'shadow-slate-500/30' },
    { id: 'pos-system', name: 'POS System', icon: Monitor, color: 'from-indigo-400 to-indigo-600', shadow: 'shadow-indigo-500/30' },
    { id: 'fastag', name: 'Fastag', icon: Car, color: 'from-rose-400 to-rose-600', shadow: 'shadow-rose-500/30' },
];

export default function QualifiedLeadsPage() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)]">
            <div className="max-w-7xl mx-auto">
                <div className="mb-10 text-center sm:text-left">
                    <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Qualified Leads</h1>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-2">
                        Select a service category to view and pitch your qualified leads.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                    {SERVICES.map((service, index) => (
                        <Link key={service.id} href={`/crm/qualified-leads/${service.id}`}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`aspect-square rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br ${service.color} ${service.shadow} shadow-2xl p-1 relative overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-300`}
                            >
                                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full group-hover:scale-150 transition-transform duration-700" />
                                <div className="w-full h-full rounded-[1.75rem] sm:rounded-[2.25rem] bg-white/10 backdrop-blur-md flex flex-col items-center justify-center border border-white/20 gap-3">
                                    <service.icon size={48} className="text-white drop-shadow-md sm:w-16 sm:h-16" strokeWidth={2} />
                                    <span className="text-white font-black text-sm sm:text-base tracking-widest uppercase drop-shadow-md px-2 text-center leading-tight">
                                        {service.name}
                                    </span>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
