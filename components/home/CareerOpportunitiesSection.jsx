'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Briefcase, Users, TrendingUp, ArrowRight, Sparkles, 
    MapPin, Star, ChevronRight, Zap, DollarSign, Clock,
    UserCheck, Shield, Award
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

const ROLE_CONFIG = {
    freelancer: {
        label: 'Freelancer',
        icon: Zap,
        gradient: 'from-violet-600 to-purple-600',
        lightBg: 'from-violet-500/10 to-purple-500/10',
        border: 'border-violet-500/20',
        badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    },
    agent: {
        label: 'Field Agent',
        icon: Users,
        gradient: 'from-blue-600 to-cyan-600',
        lightBg: 'from-blue-500/10 to-cyan-500/10',
        border: 'border-blue-500/20',
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    },
    dsa: {
        label: 'DSA Partner',
        icon: TrendingUp,
        gradient: 'from-emerald-600 to-teal-600',
        lightBg: 'from-emerald-500/10 to-teal-500/10',
        border: 'border-emerald-500/20',
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    sales: {
        label: 'Sales',
        icon: DollarSign,
        gradient: 'from-orange-600 to-amber-600',
        lightBg: 'from-orange-500/10 to-amber-500/10',
        border: 'border-orange-500/20',
        badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    },
    other: {
        label: 'Other',
        icon: Briefcase,
        gradient: 'from-gray-600 to-slate-600',
        lightBg: 'from-gray-500/10 to-slate-500/10',
        border: 'border-gray-500/20',
        badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    }
};

const highlights = [
    { icon: DollarSign, label: 'No Fixed Salary Cap', sublabel: 'Unlimited earning potential' },
    { icon: Clock, label: 'Flexible Timings', sublabel: 'Work at your own pace' },
    { icon: UserCheck, label: 'Dedicated Support', sublabel: 'Training & mentorship provided' },
    { icon: Shield, label: 'Trusted Platform', sublabel: 'Backed by Intrust Financial' },
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
        <section className="py-16 sm:py-24 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-14"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-sm font-semibold mb-6">
                        <Briefcase size={14} />
                        Career Opportunities
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
                        Great Job & Freelancing<br className="hidden sm:block" />
                        <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"> Opportunities</span>
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
                        Partner with Intrust Financial Services. Become a Freelancer, Field Agent, or DSA and unlock unlimited earning potential — on your own terms.
                    </p>
                </motion.div>

                {/* Highlights */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16"
                >
                    {highlights.map((h, i) => {
                        const Icon = h.icon;
                        return (
                            <div key={i} className="flex flex-col items-center text-center p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mb-3 shadow-lg shadow-violet-500/20">
                                    <Icon size={18} className="text-white" />
                                </div>
                                <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{h.label}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{h.sublabel}</p>
                            </div>
                        );
                    })}
                </motion.div>

                {/* Job Roles Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-56 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        {roles.map((role, i) => {
                            const config = ROLE_CONFIG[role.category] || ROLE_CONFIG.other;
                            const Icon = config.icon;
                            return (
                                <motion.div
                                    key={role.id}
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: i * 0.08 }}
                                    className={`group relative overflow-hidden rounded-3xl bg-white dark:bg-gray-800/80 border ${config.border} shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer`}
                                >
                                    {/* Top gradient */}
                                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${config.gradient}`} />

                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
                                                <Icon size={22} className="text-white" />
                                            </div>
                                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${config.badge}`}>
                                                {config.label}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-snug">
                                            {role.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                                            {role.description}
                                        </p>

                                        {/* Commission highlight */}
                                        {role.commission_structure && (
                                            <div className={`rounded-xl bg-gradient-to-br ${config.lightBg} border ${config.border} p-3 mb-4`}>
                                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                    <Award size={12} />
                                                    Earnings
                                                </p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                                    {role.commission_structure?.split('\n')[0]}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                                <MapPin size={11} />
                                                {role.location || 'Pan India'}
                                            </div>
                                            <Link
                                                href={`/career/apply?role=${role.id}`}
                                                className={`inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r ${config.gradient} text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-md group-hover:gap-2.5`}
                                            >
                                                Apply Now
                                                <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                                            </Link>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* CTA Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-slate-900 border border-white/10 p-8 sm:p-12 text-center"
                >
                    <div className="absolute top-0 left-1/3 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm font-semibold mb-6">
                            <Sparkles size={14} />
                            Limited Openings Available
                        </div>
                        <h3 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">
                            Ready to Build Your Career?
                        </h3>
                        <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
                            Join 500+ partners already earning with Intrust Financial Services. Submit your application today.
                        </p>
                        <Link
                            href="/career/apply"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_40px_rgba(124,58,237,0.4)] hover:shadow-[0_0_60px_rgba(124,58,237,0.5)] text-lg"
                        >
                            Explore All Openings
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
