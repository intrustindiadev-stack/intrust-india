'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, ChevronRight, Sparkles, TrendingUp, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';

const roleIcons = {
    freelancer: Zap,
    agent: Users,
    dsa: TrendingUp,
    sales: TrendingUp,
    other: Briefcase,
};

const roleColors = {
    freelancer: 'from-violet-500 to-purple-600',
    agent: 'from-blue-500 to-cyan-600',
    dsa: 'from-emerald-500 to-teal-600',
    sales: 'from-orange-500 to-amber-600',
    other: 'from-gray-500 to-slate-600',
};

export default function CareerOpportunityCard() {
    const { user, profile } = useAuth();
    const [existingApp, setExistingApp] = useState(null);
    const [topRoles, setTopRoles] = useState([]);
    const [loadingApp, setLoadingApp] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [rolesRes, appRes] = await Promise.all([
                    supabase.from('career_job_roles').select('id, title, category').eq('is_active', true).limit(3),
                    user ? supabase.from('career_applications').select('id, status, role_category').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
                ]);
                setTopRoles(rolesRes.data || []);
                setExistingApp(appRes.data || null);
            } finally {
                setLoadingApp(false);
            }
        }
        load();
    }, [user]);

    const statusConfig = {
        pending: { label: 'Application Pending', color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
        under_review: { label: 'Under Review', color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
        approved: { label: '✓ Approved!', color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
        rejected: { label: 'Not Selected', color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-slate-900 border border-white/10 shadow-xl"
        >
            {/* Ambient blobs */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 p-6">
                {/* Header */}
                <div className="flex items-start gap-3 mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
                        <Briefcase size={20} className="text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-white font-bold text-base leading-tight">Career Opportunities</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                                <Sparkles size={9} /> New
                            </span>
                        </div>
                        <p className="text-gray-400 text-xs mt-0.5">Join Intrust as Freelancer, Agent or DSA</p>
                    </div>
                </div>

                {/* Existing application status */}
                {!loadingApp && existingApp && (
                    <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${statusConfig[existingApp.status]?.color}`}>
                        {statusConfig[existingApp.status]?.label}
                        {existingApp.status === 'approved' && (
                            <p className="text-xs font-normal mt-0.5 opacity-80">Your panel access will be activated shortly by admin.</p>
                        )}
                    </div>
                )}

                {/* Top 3 roles preview */}
                {!loadingApp && topRoles.length > 0 && (
                    <div className="space-y-2 mb-5">
                        {topRoles.map((role) => {
                            const Icon = roleIcons[role.category] || Briefcase;
                            const grad = roleColors[role.category] || roleColors.other;
                            return (
                                <Link
                                    key={role.id}
                                    href={`/career/apply?role=${role.id}`}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
                                >
                                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0`}>
                                        <Icon size={14} className="text-white" />
                                    </div>
                                    <span className="text-sm text-gray-200 font-medium flex-1 line-clamp-1">{role.title}</span>
                                    <ChevronRight size={14} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
                                </Link>
                            );
                        })}
                    </div>
                )}

                {loadingApp && (
                    <div className="space-y-2 mb-5">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
                        ))}
                    </div>
                )}

                {/* CTA */}
                <Link
                    href="/career/apply"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold rounded-2xl transition-all text-sm shadow-lg shadow-violet-500/25"
                >
                    {existingApp ? 'View My Application' : 'Apply Now — It\'s Free'}
                    <ChevronRight size={15} />
                </Link>
            </div>
        </motion.div>
    );
}
