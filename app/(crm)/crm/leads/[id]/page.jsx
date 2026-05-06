'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { 
    Phone, Mail, MapPin, Building, Calendar, Clock, Edit, FileText, 
    Activity, MessageSquare, CheckCircle2, ChevronRight, Zap, Target, 
    DollarSign, Thermometer, Plus, Trash2, ExternalLink, CreditCard, 
    ShoppingBag, Sun, Package, ArrowLeft, MessageCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const TABS = [
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
    { id: 'services', label: 'Services', icon: Package },
    { id: 'notes', label: 'Notes', icon: MessageSquare },
];

const STATUS_CONFIG = {
    new: { bg: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-500' },
    contacted: { bg: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' },
    qualified: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-100', dot: 'bg-indigo-500' },
    proposal: { bg: 'bg-purple-50 text-purple-700 border-purple-100', dot: 'bg-purple-500' },
    won: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
    lost: { bg: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-500' },
};

export default function LeadDetailPage({ params }) {
    const router = useRouter();
    const unwrappedParams = use(params);
    const { id } = unwrappedParams;
    
    const [activeTab, setActiveTab] = useState('activity');
    const [lead, setLead] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [intentServices, setIntentServices] = useState([]);
    const [paidServices, setPaidServices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            // 1. Fetch Lead Details
            const { data: leadData, error: leadError } = await supabase
                .from('crm_leads')
                .select('*')
                .eq('id', id)
                .single();

            if (leadError) throw leadError;
            setLead(leadData);

            // 2. Fetch Tasks
            const { data: taskData } = await supabase
                .from('crm_tasks')
                .select('*')
                .eq('lead_id', id)
                .order('due_date', { ascending: true });
            setTasks(taskData || []);

            // 3. Fetch Intent Services
            const { data: intentData } = await supabase
                .from('crm_lead_services')
                .select('*')
                .eq('lead_id', id);
            setIntentServices(intentData || []);

            // 4. Fetch Paid Services (Cross-reference by email/phone)
            const { data: profiles } = await supabase
                .from('user_profiles')
                .select('id')
                .or(`email.eq.${leadData.email},phone.eq.${leadData.phone}`);

            if (profiles && profiles.length > 0) {
                const userIds = profiles.map(p => p.id);
                
                const { data: txns } = await supabase
                    .from('transactions')
                    .select('id, amount, created_at, status')
                    .in('user_id', userIds)
                    .eq('status', 'SUCCESS');
                
                const { data: orders } = await supabase
                    .from('shopping_order_groups')
                    .select('id, total_amount_paise, created_at, status')
                    .in('user_id', userIds)
                    .eq('status', 'completed');

                const merged = [
                    ...(txns || []).map(t => ({ id: t.id, type: 'Financial Service', amount: t.amount, date: t.created_at, icon: CreditCard })),
                    ...(orders || []).map(o => ({ id: o.id, type: 'Shop Order', amount: Number(o.total_amount_paise)/100, date: o.created_at, icon: ShoppingBag }))
                ].sort((a, b) => new Date(b.date) - new Date(a.date));
                
                setPaidServices(merged);
            }

        } catch (err) {
            console.error('Error fetching lead hub data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
        const leadSub = supabase.channel(`lead_${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads', filter: `id=eq.${id}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_tasks', filter: `lead_id=eq.${id}` }, fetchData)
            .subscribe();
        
        return () => supabase.removeChannel(leadSub);
    }, [id, fetchData]);

    const handleToggleTask = async (taskId, currentStatus) => {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        await supabase.from('crm_tasks').update({ status: newStatus }).eq('id', taskId);
        fetchData();
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    if (isLoading) return (
        <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs">Initializing Lead Hub...</p>
        </div>
    );

    if (!lead) return <div className="p-12 text-center text-gray-500 font-bold">Lead not found.</div>;

    const statusStyle = STATUS_CONFIG[lead.status] || { bg: 'bg-gray-100', dot: 'bg-gray-400' };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen bg-gray-50/50 dark:bg-gray-900/50 font-[family-name:var(--font-outfit)]">
            
            <div className="flex items-center justify-between">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors font-bold text-sm">
                    <ArrowLeft size={18} /> Back to Pipeline
                </button>
                <div className="flex items-center gap-2">
                    <button className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-500 transition-all">
                        <Edit size={18} />
                    </button>
                    <button className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 transition-all">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 opacity-90 relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                </div>
                <div className="px-6 pb-8 relative">
                    <div className="flex flex-col md:flex-row items-end gap-6 -mt-12 relative z-10">
                        <div className="w-28 h-28 rounded-3xl bg-white dark:bg-gray-900 p-1.5 shadow-2xl">
                            <div className="w-full h-full rounded-[1.25rem] bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center text-indigo-700 dark:text-indigo-400 text-4xl font-black">
                                {(lead.contact_name || lead.title || 'U').charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div className="flex-1 space-y-1 text-center md:text-left">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{lead.contact_name || lead.title}</h1>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${statusStyle.bg}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                    {lead.status}
                                </span>
                                {lead.temperature === 'hot' && <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1"><Zap size={12} fill="currentColor" /> High Priority</span>}
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-bold flex items-center justify-center md:justify-start gap-2">
                                <Building size={16} className="opacity-50" /> {lead.title || 'Private Individual'}
                            </p>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
                            <a href={`tel:${lead.phone}`} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                                <Phone size={18} /> Call
                            </a>
                            <a href={`https://wa.me/${lead.phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
                                <MessageCircle size={18} /> WhatsApp
                            </a>
                            <a href={`mailto:${lead.email}`} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-white px-6 py-3 rounded-2xl font-black transition-all shadow-sm hover:border-indigo-500 active:scale-95">
                                <Mail size={18} /> Email
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 opacity-40">Intelligence</h3>
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-400"><DollarSign size={18} /></div>
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Expected Value</p>
                                    <p className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(lead.deal_value || 0)}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-400"><MapPin size={18} /></div>
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Region</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{lead.source || 'Unknown'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-400"><Calendar size={18} /></div>
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Added On</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{format(new Date(lead.created_at), 'MMM dd, yyyy')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
                        <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-4">Lead Status Notes</h3>
                        <p className="text-sm font-bold leading-relaxed opacity-90 italic">"{lead.notes || 'No active notes for this lead yet. Internal discussions are required.'}"</p>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-6">
                    <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-x-auto no-scrollbar">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                                <tab.icon size={16} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 p-8 shadow-sm min-h-[400px]"
                        >
                            {activeTab === 'activity' && (
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between mb-2">
                                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Timeline</h2>
                                        <button className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                                            <Plus size={14} /> Log Entry
                                        </button>
                                    </div>
                                    <div className="relative pl-6 border-l-2 border-gray-100 dark:border-gray-700 space-y-10">
                                        <div className="relative">
                                            <div className="absolute -left-[33px] w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white ring-4 ring-white dark:ring-gray-800 shadow-md">
                                                <Target size={12} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Lead Created</p>
                                                <p className="text-xs font-bold text-gray-400">{format(new Date(lead.created_at), 'PPP p')}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">Automated entry from CRM pipeline initialization.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'tasks' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Task Manager</h2>
                                        <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform">
                                            <Plus size={16} /> Create Task
                                        </button>
                                    </div>
                                    <div className="grid gap-3">
                                        {tasks.length === 0 ? (
                                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                                <p className="text-sm font-bold text-gray-400">No scheduled tasks for this lead.</p>
                                            </div>
                                        ) : (
                                            tasks.map(task => (
                                                <div key={task.id} className={`p-5 rounded-2xl border transition-all flex items-center gap-4 ${task.status === 'completed' ? 'bg-emerald-50/30 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30 opacity-60' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700 shadow-sm'}`}>
                                                    <button onClick={() => handleToggleTask(task.id, task.status)} className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${task.status === 'completed' ? 'bg-emerald-500 text-white' : 'border-2 border-gray-200 dark:border-gray-600 hover:border-indigo-500'}`}>
                                                        {task.status === 'completed' && <CheckCircle2 size={16} />}
                                                    </button>
                                                    <div className="flex-1">
                                                        <h4 className={`text-sm font-black ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>{task.title}</h4>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Due {format(new Date(task.due_date), 'MMM dd, p')}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'services' && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Sales Intent</h3>
                                                <button className="text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-md">Log Intent</button>
                                            </div>
                                            <div className="space-y-3">
                                                {intentServices.length === 0 ? (
                                                    <p className="text-xs font-bold text-gray-400 italic">No specific products pitched yet.</p>
                                                ) : (
                                                    intentServices.map(svc => (
                                                        <div key={svc.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-indigo-500 shadow-sm"><Sun size={18} /></div>
                                                                <div>
                                                                    <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">{svc.service_name}</p>
                                                                    <p className="text-[10px] font-black text-gray-400 uppercase mt-0.5">{svc.status}</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs font-black text-gray-900 dark:text-white">{formatCurrency(svc.deal_value)}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h3 className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Paid Services</h3>
                                            <div className="space-y-3">
                                                {paidServices.length === 0 ? (
                                                    <div className="p-8 text-center bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-700">
                                                        <Package size={24} className="mx-auto text-gray-200 dark:text-gray-700 mb-2" />
                                                        <p className="text-xs font-bold text-gray-400">Not a paying customer yet.</p>
                                                    </div>
                                                ) : (
                                                    paidServices.map(svc => (
                                                        <div key={svc.id} className="p-4 rounded-2xl bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between group">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-emerald-500 shadow-sm"><svc.icon size={18} /></div>
                                                                <div>
                                                                    <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">{svc.type}</p>
                                                                    <p className="text-[10px] font-black text-emerald-600/70 dark:text-emerald-400/70 uppercase mt-0.5">{format(new Date(svc.date), 'MMM dd, yyyy')}</p>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(svc.amount)}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'details' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-gray-700 pb-2">Contact Info</h3>
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 text-gray-400"><Phone size={18} /></div>
                                                <p className="text-sm font-black text-gray-900 dark:text-white">{lead.phone}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 text-gray-400"><Mail size={18} /></div>
                                                <p className="text-sm font-black text-gray-900 dark:text-white">{lead.email}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 text-gray-400"><Building size={18} /></div>
                                                <p className="text-sm font-black text-gray-900 dark:text-white">{lead.title || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-gray-700 pb-2">Lead Lifecycle</h3>
                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Source Channel</p>
                                                <span className="inline-block px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-black text-gray-700 dark:text-gray-300 capitalize">{lead.source || 'Direct Entry'}</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Temperature</p>
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase ${lead.temperature === 'hot' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                                                    <Thermometer size={14} /> {lead.temperature || 'Warm'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'notes' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Internal Discussions</h2>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 min-h-[150px] flex items-center justify-center text-center">
                                        <div className="space-y-2">
                                            <MessageSquare size={32} className="mx-auto text-gray-200 dark:text-gray-700" />
                                            <p className="text-sm font-bold text-gray-400 italic">No collaborative notes found for this lead. Start a thread to align with your team.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-end">
                                        <div className="flex-1 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-3xl p-2 focus-within:border-indigo-500 transition-all shadow-inner">
                                            <textarea 
                                                rows="3" 
                                                placeholder="Type your message here..." 
                                                className="w-full bg-transparent border-none focus:ring-0 p-4 text-sm font-bold text-gray-900 dark:text-white no-scrollbar"
                                            />
                                        </div>
                                        <button className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-4 rounded-[1.5rem] shadow-xl active:scale-95 transition-transform">
                                            <Plus size={24} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
