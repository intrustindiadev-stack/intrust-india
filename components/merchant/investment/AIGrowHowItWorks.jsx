'use client';

import { useState } from 'react';
import { Send, CheckCircle2, BarChart2, Percent, Eye, ChevronDown } from 'lucide-react';

const STEPS = [
    {
        icon: Send,
        color: 'from-indigo-500 to-violet-600',
        bg: 'bg-indigo-50',
        text: 'text-indigo-600',
        title: 'Submit Your Request',
        detail: 'Enter the amount you want to grow (minimum ₹10,000). Our team gets notified instantly.',
        tag: 'Step 1',
    },
    {
        icon: CheckCircle2,
        color: 'from-emerald-500 to-teal-600',
        bg: 'bg-emerald-50',
        text: 'text-emerald-600',
        title: 'Admin Activates Fund',
        detail: 'Our team reviews your request and deploys your capital into verified supply chain trade orders.',
        tag: 'Step 2',
    },
    {
        icon: BarChart2,
        color: 'from-blue-500 to-cyan-600',
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        title: 'Capital Gets Deployed',
        detail: 'Your money enters real trade orders — FMCG, Electronics, Agriculture & more. Every rupee is tracked.',
        tag: 'Step 3',
    },
    {
        icon: Percent,
        color: 'from-amber-500 to-orange-600',
        bg: 'bg-amber-50',
        text: 'text-amber-600',
        title: 'Profits Are Generated',
        detail: 'Each completed order adds profit to your account via our dynamic profit-sharing model.',
        tag: 'Step 4',
    },
    {
        icon: Eye,
        color: 'from-rose-500 to-pink-600',
        bg: 'bg-rose-50',
        text: 'text-rose-600',
        title: 'Track Everything Live',
        detail: 'Watch every trade order, profit credit, and fund status in real time from your AI Grow dashboard.',
        tag: 'Step 5',
    },
];

export default function AIGrowHowItWorks() {
    const [openStep, setOpenStep] = useState(null);

    return (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
            {/* Section header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
                    <span className="text-white text-base">✦</span>
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">How AI Grow Works</h3>
                    <p className="text-slate-400 text-xs font-medium">5 simple steps to growing your money</p>
                </div>
            </div>

            {/* Desktop: horizontal cards — Mobile: accordion */}
            <div className="hidden md:grid md:grid-cols-5 gap-3">
                {STEPS.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.tag} className="flex flex-col gap-3 p-5 rounded-[1.5rem] border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all group">
                            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                                <Icon size={18} className={s.text} />
                            </div>
                            <div>
                                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${s.text}`}>{s.tag}</p>
                                <p className="text-sm font-black text-slate-900 leading-snug">{s.title}</p>
                                <p className="text-slate-500 text-xs font-medium mt-2 leading-relaxed">{s.detail}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Mobile accordion */}
            <div className="md:hidden space-y-2">
                {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const isOpen = openStep === i;
                    return (
                        <div key={s.tag} className={`rounded-2xl border transition-all ${isOpen ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-100 bg-slate-50/50'}`}>
                            <button
                                onClick={() => setOpenStep(isOpen ? null : i)}
                                className="flex items-center gap-3 w-full p-4 text-left"
                            >
                                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                                    <Icon size={16} className={s.text} />
                                </div>
                                <div className="flex-1">
                                    <p className={`text-[9px] font-black uppercase tracking-widest ${s.text}`}>{s.tag}</p>
                                    <p className="text-sm font-black text-slate-900 leading-snug">{s.title}</p>
                                </div>
                                <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isOpen && (
                                <div className="px-4 pb-4">
                                    <p className="text-slate-500 text-sm font-medium leading-relaxed pl-12">{s.detail}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
