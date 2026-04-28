'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Clock, XCircle, ArrowLeft, Briefcase, Calendar, RefreshCw, ChevronRight, AlertCircle, Send } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import Link from 'next/link';
import { motion } from 'framer-motion';

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
        <div className="flex items-center gap-0 overflow-x-auto py-2">
            {activeStages.map((s, i) => {
                const isActive = i <= currentIdx;
                const isCurrent = s.key === currentStatus;
                const Icon = s.icon;
                return (
                    <div key={s.key} className="flex items-center min-w-max">
                        <div className={`flex flex-col items-center`}>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isCurrent ? s.bg + ' ring-2 ring-offset-2 ring-current ' + s.color : isActive ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-300'}`}>
                                <Icon size={16} />
                            </div>
                            <p className={`text-xs font-semibold mt-1.5 whitespace-nowrap ${isCurrent ? s.color : isActive ? 'text-gray-600' : 'text-gray-300'}`}>{s.label}</p>
                        </div>
                        {i < activeStages.length - 1 && (
                            <div className={`h-0.5 w-8 sm:w-12 mx-1 -mt-4 ${i < currentIdx ? 'bg-gray-400' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
            {isRejected && (
                <div className="flex flex-col items-center ml-4">
                    <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center ring-2 ring-offset-2 ring-rose-400">
                        <XCircle size={16} />
                    </div>
                    <p className="text-xs font-semibold text-rose-600 mt-1.5">Not Selected</p>
                </div>
            )}
        </div>
    );
}

function ApplicationCard({ app, delay }) {
    const stageConfig = STAGES.find(s => s.key === app.status) || STAGES[0];
    const Icon = stageConfig.icon;

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 sm:p-6">

            <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${stageConfig.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={22} className={stageConfig.color} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">{app.role_category || 'General Application'}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Applied {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex-shrink-0 ${
                    app.status === 'hired' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    app.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                    app.status === 'offer_sent' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                    app.status === 'interview_scheduled' ? 'bg-violet-50 text-violet-700 border-violet-100' :
                    app.status === 'under_review' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-blue-50 text-blue-700 border-blue-100'
                }`}>
                    {stageConfig.label}
                </span>
            </div>

            {/* Progress Timeline */}
            <div className="overflow-x-auto -mx-1 px-1 mb-4">
                <StatusTimeline currentStatus={app.status} />
            </div>

            {/* Status-specific messages */}
            <div className={`rounded-2xl p-4 ${
                app.status === 'hired' ? 'bg-emerald-50 border border-emerald-100' :
                app.status === 'rejected' ? 'bg-rose-50 border border-rose-100' :
                app.status === 'offer_sent' ? 'bg-indigo-50 border border-indigo-100' :
                app.status === 'interview_scheduled' ? 'bg-violet-50 border border-violet-100' :
                'bg-gray-50 border border-gray-100'
            }`}>
                {app.status === 'pending' && <p className="text-sm text-gray-600">Your application is in the queue. Our HR team will review it shortly.</p>}
                {app.status === 'under_review' && <p className="text-sm text-amber-700">Great news! Our HR team is actively reviewing your profile.</p>}
                {app.status === 'interview_scheduled' && (
                    <div>
                        <p className="text-sm font-semibold text-violet-700 mb-1">Interview Scheduled</p>
                        {app.interview_date && <p className="text-sm text-violet-600">📅 {new Date(app.interview_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                        {app.interview_notes && <p className="text-sm text-violet-600 mt-1 italic">"{app.interview_notes}"</p>}
                    </div>
                )}
                {app.status === 'offer_sent' && (
                    <div>
                        <p className="text-sm font-semibold text-indigo-700 mb-1">🎉 Offer Extended!</p>
                        {app.offered_salary > 0 && <p className="text-sm text-indigo-600">Package: ₹{app.offered_salary.toLocaleString('en-IN')}/month{app.commission_percent > 0 ? ` + ${app.commission_percent}% commission` : ''}{app.joining_bonus > 0 ? ` + ₹${app.joining_bonus.toLocaleString('en-IN')} joining bonus` : ''}</p>}
                        {app.offer_letter_notes && <p className="text-sm text-indigo-600 mt-1 italic">"{app.offer_letter_notes}"</p>}
                    </div>
                )}
                {app.status === 'hired' && (
                    <div>
                        <p className="text-sm font-bold text-emerald-700 mb-1">🎊 Welcome to the team!</p>
                        <p className="text-sm text-emerald-600">Congratulations! You've been selected. HR will reach out with onboarding details.</p>
                        {app.hired_at && <p className="text-xs text-emerald-500 mt-1">Hired on {new Date(app.hired_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                    </div>
                )}
                {app.status === 'rejected' && (
                    <div>
                        <p className="text-sm font-semibold text-rose-700 mb-1">Application Closed</p>
                        <p className="text-sm text-rose-600">We appreciate your interest. This role has been filled but we encourage you to apply to future openings.</p>
                    </div>
                )}
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
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-4"><AlertCircle size={28} className="text-indigo-500" /></div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h2>
                    <p className="text-gray-500 mb-6">Please sign in to view your application history.</p>
                    <Link href="/auth/login" className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-colors">Sign In</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-5">
                <div className="max-w-3xl mx-auto">
                    <Link href="/career" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
                        <ArrowLeft size={16} /> Back to Jobs
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-extrabold text-gray-900">My Applications</h1>
                            <p className="text-sm text-gray-500 mt-1">{applications.length} application{applications.length !== 1 ? 's' : ''} submitted</p>
                        </div>
                        <button onClick={fetchApplications} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50">
                            <RefreshCw size={16} className="text-gray-500" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
                {isLoading ? (
                    [...Array(2)].map((_, i) => <div key={i} className="h-64 bg-white rounded-3xl border border-gray-100 animate-pulse" />)
                ) : applications.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center">
                        <div className="text-5xl mb-4">📋</div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No applications yet</h3>
                        <p className="text-gray-500 mb-6">Browse open positions and apply to get started!</p>
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
        </div>
    );
}
