'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { Search, Phone, Mail, User, Building2, Loader2, AlertCircle, MessageSquare, Briefcase, Store, ShieldCheck, ChevronRight, X } from 'lucide-react';
import TemplateGallery from '@/components/crm/whatsapp/TemplateGallery';
import SendWhatsAppDrawer from '@/components/crm/whatsapp/SendWhatsAppDrawer';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { fetchCRMUsers, fetchCRMMerchants } from '@/app/actions/admin-crm';

export default function ContactsClient({ currentUserId, currentUserRole }) {
    const isManager = ['relationship_manager', 'admin', 'super_admin'].includes(currentUserRole);
    const canViewMerchants = ['relationship_manager', 'relationship_exec', 'admin', 'super_admin'].includes(currentUserRole);
    
    // View mode: 'leads' | 'users' | 'merchants' | 'templates'
    const [activeTab, setActiveTab] = useState('leads');
    const [searchQuery, setSearchQuery] = useState('');

    // Data States
    const [leads, setLeads] = useState([]);
    const [users, setUsers] = useState([]);
    const [merchants, setMerchants] = useState([]);
    const [templates, setTemplates] = useState([]);
    
    // Loading States
    const [loading, setLoading] = useState({ leads: true, users: false, merchants: false, templates: false });
    const [error, setError] = useState({ leads: null, users: null, merchants: null, templates: null });
    const [templateSource, setTemplateSource] = useState(null);

    // Selection States
    const [selectedContactIds, setSelectedContactIds] = useState([]);

    // Modals & Panels
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [waModalContact, setWaModalContact] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedMerchant, setSelectedMerchant] = useState(null);

    const supabase = createClient();

    // Usage Limit State
    const [usage, setUsage] = useState({ count: 0, limit: 100, loading: true });

    const fetchLeads = useCallback(async () => {
        setLoading(prev => ({ ...prev, leads: true }));
        try {
            let query = supabase
                .from('crm_leads')
                .select('id, contact_name, email, phone, title, status, assigned_to')
                .neq('source', 'App User')
                .order('contact_name', { ascending: true });

            if (!isManager) {
                query = query.eq('assigned_to', currentUserId);
            }

            const { data, error: fetchError } = await query;
            if (fetchError) throw fetchError;
            setLeads(data || []);
        } catch (err) {
            setError(prev => ({ ...prev, leads: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, leads: false }));
        }
    }, [isManager, currentUserId, supabase]);

    const fetchUsage = useCallback(async () => {
        try {
            const res = await fetch('/api/crm/whatsapp/usage');
            if (res.ok) {
                const data = await res.json();
                setUsage({ count: data.usage || 0, limit: data.limit || 100, loading: false });
            } else {
                setUsage(prev => ({ ...prev, loading: false }));
            }
        } catch (err) {
            console.error('Failed to fetch WhatsApp usage', err);
            setUsage(prev => ({ ...prev, loading: false }));
        }
    }, []);

    // Initial Fetch for Leads and Usage
    useEffect(() => {
        fetchLeads();
        fetchUsage();
    }, [fetchLeads, fetchUsage]);

    const fetchUsers = useCallback(async () => {
        setLoading(prev => ({ ...prev, users: true }));
        try {
            const result = await fetchCRMUsers();
            if (result.error) throw new Error(result.error);
            setUsers(result.data || []);
        } catch (err) {
            setError(prev => ({ ...prev, users: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, users: false }));
        }
    }, []);

    const fetchMerchants = useCallback(async () => {
        if (!canViewMerchants) return;
        setLoading(prev => ({ ...prev, merchants: true }));
        try {
            const result = await fetchCRMMerchants();
            if (result.error) throw new Error(result.error);
            setMerchants(result.data || []);
        } catch (err) {
            setError(prev => ({ ...prev, merchants: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, merchants: false }));
        }
    }, [canViewMerchants]);

    const fetchTemplatesData = useCallback(async () => {
        setLoading(prev => ({ ...prev, templates: true }));
        try {
            const res = await fetch('/api/whatsapp/templates');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch WhatsApp templates');
            setTemplates(data.templates || []);
            setTemplateSource(data.source || null);
        } catch (err) {
            setError(prev => ({ ...prev, templates: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, templates: false }));
        }
    }, []);

    // Lazy load tabs
    useEffect(() => {
        if (activeTab === 'users' && users.length === 0 && !loading.users) fetchUsers();
        if (activeTab === 'merchants' && merchants.length === 0 && !loading.merchants) fetchMerchants();
        if (activeTab === 'templates' && templates.length === 0 && !loading.templates) fetchTemplatesData();
    }, [activeTab, fetchUsers, fetchMerchants, fetchTemplatesData, users.length, merchants.length, templates.length, loading]);


    const toggleSelect = (id) => {
        setSelectedContactIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    
    const getActiveList = () => {
        if (activeTab === 'leads') return leads;
        if (activeTab === 'users') return users;
        if (activeTab === 'merchants') return merchants;
        return [];
    };

    const toggleSelectAll = () => {
        const list = getActiveList();
        if (selectedContactIds.length === list.length && list.length > 0) {
            setSelectedContactIds([]);
        } else {
            setSelectedContactIds(list.map(c => c.id));
        }
    };

    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
        setIsWaModalOpen(true);
    };

    const handleOpenModalWithContact = (contact, type = 'lead') => {
        const standardizedContact = {
            id: type === 'merchant' ? contact.user_id : contact.id,
            contact_name: type === 'lead' ? contact.contact_name : (type === 'user' ? contact.full_name : contact.business_name),
            phone: type === 'merchant' ? contact.user_profiles?.phone : contact.phone,
            type: type,
        };
        setWaModalContact(standardizedContact);
        setActiveTab('templates');
        toast.success(`Select a template to send to ${standardizedContact.contact_name}`);
    };

    const filteredLeads = leads.filter(c => 
        (c.contact_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.phone?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const filteredUsers = users.filter(c => 
        (c.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.phone?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const filteredMerchants = merchants.filter(c => 
        (c.business_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.business_type?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.user_profiles?.phone?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)] relative pb-24 lg:pb-8">
            {/* Background elements */}
            <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-indigo-50/80 dark:from-indigo-900/10 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-10 w-72 h-72 bg-indigo-200/30 dark:bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10 space-y-8">
                
                {/* Hero Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                    <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 dark:bg-gray-800/60 text-indigo-700 dark:text-indigo-400 text-xs font-bold w-fit border border-white/50 dark:border-gray-700/50 backdrop-blur-md shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                CRM Contacts Hub
                            </div>
                            
                            {!usage.loading && (
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold shadow-sm ${usage.count >= usage.limit ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                                    <MessageSquare size={12} />
                                    <span>WhatsApp Usage: {usage.count} / {usage.limit} today</span>
                                </div>
                            )}
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Ecosystem Directory</h1>
                        <p className="text-slate-500 dark:text-gray-400 font-medium text-lg max-w-xl">
                            {isManager ? 'Manage leads, platform users, and merchants seamlessly.' : 'Manage your assigned leads and communication efficiently.'}
                        </p>
                    </div>
                </div>

                {/* Search & Tabs Navigation Bar */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-gray-700/50 shadow-2xl shadow-indigo-100/20 dark:shadow-none p-2 flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
                    
                    {/* View Switcher Tabs */}
                    <div className="flex items-center p-1.5 bg-slate-100/50 dark:bg-gray-900/50 rounded-2xl border border-slate-200/50 dark:border-gray-700/50 text-sm font-bold shrink-0 shadow-inner overflow-x-auto hide-scrollbar">
                        <button
                            onClick={() => { setActiveTab('leads'); setSelectedContactIds([]); setSearchQuery(''); }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                                activeTab === 'leads' ? 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                            }`}
                        >
                            <Briefcase size={16} />
                            <span>Leads</span>
                            {leads.length > 0 && <span className={`text-[10px] px-2 py-0.5 rounded-full shadow-sm ${activeTab === 'leads' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-gray-700'}`}>{leads.length}</span>}
                        </button>
                        
                        <button
                            onClick={() => { setActiveTab('users'); setSelectedContactIds([]); setSearchQuery(''); }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                                activeTab === 'users' ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                            }`}
                        >
                            <User size={16} />
                            <span>Users</span>
                            {users.length > 0 && <span className={`text-[10px] px-2 py-0.5 rounded-full shadow-sm ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-gray-700'}`}>{users.length}</span>}
                        </button>

                        {canViewMerchants && (
                            <button
                                onClick={() => { setActiveTab('merchants'); setSelectedContactIds([]); setSearchQuery(''); }}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                                    activeTab === 'merchants' ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                                }`}
                            >
                                <Store size={16} />
                                <span>Merchants</span>
                                {merchants.length > 0 && <span className={`text-[10px] px-2 py-0.5 rounded-full shadow-sm ${activeTab === 'merchants' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-gray-700'}`}>{merchants.length}</span>}
                            </button>
                        )}

                        <div className="hidden sm:block w-px h-6 bg-slate-300 dark:bg-gray-700 mx-2" />

                        <button
                            onClick={() => { setActiveTab('templates'); setSelectedContactIds([]); setSearchQuery(''); }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                                activeTab === 'templates' ? 'bg-white dark:bg-gray-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                            }`}
                        >
                            <MessageSquare size={16} />
                            <span className="hidden sm:inline">Templates</span>
                        </button>
                    </div>

                    {/* Divider */}
                    {activeTab !== 'templates' && <div className="hidden lg:block w-px bg-slate-200 dark:bg-gray-700 my-2 mx-1"></div>}

                    {activeTab !== 'templates' && (
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-transparent border-none text-slate-800 dark:text-white text-sm font-semibold focus:outline-none focus:ring-0 placeholder-slate-400"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Select Actions */}
            {activeTab !== 'templates' && getActiveList().length > 0 && (
                <div className="flex items-center gap-3 py-2 px-1">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={selectedContactIds.length === getActiveList().length && getActiveList().length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="group-hover:text-indigo-600 transition-colors">Select All {activeTab}</span>
                    </label>
                    {selectedContactIds.length > 0 && (
                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg">
                            {selectedContactIds.length} selected
                        </span>
                    )}
                </div>
            )}

            {/* TAB CONTENT: LEADS */}
            {activeTab === 'leads' && (
                <div className="space-y-6">
                    {loading.leads ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
                            <Loader2 size={32} className="animate-spin text-slate-600" />
                            <p className="text-sm font-medium">Loading leads...</p>
                        </div>
                    ) : error.leads ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-red-50/50 rounded-3xl border border-red-100">
                            <AlertCircle size={32} className="text-red-400" />
                            <p className="text-red-900 font-semibold">{error.leads}</p>
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4 bg-gray-50/50 rounded-3xl border border-gray-100 border-dashed">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-400">
                                <Briefcase size={32} />
                            </div>
                            <p className="text-gray-500 font-semibold text-lg">No leads match your criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredLeads.map(contact => (
                                <div key={contact.id} className={`bg-white rounded-3xl p-6 border shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col justify-between ${selectedContactIds.includes(contact.id) ? 'border-indigo-400 ring-4 ring-indigo-500/10' : 'border-gray-200'}`}>
                                    <div className="absolute top-4 right-4 z-20">
                                        <input
                                            type="checkbox"
                                            checked={selectedContactIds.includes(contact.id)}
                                            onChange={() => toggleSelect(contact.id)}
                                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-4 mb-5 relative z-10 pr-8">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-xl shadow-md">
                                                {contact.contact_name?.charAt(0).toUpperCase() || 'C'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-extrabold text-gray-900 text-lg truncate">{contact.contact_name || 'Unknown Contact'}</h3>
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mt-0.5">
                                                    <Building2 size={12} />
                                                    <span className="truncate">{contact.title || 'No Title'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-3 relative z-10">
                                            <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm text-gray-600 font-medium hover:text-slate-900 transition-colors p-2 -mx-2 rounded-lg hover:bg-slate-50">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                                    <Mail size={16} className="text-gray-400" />
                                                </div>
                                                <span className="truncate">{contact.email || 'No Email'}</span>
                                            </a>
                                            <div className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-slate-50">
                                                <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-sm text-gray-600 font-medium hover:text-slate-900 transition-colors truncate">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                                        <Phone size={16} className="text-gray-400" />
                                                    </div>
                                                    <span className="truncate">{contact.phone || 'No Phone Number'}</span>
                                                </a>
                                                {contact.phone && (
                                                    <button
                                                        onClick={() => handleOpenModalWithContact(contact, 'lead')}
                                                        title="Send WhatsApp Message"
                                                        className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs font-bold"
                                                    >
                                                        <MessageSquare size={14} />
                                                        <span>Send</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between relative z-10">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${
                                            contact.status === 'new' ? 'bg-blue-100 text-blue-700' :
                                            contact.status === 'contacted' ? 'bg-amber-100 text-amber-700' :
                                            contact.status === 'qualified' ? 'bg-purple-100 text-purple-700' :
                                            contact.status === 'converted' ? 'bg-emerald-100 text-emerald-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {contact.status}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <a href={`/crm/leads/${contact.id}`} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1">
                                                View Pipeline →
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: APP USERS */}
            {activeTab === 'users' && (
                <div className="space-y-6">
                    {loading.users ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
                            <Loader2 size={32} className="animate-spin text-slate-600" />
                            <p className="text-sm font-medium">Loading platform users...</p>
                        </div>
                    ) : error.users ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-red-50/50 rounded-3xl border border-red-100">
                            <AlertCircle size={32} className="text-red-400" />
                            <p className="text-red-900 font-semibold">{error.users}</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4 bg-gray-50/50 rounded-3xl border border-gray-100 border-dashed">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-400">
                                <User size={32} />
                            </div>
                            <p className="text-gray-500 font-semibold text-lg">No platform users found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredUsers.map(user => (
                                <div key={user.id} className={`bg-white rounded-3xl p-6 border shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col justify-between ${selectedContactIds.includes(user.id) ? 'border-blue-400 ring-4 ring-blue-500/10' : 'border-gray-200'}`}>
                                    <div className="absolute top-4 right-4 z-20">
                                        <input
                                            type="checkbox"
                                            checked={selectedContactIds.includes(user.id)}
                                            onChange={() => toggleSelect(user.id)}
                                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-4 mb-5 relative z-10 pr-8">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xl shadow-md">
                                                {user.full_name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-extrabold text-gray-900 text-lg truncate">{user.full_name || 'Unnamed User'}</h3>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${user.kyc_status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {user.kyc_status === 'verified' ? 'KYC Verified' : 'KYC Pending'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-3 relative z-10">
                                            <div className="flex items-center gap-3 text-sm text-gray-600 font-medium hover:text-slate-900 transition-colors p-2 -mx-2 rounded-lg hover:bg-slate-50">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                                    <Mail size={16} className="text-gray-400" />
                                                </div>
                                                <span className="truncate">{user.email || 'No Email'}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-slate-50">
                                                <div className="flex items-center gap-3 text-sm text-gray-600 font-medium hover:text-slate-900 transition-colors truncate">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                                        <Phone size={16} className="text-gray-400" />
                                                    </div>
                                                    <span className="truncate">{user.phone || 'No Phone Number'}</span>
                                                </div>
                                                {user.phone && (
                                                    <button
                                                        onClick={() => handleOpenModalWithContact(user, 'user')}
                                                        title="Send WhatsApp Message"
                                                        className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs font-bold"
                                                    >
                                                        <MessageSquare size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between relative z-10">
                                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                                            App User
                                        </span>
                                        <button 
                                            onClick={() => setSelectedUser(user)}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                        >
                                            View Profile →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: MERCHANTS */}
            {canViewMerchants && activeTab === 'merchants' && (
                <div className="space-y-6">
                    {loading.merchants ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
                            <Loader2 size={32} className="animate-spin text-slate-600" />
                            <p className="text-sm font-medium">Loading merchants...</p>
                        </div>
                    ) : error.merchants ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-red-50/50 rounded-3xl border border-red-100">
                            <AlertCircle size={32} className="text-red-400" />
                            <p className="text-red-900 font-semibold">{error.merchants}</p>
                        </div>
                    ) : filteredMerchants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4 bg-gray-50/50 rounded-3xl border border-gray-100 border-dashed">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-400">
                                <Store size={32} />
                            </div>
                            <p className="text-gray-500 font-semibold text-lg">No merchants found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredMerchants.map(merchant => (
                                <div key={merchant.id} className={`bg-white rounded-3xl p-6 border shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col justify-between ${selectedContactIds.includes(merchant.id) ? 'border-emerald-400 ring-4 ring-emerald-500/10' : 'border-gray-200'}`}>
                                    <div className="absolute top-4 right-4 z-20">
                                        <input
                                            type="checkbox"
                                            checked={selectedContactIds.includes(merchant.id)}
                                            onChange={() => toggleSelect(merchant.id)}
                                            className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-4 mb-5 relative z-10 pr-8">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold text-xl shadow-md">
                                                {merchant.business_name?.charAt(0).toUpperCase() || 'M'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-extrabold text-gray-900 text-lg truncate">{merchant.business_name || 'Unnamed Business'}</h3>
                                                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 font-medium">
                                                    <span>{merchant.business_type || 'Merchant'}</span>
                                                    <span>•</span>
                                                    <span className="truncate">{merchant.business_address || 'No Address'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-3 relative z-10">
                                            <div className="flex items-center gap-3 text-sm text-gray-600 font-medium hover:text-slate-900 transition-colors p-2 -mx-2 rounded-lg hover:bg-slate-50">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                                    <User size={16} className="text-gray-400" />
                                                </div>
                                                <span className="truncate">{merchant.user_profiles?.full_name || 'No Name Linked'}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-slate-50">
                                                <div className="flex items-center gap-3 text-sm text-gray-600 font-medium hover:text-slate-900 transition-colors truncate">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                                        <Phone size={16} className="text-gray-400" />
                                                    </div>
                                                    <span className="truncate">{merchant.user_profiles?.phone || 'No Phone'}</span>
                                                </div>
                                                {merchant.user_profiles?.phone && (
                                                    <button
                                                        onClick={() => handleOpenModalWithContact(merchant, 'merchant')}
                                                        title="Send WhatsApp Message"
                                                        className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs font-bold"
                                                    >
                                                        <MessageSquare size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between relative z-10">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${merchant.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {merchant.subscription_status === 'active' ? 'Active Sub' : 'Inactive'}
                                        </span>
                                        <button 
                                            onClick={() => setSelectedMerchant(merchant)}
                                            className="text-xs font-bold text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-1"
                                        >
                                            View Business →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: TEMPLATES */}
            {activeTab === 'templates' && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                    <TemplateGallery
                        templates={templates}
                        isLoading={loading.templates}
                        error={error.templates}
                        onSelectTemplate={handleSelectTemplate}
                        onRetry={fetchTemplatesData}
                        templateSource={templateSource}
                    />
                </div>
            )}

            {/* Floating Action Bar */}
            <AnimatePresence>
                {selectedContactIds.length > 0 && activeTab !== 'templates' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        className="fixed bottom-6 left-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-slate-700"
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-black">{selectedContactIds.length} Selected</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeTab}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-700" />
                        <div className="flex items-center gap-2">
                            <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors text-sm font-bold text-slate-300 hover:text-white">
                                <MessageSquare size={16} /> Bulk WhatsApp
                            </button>
                            <button onClick={() => setSelectedContactIds([])} className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 transition-colors text-sm font-bold text-slate-400">
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Side Panels */}
            
            {/* User Profile Side Panel */}
            <AnimatePresence>
                {selectedUser && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedUser(null)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
                        />
                        <motion.div 
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[101] border-l border-slate-200 flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h2 className="text-xl font-black text-slate-900">User Profile</h2>
                                <button onClick={() => setSelectedUser(null)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                <div className="flex items-center gap-5">
                                    <div className="w-20 h-20 rounded-3xl bg-blue-100 text-blue-700 flex items-center justify-center text-3xl font-black shadow-inner">
                                        {selectedUser.full_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedUser.full_name}</h3>
                                        <p className="text-sm font-medium text-slate-500 mt-1 capitalize">{selectedUser.role} Account</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Contact Information</h4>
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-500 shrink-0"><Phone size={18} /></div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-500">Phone Number</p>
                                                <p className="text-sm font-semibold text-slate-900">{selectedUser.phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-500 shrink-0"><Mail size={18} /></div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-500">Email Address</p>
                                                <p className="text-sm font-semibold text-slate-900">{selectedUser.email || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Platform Status</h4>
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-500 shrink-0"><ShieldCheck size={18} /></div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500">KYC Status</p>
                                            <span className={`inline-flex mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${selectedUser.kyc_status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                                {selectedUser.kyc_status === 'verified' ? 'VERIFIED' : 'PENDING'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 bg-slate-50">
                                <button 
                                    onClick={() => { setSelectedUser(null); handleOpenModalWithContact(selectedUser, 'user'); }}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all"
                                >
                                    <MessageSquare size={18} /> Send WhatsApp Message
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Merchant Profile Side Panel */}
            <AnimatePresence>
                {selectedMerchant && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedMerchant(null)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
                        />
                        <motion.div 
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[101] border-l border-slate-200 flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h2 className="text-xl font-black text-slate-900">Merchant Profile</h2>
                                <button onClick={() => setSelectedMerchant(null)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                <div className="flex items-center gap-5">
                                    <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl font-black shadow-inner">
                                        {selectedMerchant.business_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedMerchant.business_name}</h3>
                                        <p className="text-sm font-medium text-slate-500 mt-1">{selectedMerchant.business_category} • {selectedMerchant.city}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Store Owner</h4>
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-500 shrink-0"><User size={18} /></div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-500">Name</p>
                                                <p className="text-sm font-semibold text-slate-900">{selectedMerchant.user_profiles?.full_name || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-500 shrink-0"><Phone size={18} /></div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-500">Phone Number</p>
                                                <p className="text-sm font-semibold text-slate-900">{selectedMerchant.user_profiles?.phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Partnership Details</h4>
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-500 shrink-0"><ShieldCheck size={18} /></div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500">Subscription Status</p>
                                            <span className={`inline-flex mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${selectedMerchant.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {selectedMerchant.subscription_status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-sm font-medium text-blue-800">
                                        <p>As a CRM Manager, you can view merchant contact and service details for relationship management. Financial and transaction data are restricted to the Admin Panel.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 bg-slate-50">
                                <button 
                                    onClick={() => { setSelectedMerchant(null); handleOpenModalWithContact(selectedMerchant, 'merchant'); }}
                                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all"
                                >
                                    <MessageSquare size={18} /> Send WhatsApp Message
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <SendWhatsAppDrawer
                isOpen={isWaModalOpen}
                selectedTemplate={selectedTemplate}
                onClose={() => { setIsWaModalOpen(false); setSelectedTemplate(null); setWaModalContact(null); }}
                contactId={waModalContact?.id}
                contactName={waModalContact?.contact_name}
                contactPhoneE164={
                    waModalContact?.phone
                        ? (waModalContact.phone.startsWith('+') ? waModalContact.phone : `+${waModalContact.phone.replace(/\D/g, '')}`)
                        : undefined
                }
                contactType={waModalContact?.type}
                onSuccess={() => {}}
                currentUserRole={currentUserRole}
                currentUserId={currentUserId}
            />
        </div>
    );
}
