'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Briefcase, Users, TrendingUp, ArrowRight, Sparkles, 
    MapPin, ChevronRight, Zap, DollarSign, Clock,
    UserCheck, Shield, Award
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

const ROLE_CONFIG = {
    freelancer: {
        label: 'Freelancer',
        icon: Zap,
        gradient: 'from-violet-600 to-indigo-600',
        badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
        bar: 'bg-violet-500',
    },
    agent: {
        label: 'Field Agent',
        icon: Users,
        gradient: 'from-blue-600 to-cyan-600',
        badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        bar: 'bg-blue-500',
    },
    dsa: {
        label: 'DSA Partner',
        icon: TrendingUp,
        gradient: 'from-emerald-600 to-teal-600',
        badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        bar: 'bg-emerald-500',
    },
    sales: {
        label: 'Sales Partner',
        icon: DollarSign,
        gradient: 'from-amber-600 to-orange-600',
        badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        bar: 'bg-amber-500',
    },
    other: {
        label: 'Career Role',
        icon: Briefcase,
        gradient: 'from-slate-700 to-slate-800',
        badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
        bar: 'bg-slate-500',
    }
};

const highlights = [
    { icon: DollarSign, label: 'Uncapped Earnings', sublabel: 'High commission slabs' },
    { icon: Clock, label: 'Flexible Work Hours', sublabel: 'Operate at your pace' },
    { icon: UserCheck, label: 'Mentorship & Support', sublabel: 'Free onboarding & toolkit' },
    { icon: Shield, label: 'Verified Brand', sublabel: 'Backed by Intrust India' },
];

export default function CareerOpportunitiesSection() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRoles() {
            try {
                const { data } = await supabase
                    .from('career_job_roles')
                    .select('id, title, category, description, commission_structure, location')
                    .eq('is_active', true)
                    .limit(6);
                setRoles(data || []);
            } catch (e) {
                // graceful fallback
            } finally {
                setLoading(false);
            }
        }
        fetchRoles();
    }, []);

    return (
        <section className="py-12 sm:py-16 font-[family-name:var(--font-outfit)] relative overflow-hidden">
            {/* Background subtle glow */}
            <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
                <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="text-center mb-8 sm:mb-10"
                >
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-bold uppercase tracking-wider mb-3">
                        <Briefcase size={13} />
                        Join Our Network
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Great Job & Freelancing <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">Opportunities</span>
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                        Become an InTrust Freelancer, Field Agent, or DSA Partner with flexible hours and unlimited earning potential.
                    </p>
                </motion.div>

                {/* Compact Highlights Strip */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.05 }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-8 sm:mb-10"
                >
                    {highlights.map((h, i) => {
                        const Icon = h.icon;
                        return (
                            <div
                                key={i}
                                className="flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-xs backdrop-blur-sm"
                            >
                                <div className="w-8 h-8 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                    <Icon size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{h.label}</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{h.sublabel}</p>
                                </div>
                            </div>
                        );
                    })}
                </motion.div>

                {/* Job Roles Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-8">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-8">
                        {roles.map((role, i) => {
                            const config = ROLE_CONFIG[role.category] || ROLE_CONFIG.other;
                            const Icon = config.icon;
                            const firstLineCommission = role.commission_structure?.split('\n')?.[0];

                            return (
                                <motion.div
                                    key={role.id}
                                    initial={{ opacity: 0, y: 16 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.35, delay: i * 0.05 }}
                                    className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 hover:border-violet-300 dark:hover:border-violet-500/40 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200"
                                >
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white shadow-xs`}>
                                                    <Icon size={15} />
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${config.badge}`}>
                                                    {config.label}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                                <MapPin size={11} />
                                                <span>{role.location || 'Pan India'}</span>
                                            </div>
                                        </div>

                                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                            {role.title}
                                        </h3>

                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                            {role.description}
                                        </p>

                                        {firstLineCommission && (
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                                <Award size={12} className="shrink-0" />
                                                <span className="truncate">{firstLineCommission}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-end">
                                        <Link
                                            href={`/career/apply?role=${role.id}`}
                                            className={`inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r ${config.gradient} text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-xs group-hover:gap-1.5`}
                                        >
                                            <span>Apply Now</span>
                                            <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Compact CTA Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-white/10 p-5 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md"
                >
                    <div className="space-y-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-1 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                            <Sparkles size={12} />
                            Partner Onboarding Open
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                            Ready to Build Your Career with InTrust?
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300">
                            Join hundreds of partners already earning attractive commissions across India.
                        </p>
                    </div>

                    <Link
                        href="/career/apply"
                        className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm"
                    >
                        <span>Explore All Openings</span>
                        <ArrowRight size={15} />
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}

