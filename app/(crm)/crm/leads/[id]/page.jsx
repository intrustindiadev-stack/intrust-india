'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { 
    Phone, Mail, MapPin, Building, Calendar, Clock, Edit, FileText, 
    Activity, MessageSquare, CheckCircle2, ChevronRight, Zap, Target, 
    DollarSign, Thermometer, Plus, Trash2, ExternalLink, CreditCard, 
    ShoppingBag, Sun, Package, ArrowLeft, MessageCircle, X, Send, User
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/contexts/AuthContext';
import ContactActions from '@/components/shared/ContactActions';
import { 
    CrmLeadUpdateSchema, CrmTaskCreateSchema, 
    CrmActivityLogSchema, CrmIntentLogSchema 
} from '@/lib/crm/validation';
import LeadConversionPanel from '@/components/crm/leads/LeadConversionPanel';

const TABS = [
    { id: 'notes', label: 'Notes', icon: MessageSquare },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
    { id: 'services', label: 'Services', icon: Package },
];

const STATUS_CONFIG = {
    new: { bg: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-500' },
    contacted: { bg: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' },
    qualified: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-100', dot: 'bg-indigo-500' },
    proposal: { bg: 'bg-purple-50 text-purple-700 border-purple-100', dot: 'bg-purple-500' },
    won: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
    lost: { bg: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-500' },
};

import { isValidUUID } from '@/lib/utils';


export default function LeadDetailPage({ params }) {
    const router = useRouter();
    const unwrappedParams = use(params);
    const rawId = unwrappedParams.id;
    const idMatch = rawId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    const id = idMatch ? idMatch[0] : rawId;

    const { user, profile } = useAuth();
    
    const [activeTab, setActiveTab] = useState('notes');
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
                .in('role', ['relationship_exec', 'relationship_manager', 'admin', 'super_admin'])
                .order('full_name', { ascending: true });
            if (!error && data) {
                setSalesTeam(data);
            }
        } catch (err) {
            console.error('Error fetching sales team:', err);
        }
    }, []);

    const fetchData = useCallback(async () => {
        if (!isValidUUID(id)) {
            setIsLoading(false);
            return;
        }
        try {
            // Parallel batch 1: Fetch lead details and all related records concurrently
            const [leadRes, tasksRes, intentRes, notesRes, activitiesRes] = await Promise.all([
                supabase.from('crm_leads').select(`
                    *,
                    _converted_customer:user_profiles!converted_user_id(id, full_name, phone, email, kyc_status),
                    _converted_merchant:merchants!converted_merchant_id(id, business_name, business_phone, status, owner_name),
                    _converted_by:user_profiles!converted_by(id, full_name)
                `).eq('id', id).single(),
                supabase.from('crm_tasks').select('*, user_profiles(full_name)').eq('lead_id', id).order('due_date', { ascending: true }),
                supabase.from('crm_lead_services').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
                supabase.from('crm_lead_remarks').select('*, author:user_profiles!author_id(full_name, role)').eq('lead_id', id).order('created_at', { ascending: false }),
                supabase.from('crm_lead_activities').select('*, user_profiles:actor_id(full_name)').eq('lead_id', id).order('created_at', { ascending: false }),
            ]);

            if (leadRes.error) throw leadRes.error;
            const leadData = leadRes.data;
            setLead(leadData);
            setTasks(tasksRes.data || []);
            setIntentServices(intentRes.data || []);
            setNotes(notesRes.data || []);
            setActivities(activitiesRes.data || []);

            // Parallel batch 2: Fetch paid services if email/phone exists
            if (leadData?.email || leadData?.phone) {
                const { data: profiles } = await supabase
                    .from('user_profiles')
                    .select('id')
                    .or(`email.eq.${leadData.email},phone.eq.${leadData.phone}`);

                if (profiles && profiles.length > 0) {
                    const userIds = profiles.map(p => p.id);
                    const [txnsRes, ordersRes] = await Promise.all([
                        supabase.from('transactions').select('id, amount, created_at, status').in('user_id', userIds).eq('status', 'SUCCESS'),
                        supabase.from('shopping_order_groups').select('id, total_amount_paise, created_at, status').in('user_id', userIds).eq('status', 'completed')
                    ]);

                    const merged = [
                        ...(txnsRes.data || []).map(t => ({ id: t.id, type: 'Financial Service', amount: t.amount, date: t.created_at, icon: CreditCard })),
                        ...(ordersRes.data || []).map(o => ({ id: o.id, type: 'Shop Order', amount: Number(o.total_amount_paise)/100, date: o.created_at, icon: ShoppingBag }))
                    ].sort((a, b) => new Date(b.date) - new Date(a.date));

                    setPaidServices(merged);
                }
            }

        } catch (err) {
            console.error('Error fetching lead hub data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (!isValidUUID(id)) {
            setIsLoading(false);
            return;
        }
        fetchData();
        fetchSalesTeam();
        const leadSub = supabase.channel(`lead_${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads', filter: `id=eq.${id}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_tasks', filter: `lead_id=eq.${id}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_lead_remarks', filter: `lead_id=eq.${id}` }, fetchData)
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
            const res = await fetch(`/api/crm/leads/${id}/remarks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newNote.trim(),
                    is_internal: false
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to add remark');
            }
            setNewNote('');
            fetchData();
            toast.success('Remark added');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSavingNote(false);
        }
    };

    const handleDeleteLead = async () => {
        if (!window.confirm("Are you sure you want to archive this lead?")) return;
        try {
            const { error } = await supabase.from('crm_leads').update({ archived_at: new Date().toISOString() }).eq('id', id);
            if (error) throw error;
            toast.success('Lead archived');
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
                    
                    <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 dark:border-gray-700 p-6 shadow-2xl shadow-slate-200/20 overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-indigo-500/20 to-violet-600/20 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative flex flex-col items-center text-center mt-4">
                            <div className="w-24 h-24 rounded-[1.5rem] bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-gray-800 dark:to-gray-700 p-1 shadow-lg mb-4 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                                <div className="w-full h-full rounded-[1.25rem] bg-white dark:bg-gray-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-3xl font-black">
                                    {(lead.contact_name || lead.title || 'U').charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{lead.contact_name || lead.title}</h1>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5 mt-2">
                                <Building size={14} /> {lead.title || 'Private Individual'}
                            </p>
                            
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusStyle.bg}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                    {lead.status}
                                </span>
                                {lead.temperature === 'hot' && <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1"><Zap size={12} fill="currentColor" /> Priority Lead</span>}
                            </div>
                        </div>

                        <div className="mt-8 flex justify-center w-full">
                            <ContactActions phone={lead.phone} email={lead.email} name={lead.contact_name || lead.title} fullWidth />
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-4">
                            {lead.phone && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400"><Phone size={14} /></div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{lead.phone}</p>
                                </div>
                            )}
                            {lead.email && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400"><Mail size={14} /></div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{lead.email}</p>
                                </div>
                            )}
                            {(lead.area || lead.city) && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400"><MapPin size={14} /></div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{[lead.area, lead.city].filter(Boolean).join(', ')}</p>
                                </div>
                            )}
                        </div>
                    </div>


                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 backdrop-blur-xl rounded-3xl border border-indigo-200 dark:border-indigo-700/50 p-5 shadow-xl shadow-indigo-200/20 dark:shadow-indigo-900/20 transition-shadow">
                            <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2"><User size={14}/> Assignment Details</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Assigned To</p>
                                    {profile && ['relationship_manager', 'admin', 'super_admin'].includes(profile.role) ? (
                                        <select
                                            value={lead.assigned_to || ''}
                                            onChange={async (e) => {
                                                const newOwner = e.target.value;
                                                const { error } = await supabase.from('crm_leads').update({ assigned_to: newOwner || null }).eq('id', id);
                                                if (!error) {
                                                    toast.success('Assigned executive updated');
                                                    fetchData();
                                                } else {
                                                    toast.error(error.message);
                                                }
                                            }}
                                            className="w-full text-xs font-bold bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-700 rounded-xl p-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                        >
                                            <option value="">Unassigned</option>
                                            {salesTeam.map(u => (
                                                <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-2 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                                                {salesTeam.find(u => u.id === lead.assigned_to)?.full_name?.charAt(0) || 'U'}
                                            </div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                {salesTeam.find(u => u.id === lead.assigned_to)?.full_name || 'Unassigned'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 border-t border-indigo-200/50 dark:border-indigo-700/30 pt-3">
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Assigned By</p>
                                        <p className="text-xs font-bold text-gray-900 dark:text-gray-300 truncate">Manager / System</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Last Updated</p>
                                        <p className="text-xs font-bold text-gray-900 dark:text-gray-300">{format(new Date(lead.updated_at || lead.created_at), 'MMM dd, yyyy')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-gray-800 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform"><DollarSign size={80} /></div>
                            <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-1 relative z-10 flex items-center gap-2"><Target size={14} /> Expected Value</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white relative z-10">{formatCurrency(lead.deal_value || 0)}</p>
                            
                            {/* CSS Sparkline */}
                            <div className="mt-4 flex items-end gap-1 h-10 opacity-70 relative z-10">
                                {[30, 50, 40, 70, 60, 90, 80].map((h, i) => (
                                    <div key={i} className="w-full bg-indigo-300 dark:bg-indigo-600 rounded-t-sm hover:bg-indigo-500 transition-colors cursor-pointer" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-3xl border border-white/60 dark:border-gray-700 p-4 shadow-xl shadow-slate-200/10 hover:-translate-y-0.5 transition-transform">
                                <MapPin size={16} className="text-gray-400 mb-2"/>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Region</p>
                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{lead.source || 'Unknown'}</p>
                            </div>
                            <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-3xl border border-white/60 dark:border-gray-700 p-4 shadow-xl shadow-slate-200/10 hover:-translate-y-0.5 transition-transform">
                                <Calendar size={16} className="text-gray-400 mb-2"/>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Added On</p>
                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{format(new Date(lead.created_at), 'MMM dd, yyyy')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
                        <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-4">Lead Status Notes</h3>
                        <p className="text-sm font-bold leading-relaxed opacity-90 italic">"{lead.notes || 'No active notes for this lead yet.'}"</p>
                    </div>

                    <LeadConversionPanel
                        lead={lead}
                        profile={profile}
                        onRefresh={fetchData}
                    />

                </div>

                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center gap-2 bg-transparent overflow-x-auto no-scrollbar">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md transform -translate-y-0.5' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700'}`}
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
                            className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 dark:border-gray-700 p-8 shadow-2xl shadow-slate-200/20 min-h-[400px]"
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
                                            {(lead.state || lead.city || lead.area) && (
                                                <div className="flex items-start gap-4">
                                                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 text-gray-400"><MapPin size={18} /></div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Location</p>
                                                        <p className="text-sm font-black text-gray-900 dark:text-white">
                                                            {[lead.area, lead.city, lead.state].filter(Boolean).join(', ')}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
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
                                                <div key={note.id} className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-800/30">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-[10px] font-black text-indigo-700 dark:text-indigo-300">
                                                                {note.author?.full_name ? note.author.full_name.charAt(0).toUpperCase() : 'U'}
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-900 dark:text-white">{note.author?.full_name || 'User'}</span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{format(new Date(note.created_at), 'MMM dd, p')}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap ml-8">{note.content}</p>
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

    const isManagerOrAdmin = ['relationship_manager', 'admin', 'super_admin'].includes(currentUserProfile?.role);

    const handleSave = async (e) => {
        e.preventDefault();
        const payload = {
            lead_id: leadId,
            title: title.trim(),
            description: description?.trim() || '',
            due_date: dueDate ? new Date(dueDate).toISOString() : '',
            assigned_to: assignedTo || currentUserProfile?.id,
            status: 'pending'
        };
        const validation = CrmTaskCreateSchema.safeParse(payload);
        if (!validation.success) {
            toast.error(validation.error.issues[0]?.message || 'Title and Due Date are required');
            return;
        }
        setSaving(true);
        try {
            const valid = validation.data;
            const { error } = await supabase.from('crm_tasks').insert([valid]);
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
                                        {teamMember.full_name} ({teamMember.role === 'relationship_exec' ? 'RM Exec' : 'RM Manager'})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-sm text-gray-500 font-semibold select-none">
                                Assigned to Me ({currentUserProfile?.full_name || 'Relationship Executive'})
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
        const payload = {
            lead_id: leadId,
            actor_id: userId,
            action_type: actionType,
            details: details.trim()
        };
        const validation = CrmActivityLogSchema.safeParse(payload);
        if (!validation.success) {
            toast.error(validation.error.issues[0]?.message || 'Invalid activity input');
            return;
        }
        setSaving(true);
        try {
            const { error } = await supabase.from('crm_lead_activities').insert([{
                lead_id: leadId,
                actor_id: userId,
                action_type: actionType,
                metadata: { details: details.trim() }
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
        const payload = {
            lead_id: leadId,
            service_name: serviceName.trim(),
            deal_value: Number(dealValue) || 0,
            status
        };
        const validation = CrmIntentLogSchema.safeParse(payload);
        if (!validation.success) {
            toast.error(validation.error.issues[0]?.message || 'Invalid sales intent details');
            return;
        }
        setSaving(true);
        try {
            const valid = validation.data;
            const { error } = await supabase.from('crm_lead_services').insert([{
                lead_id: valid.lead_id,
                service_name: valid.service_name,
                deal_value: valid.deal_value,
                status: valid.status
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
        state: lead.state || '',
        city: lead.city || '',
        area: lead.area || '',
    });
    const [saving, setSaving] = useState(false);
    const isManagerOrAdmin = ['relationship_manager', 'admin', 'super_admin'].includes(currentUserProfile?.role);

    const handleSave = async (e) => {
        e.preventDefault();
        const validation = CrmLeadUpdateSchema.safeParse(form);
        if (!validation.success) {
            toast.error(validation.error.issues[0]?.message || 'Invalid form input');
            return;
        }
        setSaving(true);
        try {
            const valid = validation.data;
            const { error } = await supabase.from('crm_leads').update({
                ...valid,
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
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">State</label>
                            <input type="text" value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">City</label>
                            <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Area</label>
                            <input type="text" value={form.area} onChange={e => setForm({...form, area: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm" />
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
                                            {teamMember.full_name} ({teamMember.role === 'relationship_exec' ? 'RM Exec' : 'RM Manager'})
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
