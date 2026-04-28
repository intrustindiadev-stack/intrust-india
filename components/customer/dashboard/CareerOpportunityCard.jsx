'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, ChevronRight, Sparkles, TrendingUp, Users, Zap, DollarSign, Clock, CheckCircle2, XCircle, Calendar, Send, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';

const roleIcons = { freelancer: Zap, agent: Users, dsa: TrendingUp, sales: DollarSign, other: Briefcase };
const roleGrads = {
    freelancer: 'from-violet-500 to-purple-600',
    agent: 'from-blue-500 to-cyan-600',
    dsa: 'from-emerald-500 to-teal-600',
    sales: 'from-orange-500 to-amber-600',
    other: 'from-gray-500 to-slate-600',
};

const STATUS_CONFIG = {
    pending:              { label: 'Application Received', icon: Send,         color: 'text-blue-400',    bg: 'bg-blue-500/15 border-blue-500/25' },
    under_review:         { label: 'Under Review',          icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/25' },
    interview_scheduled:  { label: 'Interview Scheduled',   icon: Calendar,     color: 'text-violet-400',  bg: 'bg-violet-500/15 border-violet-500/25' },
    offer_sent:           { label: 'Offer Extended!',        icon: Sparkles,     color: 'text-indigo-400',  bg: 'bg-indigo-500/15 border-indigo-500/25' },
    hired:                { label: '🎉 Congratulations!',   icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/25' },
    rejected:             { label: 'Not Selected',           icon: XCircle,      color: 'text-rose-400',    bg: 'bg-rose-500/15 border-rose-500/25' },
};

export default function CareerOpportunityCard() {
    const { user } = useAuth();
    const [existingApp, setExistingApp] = useState(null);
    const [topRoles, setTopRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [rolesRes, appRes] = await Promise.all([
                    supabase.from('career_job_roles').select('id, title, category, commission_structure').eq('is_active', true).limit(3),
                    user ? supabase.from('career_applications').select('id, status, role_category, career_job_roles(title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
                ]);
                setTopRoles(rolesRes.data || []);
                setExistingApp(appRes.data || null);
            } finally { setLoading(false); }
        }
        load();
    }, [user]);

    const statusCfg = existingApp ? STATUS_CONFIG[existingApp.status] : null;
    const StatusIcon = statusCfg?.icon;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 border border-white/10 shadow-2xl">
            {/* Ambient blobs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 p-5">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
                        <Briefcase size={18} className="text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-white font-bold text-sm leading-tight">Career Opportunities</h3>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                                <Sparkles size={8} /> Hiring
                            </span>
                        </div>
                        <p className="text-gray-400 text-xs mt-0.5">Join as Freelancer, Agent or DSA</p>
                    </div>
                </div>

                {/* Existing application status */}
                {!loading && existingApp && statusCfg && (
                    <Link href="/career/applications" className={`mb-4 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${statusCfg.bg} hover:opacity-80 transition-opacity`}>
                        <StatusIcon size={15} className={statusCfg.color} />
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold ${statusCfg.color}`}>{statusCfg.label}</p>
                            {existingApp.career_job_roles?.title && (
                                <p className="text-xs text-gray-400 truncate">{existingApp.career_job_roles.title}</p>
                            )}
                        </div>
                        <ChevronRight size={13} className="text-gray-500 flex-shrink-0" />
                    </Link>
                )}

                {/* Top roles list */}
                {loading ? (
                    <div className="space-y-2 mb-4">{[...Array(3)].map((_, i) => <div key={i} className="h-11 rounded-xl bg-white/5 animate-pulse" />)}</div>
                ) : topRoles.length > 0 ? (
                    <div className="space-y-2 mb-4">
                        {topRoles.map(role => {
                            const Icon = roleIcons[role.category] || Briefcase;
                            const grad = roleGrads[role.category] || roleGrads.other;
                            return (
                                <Link key={role.id} href={`/career/apply?role=${role.id}`}
                                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 transition-all group">
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0`}>
                                        <Icon size={14} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-200 font-semibold line-clamp-1">{role.title}</p>
                                        {role.commission_structure && (
                                            <p className="text-xs text-gray-500 line-clamp-1">{role.commission_structure.split('\n')[0]}</p>
                                        )}
                                    </div>
                                    <ChevronRight size={13} className="text-gray-600 group-hover:text-gray-300 transition-colors flex-shrink-0" />
                                </Link>
                            );
                        })}
                    </div>
                ) : null}

                {/* CTA buttons */}
                <div className="flex gap-2">
                    <Link href={existingApp ? '/career/applications' : '/career/apply'}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all text-xs shadow-lg shadow-violet-500/25">
                        {existingApp ? 'Track Application' : "Apply Now — It's Free"}
                        <ChevronRight size={13} />
                    </Link>
                    <Link href="/career"
                        className="flex items-center justify-center px-3 py-2.5 bg-white/8 hover:bg-white/15 border border-white/10 text-gray-300 rounded-xl transition-all">
                        <ArrowRight size={14} />
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
