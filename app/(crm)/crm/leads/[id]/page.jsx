'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { 
    Phone, Mail, MapPin, Building, Calendar, Clock, Edit, FileText, 
    Activity, MessageSquare, CheckCircle2, ChevronRight, Zap, Target, 
    DollarSign, Thermometer, Plus, Trash2, ExternalLink, CreditCard, 
    ShoppingBag, Sun, Package, ArrowLeft, MessageCircle, X, Send
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/contexts/AuthContext';

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
    const { user, profile } = useAuth();
    
    const [activeTab, setActiveTab] = useState('activity');
    const [lead, setLead] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [intentServices, setIntentServices] = useState([]);
    const [paidServices, setPaidServices] = useState([]);
    const [notes, setNotes] = useState([]);
    const [activities, setActivities] = useState([]);
    const [salesTeam, setSalesTeam] = useState([]);
    
    const [newNote, setNewNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [showEditLead, setShowEditLead] = useState(false);
    const [showLogActivity, setShowLogActivity] = useState(false);
    const [showLogIntent, setShowLogIntent] = useState(false);
    
    const [isLoading, setIsLoading] = useState(true);

    const fetchSalesTeam = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('id, full_name, role')
                .in('role', ['sales_exec', 'sales_manager', 'admin', 'super_admin'])
                .order('full_name', { ascending: true });
            if (!error && data) {
                setSalesTeam(data);
            }
        } catch (err) {
            console.error('Error fetching sales team:', err);
        }
    }, []);

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
                .select('*, user_profiles(full_name)')
                .eq('lead_id', id)
                .order('due_date', { ascending: true });
            setTasks(taskData || []);

            // 3. Fetch Intent Services
            const { data: intentData } = await supabase
                .from('crm_lead_services')
                .select('*')
                .eq('lead_id', id)
                .order('created_at', { ascending: false });
            setIntentServices(intentData || []);

            // 4. Fetch Paid Services
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

            // 5. Fetch Notes
            const { data: notesData } = await supabase
                .from('crm_lead_notes')
                .select('*, user_profiles:author_id(full_name)')
                .eq('lead_id', id)
                .order('created_at', { ascending: false });
            setNotes(notesData || []);

            // 6. Fetch Activities
            const { data: activitiesData } = await supabase
                .from('crm_lead_activities')
                .select('*, user_profiles:actor_id(full_name)')
                .eq('lead_id', id)
                .order('created_at', { ascending: false });
            setActivities(activitiesData || []);

        } catch (err) {
            console.error('Error fetching lead hub data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
        fetchSalesTeam();
        const leadSub = supabase.channel(`lead_${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads', filter: `id=eq.${id}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_tasks', filter: `lead_id=eq.${id}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_lead_notes', filter: `lead_id=eq.${id}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_lead_activities', filter: `lead_id=eq.${id}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_lead_services', filter: `lead_id=eq.${id}` }, fetchData)
            .subscribe();
        
        return () => supabase.removeChannel(leadSub);
    }, [id, fetchData, fetchSalesTeam]);

    const handleToggleTask = async (taskId, currentStatus) => {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        await supabase.from('crm_tasks').update({ status: newStatus }).eq('id', taskId);
        fetchData();
    };

    const handlePostNote = async () => {
        if (!newNote.trim()) return;
        setSavingNote(true);
        try {
            const { error } = await supabase.from('crm_lead_notes').insert([{
                lead_id: id,
                author_id: user?.id,
                note: newNote.trim()
            }]);
            if (error) throw error;
            setNewNote('');
            fetchData();
            toast.success('Note added');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSavingNote(false);
        }
    };

    const handleDeleteLead = async () => {
        if (!window.confirm("Are you sure you want to delete this lead? This cannot be undone.")) return;
        try {
            const { error } = await supabase.from('crm_leads').delete().eq('id', id);
            if (error) throw error;
            toast.success('Lead deleted');
            router.push('/crm/leads');
        } catch (err) {
            toast.error(err.message);
        }
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
                    <ArrowLeft size={18} /> Back
                </button>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowEditLead(true)} className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm">
                        <Edit size={18} />
                    </button>
                    <button onClick={handleDeleteLead} className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all shadow-sm">
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
                        <p className="text-sm font-bold leading-relaxed opacity-90 italic">"{lead.notes || 'No active notes for this lead yet.'}"</p>
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
                                        <button onClick={() => setShowLogActivity(true)} className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                                            <Plus size={14} /> Log Entry
                                        </button>
                                    </div>
                                    <div className="relative pl-6 border-l-2 border-gray-100 dark:border-gray-700 space-y-10">
                                        
                                        {activities.map(activity => (
                                            <div key={activity.id} className="relative">
                                                <div className="absolute -left-[33px] w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 ring-4 ring-white dark:ring-gray-800 shadow-md">
                                                    <Activity size={12} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">{activity.action_type}</p>
                                                    <p className="text-xs font-bold text-gray-400">{format(new Date(activity.created_at), 'PPP p')} · by {activity.user_profiles?.full_name || 'System'}</p>
                                                    {activity.metadata?.details && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                                            {activity.metadata.details}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

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
                                        <button onClick={() => setShowCreateTask(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
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
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Due {format(new Date(task.due_date), 'MMM dd, p')} · Assigned to: {task.user_profiles?.full_name || 'Me'}</p>
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
                                                <button onClick={() => setShowLogIntent(true)} className="text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors">Log Intent</button>
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
                                                <p className="text-sm font-black text-gray-900 dark:text-white">{lead.phone || 'N/A'}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 text-gray-400"><Mail size={18} /></div>
                                                <p className="text-sm font-black text-gray-900 dark:text-white">{lead.email || 'N/A'}</p>
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
                                <div className="space-y-6 flex flex-col h-full">
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Internal Discussions</h2>
                                    
                                    <div className="flex-1 space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                                        {notes.length === 0 ? (
                                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 min-h-[150px] flex items-center justify-center text-center">
                                                <div className="space-y-2">
                                                    <MessageSquare size={32} className="mx-auto text-gray-200 dark:text-gray-700" />
                                                    <p className="text-sm font-bold text-gray-400 italic">No collaborative notes found for this lead. Start a thread to align with your team.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            notes.map(note => (
                                                <div key={note.id} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{note.user_profiles?.full_name || 'User'}</span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{format(new Date(note.created_at), 'MMM dd, p')}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note.note}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="flex gap-4 items-end pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <div className="flex-1 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-3xl p-2 focus-within:border-indigo-500 transition-all shadow-inner">
                                            <textarea 
                                                rows="3" 
                                                placeholder="Type your note here..." 
                                                value={newNote}
                                                onChange={e => setNewNote(e.target.value)}
                                                className="w-full bg-transparent border-none focus:ring-0 p-4 text-sm font-bold text-gray-900 dark:text-white no-scrollbar resize-none"
                                            />
                                        </div>
                                        <button 
                                            onClick={handlePostNote} 
                                            disabled={savingNote || !newNote.trim()}
                                            className="bg-indigo-600 text-white p-4 rounded-[1.5rem] shadow-xl hover:bg-indigo-700 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center"
                                        >
                                            {savingNote ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={24} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
            
            <AnimatePresence>
                {showCreateTask && (
                    <CreateTaskModal 
                        leadId={id} 
                        salesTeam={salesTeam} 
                        currentUserProfile={profile} 
                        onClose={() => setShowCreateTask(false)} 
                        onSave={fetchData} 
                    />
                )}
                {showLogActivity && (
                    <LogActivityModal
                        leadId={id}
                        userId={user?.id}
                        onClose={() => setShowLogActivity(false)}
                        onSave={fetchData}
                    />
                )}
                {showLogIntent && (
                    <LogIntentModal
                        leadId={id}
                        userId={user?.id}
                        onClose={() => setShowLogIntent(false)}
                        onSave={fetchData}
                    />
                )}
                {showEditLead && (
                    <EditLeadModal
                        lead={lead}
                        salesTeam={salesTeam}
                        currentUserProfile={profile}
                        onClose={() => setShowEditLead(false)}
                        onSave={fetchData}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function CreateTaskModal({ leadId, salesTeam, currentUserProfile, onClose, onSave }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [assignedTo, setAssignedTo] = useState(currentUserProfile?.id || '');
    const [saving, setSaving] = useState(false);

    const isManagerOrAdmin = ['sales_manager', 'admin', 'super_admin'].includes(currentUserProfile?.role);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!title.trim() || !dueDate) {
            toast.error('Title and Due Date are required');
            return;
        }
        setSaving(true);
        try {
            const { error } = await supabase.from('crm_tasks').insert([{
                lead_id: leadId,
                title,
                description,
                due_date: new Date(dueDate).toISOString(),
                assigned_to: assignedTo || currentUserProfile?.id,
                status: 'pending'
            }]);
            if (error) throw error;
            toast.success('Task scheduled successfully!');
            onSave();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50 }} className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">Create New Task</h3>
                        <p className="text-xs text-gray-400">Schedule follow-up or call for this lead</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"><X size={18} className="text-gray-500" /></button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">Task Title *</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Call client to discuss solar quote" required
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Additional notes or action details..." rows={3}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold resize-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">Due Date & Time *</label>
                        <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} required
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">Assigned To</label>
                        {isManagerOrAdmin ? (
                            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold">
                                <option value={currentUserProfile?.id}>Assign to Me ({currentUserProfile?.full_name})</option>
                                {salesTeam.filter(t => t.id !== currentUserProfile?.id).map(teamMember => (
                                    <option key={teamMember.id} value={teamMember.id}>
                                        {teamMember.full_name} ({teamMember.role === 'sales_exec' ? 'Exec' : 'Manager'})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-sm text-gray-500 font-semibold select-none">
                                Assigned to Me ({currentUserProfile?.full_name || 'Sales Executive'})
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold text-sm active:scale-95 transition-transform hover:bg-gray-50 dark:hover:bg-gray-900">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-indigo-700 disabled:opacity-60">
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Task'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

function LogActivityModal({ leadId, userId, onClose, onSave }) {
    const [actionType, setActionType] = useState('Call');
    const [details, setDetails] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.from('crm_lead_activities').insert([{
                lead_id: leadId,
                actor_id: userId,
                action_type: actionType,
                metadata: { details }
            }]);
            if (error) throw error;
            toast.success('Activity logged');
            onSave();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50 }} className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Log Activity</h3>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} className="text-gray-500" /></button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Activity Type</label>
                        <select value={actionType} onChange={e => setActionType(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm">
                            <option value="Call">Call</option>
                            <option value="Email">Email</option>
                            <option value="Meeting">Meeting</option>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Details</label>
                        <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} placeholder="Discussion summary..." required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm resize-none" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 flex justify-center items-center">
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Log Activity'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

function LogIntentModal({ leadId, userId, onClose, onSave }) {
    const [serviceName, setServiceName] = useState('');
    const [dealValue, setDealValue] = useState('');
    const [status, setStatus] = useState('pitched');
    const [saving, setSaving] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.from('crm_lead_services').insert([{
                lead_id: leadId,
                service_name: serviceName,
                deal_value: Number(dealValue) || 0,
                status
            }]);
            if (error) throw error;
            toast.success('Intent logged');
            onSave();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50 }} className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Log Sales Intent</h3>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} className="text-gray-500" /></button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Service / Product Name</label>
                        <input type="text" value={serviceName} onChange={e => setServiceName(e.target.value)} required placeholder="e.g. 5kW Solar System" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Expected Deal Value (₹)</label>
                        <input type="number" value={dealValue} onChange={e => setDealValue(e.target.value)} placeholder="0" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm">
                            <option value="pitched">Pitched</option>
                            <option value="negotiating">Negotiating</option>
                            <option value="agreed">Agreed</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 flex justify-center items-center">
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Intent'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

function EditLeadModal({ lead, salesTeam, currentUserProfile, onClose, onSave }) {
    const [form, setForm] = useState({
        contact_name: lead.contact_name || '',
        title: lead.title || '',
        phone: lead.phone || '',
        email: lead.email || '',
        source: lead.source || '',
        status: lead.status || 'new',
        temperature: lead.temperature || 'warm',
        deal_value: lead.deal_value || 0,
        assigned_to: lead.assigned_to || '',
    });
    const [saving, setSaving] = useState(false);
    const isManagerOrAdmin = ['sales_manager', 'admin', 'super_admin'].includes(currentUserProfile?.role);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.from('crm_leads').update({
                ...form,
                updated_at: new Date().toISOString()
            }).eq('id', lead.id);
            if (error) throw error;
            toast.success('Lead updated');
            onSave();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50 }} className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Edit Lead Details</h3>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} className="text-gray-500" /></button>
                </div>
                <div className="overflow-y-auto p-6 flex-1">
                    <form id="editLeadForm" onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Contact Name</label>
                            <input type="text" value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Lead Title</label>
                            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Phone</label>
                            <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Email</label>
                            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Source</label>
                            <input type="text" value={form.source} onChange={e => setForm({...form, source: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Expected Deal Value (₹)</label>
                            <input type="number" value={form.deal_value} onChange={e => setForm({...form, deal_value: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Status</label>
                            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm capitalize">
                                {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Temperature</label>
                            <select value={form.temperature} onChange={e => setForm({...form, temperature: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm capitalize">
                                <option value="hot">Hot</option>
                                <option value="warm">Warm</option>
                                <option value="cold">Cold</option>
                            </select>
                        </div>
                        {isManagerOrAdmin && (
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Assigned To</label>
                                <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm">
                                    <option value="">Unassigned</option>
                                    {salesTeam.map(teamMember => (
                                        <option key={teamMember.id} value={teamMember.id}>
                                            {teamMember.full_name} ({teamMember.role === 'sales_exec' ? 'Exec' : 'Manager'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </form>
                </div>
                <div className="p-6 border-t border-gray-100 flex gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">Cancel</button>
                    <button type="submit" form="editLeadForm" disabled={saving} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 flex justify-center items-center">
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
