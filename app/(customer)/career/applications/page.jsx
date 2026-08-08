'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Clock, XCircle, ArrowLeft, Briefcase, Calendar, RefreshCw, ChevronRight, AlertCircle, Send } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const STAGES = [
    { key: 'pending', label: 'Applied', icon: Send, color: 'text-blue-600', bg: 'bg-blue-100' },
    { key: 'under_review', label: 'Under Review', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    { key: 'interview_scheduled', label: 'Interview', icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-100' },
    { key: 'offer_sent', label: 'Offer Sent', icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { key: 'hired', label: 'Hired!', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { key: 'rejected', label: 'Not Selected', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-100' },
];

function StatusTimeline({ currentStatus }) {
    const activeStages = STAGES.filter(s => s.key !== 'rejected');
    const isRejected = currentStatus === 'rejected';
    const currentIdx = activeStages.findIndex(s => s.key === currentStatus);

    return (
        <div className="flex items-center justify-between w-full overflow-x-auto py-4 scrollbar-hide">
            <div className="flex items-center min-w-max mx-auto px-2">
                {activeStages.map((s, i) => {
                    const isActive = i <= currentIdx;
                    const isCurrent = s.key === currentStatus;
                    const Icon = s.icon;
                    return (
                        <div key={s.key} className="flex items-center">
                            <div className={`flex flex-col items-center relative z-10`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isCurrent ? s.bg + ' ring-4 ring-white dark:ring-gray-800 shadow-xl ' + s.color : isActive ? s.bg + ' ' + s.color : 'bg-gray-100 dark:bg-gray-800/50 text-gray-300 dark:text-gray-600 border-2 border-white dark:border-gray-800'}`}>
                                    <Icon size={isCurrent ? 22 : 18} />
                                </div>
                                <p className={`text-[10px] font-black mt-2 whitespace-nowrap uppercase tracking-widest ${isCurrent ? s.color : isActive ? s.color : 'text-gray-400 dark:text-gray-500'}`}>{s.label}</p>
                            </div>
                            {i < activeStages.length - 1 && (
                                <div className={`h-1.5 w-8 sm:w-16 md:w-24 mx-1 sm:mx-2 -mt-6 rounded-full transition-colors duration-300 relative z-0 ${i < currentIdx ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-gray-100 dark:bg-gray-800/50'}`} />
                            )}
                        </div>
                    );
                })}
                {isRejected && (
                    <div className="flex items-center ml-2 sm:ml-4">
                        <div className="h-1.5 w-8 sm:w-12 mx-1 sm:mx-2 -mt-6 rounded-full bg-rose-200 dark:bg-rose-900/50 relative z-0" />
                        <div className="flex flex-col items-center relative z-10">
                            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center ring-4 ring-white dark:ring-gray-800 shadow-xl border-2 border-white dark:border-gray-800">
                                <XCircle size={22} />
                            </div>
                            <p className="text-[10px] font-black mt-2 whitespace-nowrap uppercase tracking-widest text-rose-600">Not Selected</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ApplicationCard({ app, delay }) {
    const stageConfig = STAGES.find(s => s.key === app.status) || STAGES[0];
    const Icon = stageConfig.icon;

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
            className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/40 dark:shadow-none hover:shadow-2xl transition-all p-6 sm:p-8 relative overflow-hidden">
            
            {/* Top accent line */}
            <div className={`absolute top-0 left-0 w-full h-1.5 ${
                app.status === 'hired' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
                app.status === 'rejected' ? 'bg-gradient-to-r from-rose-400 to-red-500' :
                app.status === 'offer_sent' ? 'bg-gradient-to-r from-indigo-400 to-blue-500' :
                app.status === 'interview_scheduled' ? 'bg-gradient-to-r from-violet-400 to-purple-500' :
                app.status === 'under_review' ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                'bg-gradient-to-r from-blue-400 to-cyan-500'
            }`} />

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl ${stageConfig.bg} border border-white dark:border-gray-700 shadow-inner flex items-center justify-center flex-shrink-0`}>
                        <Icon size={24} className={stageConfig.color} />
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 dark:text-white text-xl">{app.role_category || 'General Application'}</h3>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                            <Calendar size={14} /> Applied on {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border flex-shrink-0 ${
                    app.status === 'hired' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    app.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    app.status === 'offer_sent' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                    app.status === 'interview_scheduled' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                    app.status === 'under_review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                    <div className={`w-2 h-2 rounded-full ${stageConfig.bg.replace('100', '500')}`} />
                    {stageConfig.label}
                </div>
            </div>

            {/* Progress Timeline */}
            <div className="overflow-x-auto -mx-2 px-2 mb-6 pb-2">
                <StatusTimeline currentStatus={app.status} />
            </div>

            {/* Status-specific messages */}
            <div className={`rounded-2xl p-5 border ${
                app.status === 'hired' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30' :
                app.status === 'rejected' ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/30' :
                app.status === 'offer_sent' ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30' :
                app.status === 'interview_scheduled' ? 'bg-violet-50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-800/30' :
                'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700/50'
            }`}>
                {app.status === 'pending' && <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Your application is in the queue. Our talent team will review it shortly.</p>}
                {app.status === 'under_review' && <p className="text-sm font-medium text-amber-700 dark:text-amber-500">Great news! Our talent team is actively reviewing your profile.</p>}
                {app.status === 'interview_scheduled' && (
                    <div>
                        <p className="text-sm font-bold text-violet-700 dark:text-violet-400 mb-1">Interview Scheduled</p>
                        {app.interview_date && <p className="text-sm font-medium text-violet-600 dark:text-violet-300">📅 {new Date(app.interview_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                        {app.interview_notes && <p className="text-sm text-violet-600 dark:text-violet-300 mt-2 italic border-l-2 border-violet-300 dark:border-violet-600 pl-3">&quot;{app.interview_notes}&quot;</p>}
                    </div>
                )}
                {app.status === 'offer_sent' && (
                    <div>
                        <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-1">🎉 Offer Extended!</p>
                        {app.offered_salary > 0 && <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Package: ₹{app.offered_salary.toLocaleString('en-IN')}/month{app.commission_percent > 0 ? ` + ${app.commission_percent}% commission` : ''}{app.joining_bonus > 0 ? ` + ₹${app.joining_bonus.toLocaleString('en-IN')} joining bonus` : ''}</p>}
                        {app.offer_letter_notes && <p className="text-sm text-indigo-600 dark:text-indigo-300 mt-2 italic border-l-2 border-indigo-300 dark:border-indigo-600 pl-3">&quot;{app.offer_letter_notes}&quot;</p>}
                    </div>
                )}
                {app.status === 'hired' && (
                    <div>
                        <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 mb-1">🎊 Welcome to the team!</p>
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">Congratulations! You&apos;ve been selected. HR will reach out with onboarding details.</p>
                        {app.hired_at && <p className="text-xs font-bold text-emerald-500 dark:text-emerald-400 mt-2 uppercase tracking-wide">Hired on {new Date(app.hired_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                    </div>
                )}
                {app.status === 'rejected' && (
                    <div>
                        <p className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-1">Application Closed</p>
                        <p className="text-sm font-medium text-rose-600 dark:text-rose-300">We appreciate your interest. This role has been filled but we encourage you to apply to future openings.</p>
                    </div>
                )}
            </div>
            
            <div className="mt-6 flex items-center justify-end">
                <Link href={`/career/applications/${app.id}`} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-md">
                    View Application Details <ChevronRight size={16} />
                </Link>
            </div>
        </motion.div>
    );
}

export default function ApplicationsHistoryPage() {
    const { user } = useAuth();
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchApplications = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('career_applications')
                .select('id, role_category, status, created_at, interview_date, interview_notes, offered_salary, commission_percent, joining_bonus, offer_letter_notes, hired_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setApplications(data || []);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    }, [user]);

    useEffect(() => { fetchApplications(); }, [fetchApplications]);

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-indigo-200 dark:border-indigo-700/50"><AlertCircle size={28} className="text-indigo-500 dark:text-indigo-400" /></div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sign In Required</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">Please sign in to view and track the status of your submitted job applications.</p>
                        <Link href="/login?callbackUrl=%2Fcareer%2Fapplications" className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/25">Sign In to Continue</Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            <Navbar />
            
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-8 pt-28 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
                <div className="max-w-4xl mx-auto">
                    <Link href="/career" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors">
                        <ArrowLeft size={16} /> Back to Careers
                    </Link>
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">My Applications</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">You have {applications.length} application{applications.length !== 1 ? 's' : ''} submitted</p>
                        </div>
                        <button onClick={fetchApplications} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-semibold text-gray-700 dark:text-gray-300">
                            <RefreshCw size={16} /> Refresh Status
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl w-full mx-auto px-4 py-10 space-y-8">
                {isLoading ? (
                    [...Array(2)].map((_, i) => <div key={i} className="h-64 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 animate-pulse" />)
                ) : applications.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-16 text-center">
                        <div className="text-5xl mb-4">📋</div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">No applications yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Browse open positions and apply to get started!</p>
                        <Link href="/career" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-colors">
                            Browse Jobs <ChevronRight size={16} />
                        </Link>
                    </div>
                ) : (
                    applications.map((app, i) => <ApplicationCard key={app.id} app={app} delay={i * 0.06} />)
                )}

                {applications.length > 0 && (
                    <div className="text-center pt-4">
                        <Link href="/career" className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-800 text-sm">
                            <Briefcase size={16} /> Browse more open positions
                        </Link>
                    </div>
                )}
            </div>
            
            <Footer />
        </div>
    );
}
