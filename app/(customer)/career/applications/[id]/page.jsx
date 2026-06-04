'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import Link from 'next/link';
import { 
    ArrowLeft, Send, Clock, Calendar, Briefcase, CheckCircle2, 
    XCircle, User, Phone, Mail, MapPin, Building2, GraduationCap, 
    Globe, FileText, Download, ChevronRight, AlertCircle, DollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const STAGES = [
    { key: 'pending', label: 'Applied', icon: Send, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
    { key: 'under_review', label: 'Under Review', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
    { key: 'interview_scheduled', label: 'Interview', icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-100', border: 'border-violet-200' },
    { key: 'offer_sent', label: 'Offer Sent', icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-200' },
    { key: 'hired', label: 'Hired!', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
    { key: 'rejected', label: 'Not Selected', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-100', border: 'border-rose-200' },
];

function DetailRow({ icon: Icon, label, value }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
            <Icon size={18} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
                <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-gray-900">{value}</p>
            </div>
        </div>
    );
}

export default function ApplicationDetailPage({ params }) {
    const unwrappedParams = use(params);
    const appId = unwrappedParams.id;
    const { user } = useAuth();
    
    const [app, setApp] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchApplication = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error: fetchError } = await supabase
                .from('career_applications')
                .select(`
                    *,
                    career_job_roles(title)
                `)
                .eq('id', appId)
                .eq('user_id', user.id)
                .single();
                
            if (fetchError) throw fetchError;
            setApp(data);
        } catch (err) {
            console.error(err);
            setError('Application not found or you do not have permission to view it.');
        } finally {
            setIsLoading(false);
        }
    }, [user, appId]);

    useEffect(() => { fetchApplication(); }, [fetchApplication]);

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-4"><AlertCircle size={28} className="text-indigo-500" /></div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h2>
                        <Link href="/auth/login" className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-colors">Sign In</Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
                    <div className="h-40 bg-white rounded-3xl border border-gray-100 animate-pulse" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="h-64 bg-white rounded-3xl border border-gray-100 animate-pulse" />
                        <div className="h-64 bg-white rounded-3xl border border-gray-100 animate-pulse" />
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    if (error || !app) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center max-w-md">
                        <XCircle size={48} className="text-rose-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">{error || 'Not Found'}</h2>
                        <Link href="/career/applications" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:underline">
                            <ArrowLeft size={16} /> Back to My Applications
                        </Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    const currentStageIdx = STAGES.findIndex(s => s.key === app.status);
    const stageConfig = STAGES[currentStageIdx] || STAGES[0];
    const isRejected = app.status === 'rejected';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-6">
                <div className="max-w-4xl mx-auto">
                    <Link href="/career/applications" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 font-semibold mb-5 transition-colors">
                        <ArrowLeft size={16} /> Back to My Applications
                    </Link>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                                {app.career_job_roles?.title || app.role_category || 'General Application'}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">Submitted on {new Date(app.created_at).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 border ${stageConfig.bg} ${stageConfig.color} ${stageConfig.border}`}>
                            <stageConfig.icon size={18} />
                            <span className="font-bold text-sm tracking-wide">{stageConfig.label}</span>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative py-8 overflow-hidden hidden sm:block">
                        <div className="absolute top-12 left-0 w-full h-1 bg-gray-100 rounded-full" />
                        <div 
                            className={`absolute top-12 left-0 h-1 rounded-full transition-all duration-1000 ${isRejected ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                            style={{ width: isRejected ? '100%' : `${(currentStageIdx / (STAGES.length - 2)) * 100}%` }}
                        />
                        
                        <div className="relative flex justify-between">
                            {STAGES.filter(s => s.key !== 'rejected').map((s, i) => {
                                const isActive = i <= currentStageIdx && !isRejected;
                                const isCurrent = i === currentStageIdx;
                                return (
                                    <div key={s.key} className="flex flex-col items-center relative z-10 w-24">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all duration-500 ${
                                            isCurrent ? `${s.bg} ${s.color} ring-4 ring-offset-4 ring-${s.color.split('-')[1]}-200 scale-110` : 
                                            isActive ? 'bg-indigo-500 text-white' : 
                                            'bg-white border-2 border-gray-200 text-gray-300'
                                        }`}>
                                            <s.icon size={18} />
                                        </div>
                                        <p className={`text-xs font-bold mt-4 text-center ${isCurrent ? s.color : isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {s.label}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                        {isRejected && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 py-2 rounded-2xl border border-rose-200 text-rose-600 font-bold flex items-center gap-2 z-20 shadow-lg">
                                <XCircle size={18} /> Application Closed
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
                
                {/* HR Notes / Updates */}
                {(app.status === 'interview_scheduled' || app.status === 'offer_sent' || app.status === 'hired') && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                        className={`rounded-3xl p-6 border ${app.status === 'hired' ? 'bg-emerald-50 border-emerald-100' : app.status === 'offer_sent' ? 'bg-indigo-50 border-indigo-100' : 'bg-violet-50 border-violet-100'}`}>
                        <h2 className={`text-sm font-black uppercase tracking-widest mb-4 ${app.status === 'hired' ? 'text-emerald-700' : app.status === 'offer_sent' ? 'text-indigo-700' : 'text-violet-700'}`}>
                            Latest Update from HR
                        </h2>
                        
                        {app.status === 'interview_scheduled' && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-violet-900 font-medium">
                                    <Calendar className="text-violet-500" />
                                    <span>Interview Date: {app.interview_date ? new Date(app.interview_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Pending Confirmation'}</span>
                                </div>
                                {app.interview_notes && (
                                    <div className="bg-white/60 p-4 rounded-2xl border border-violet-200/50">
                                        <p className="text-sm text-violet-800 italic">"{app.interview_notes}"</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {app.status === 'offer_sent' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white/60 p-4 rounded-2xl border border-indigo-200/50">
                                        <p className="text-xs text-indigo-500 font-semibold mb-1">Offered Salary</p>
                                        <p className="text-lg font-bold text-indigo-900">₹{app.offered_salary?.toLocaleString('en-IN') || 0}<span className="text-sm font-medium opacity-60">/mo</span></p>
                                    </div>
                                    <div className="bg-white/60 p-4 rounded-2xl border border-indigo-200/50">
                                        <p className="text-xs text-indigo-500 font-semibold mb-1">Commission</p>
                                        <p className="text-lg font-bold text-indigo-900">{app.commission_percent || 0}%</p>
                                    </div>
                                    <div className="bg-white/60 p-4 rounded-2xl border border-indigo-200/50">
                                        <p className="text-xs text-indigo-500 font-semibold mb-1">Joining Bonus</p>
                                        <p className="text-lg font-bold text-indigo-900">₹{app.joining_bonus?.toLocaleString('en-IN') || 0}</p>
                                    </div>
                                </div>
                                {app.offer_letter_notes && (
                                    <div className="bg-white/60 p-4 rounded-2xl border border-indigo-200/50">
                                        <p className="text-sm text-indigo-800 italic">"{app.offer_letter_notes}"</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {app.status === 'hired' && (
                            <div className="bg-white/60 p-4 rounded-2xl border border-emerald-200/50 flex items-center gap-3">
                                <CheckCircle2 className="text-emerald-500 shrink-0" size={24} />
                                <p className="text-sm text-emerald-800 font-medium">Your onboarding process will begin shortly. Welcome to the InTrust family!</p>
                            </div>
                        )}
                    </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Info */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                            <User size={16} /> Contact Details
                        </h2>
                        <div className="space-y-1">
                            <DetailRow icon={User} label="Full Name" value={app.full_name} />
                            <DetailRow icon={Mail} label="Email Address" value={app.email} />
                            <DetailRow icon={Phone} label="Phone Number" value={app.phone} />
                            <DetailRow icon={MapPin} label="Location" value={`${app.city || ''}${app.city && app.state ? ', ' : ''}${app.state || ''}`} />
                        </div>
                    </div>

                    {/* Professional Info */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                            <Briefcase size={16} /> Professional Background
                        </h2>
                        <div className="space-y-1">
                            <DetailRow icon={Building2} label="Current Occupation" value={app.current_occupation} />
                            <DetailRow icon={GraduationCap} label="Highest Education" value={app.education} />
                            <DetailRow icon={Clock} label="Experience" value={`${app.experience_years} Year${app.experience_years !== 1 ? 's' : ''}`} />
                            <DetailRow icon={Globe} label="Languages" value={app.languages_known?.join(', ')} />
                        </div>
                    </div>
                </div>

                {/* Cover Letter & Resume */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                        <div className="flex-1">
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <FileText size={16} /> Cover Letter
                            </h2>
                            {app.cover_message ? (
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{app.cover_message}</p>
                            ) : (
                                <p className="text-sm text-gray-400 italic">No cover letter provided.</p>
                            )}
                        </div>
                        
                        <div className="sm:w-72 shrink-0">
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Download size={16} /> Attachments
                            </h2>
                            {app.resume_url ? (
                                <a 
                                    href={app.resume_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center justify-between p-4 rounded-2xl border-2 border-indigo-50 bg-indigo-50/50 hover:bg-indigo-100 hover:border-indigo-100 transition-colors group"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                                            <FileText size={20} />
                                        </div>
                                        <div className="truncate">
                                            <p className="text-sm font-bold text-indigo-900 truncate">Resume</p>
                                            <p className="text-xs text-indigo-600 font-medium">Click to view</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-indigo-400 group-hover:text-indigo-700 transition-colors shrink-0" />
                                </a>
                            ) : (
                                <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center">
                                    <FileText size={24} className="text-gray-300 mb-2" />
                                    <p className="text-sm font-medium text-gray-500">No Resume Uploaded</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
            
            <Footer />
        </div>
    );
}
