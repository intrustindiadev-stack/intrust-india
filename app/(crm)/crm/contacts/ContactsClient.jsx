'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { Search, Phone, Mail, User, Building2, Loader2, AlertCircle, MessageSquare, LayoutGrid, Layers } from 'lucide-react';
import TemplateGallery from '@/components/crm/whatsapp/TemplateGallery';
import SendWhatsAppModal from '@/components/crm/whatsapp/SendWhatsAppModal';

export default function ContactsClient({ currentUserId, currentUserRole }) {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // View mode: 'contacts' | 'templates'
    const [activeTab, setActiveTab] = useState('contacts');

    // Templates state
    const [templates, setTemplates] = useState([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [templatesError, setTemplatesError] = useState(null);
    const [templateSource, setTemplateSource] = useState(null); // 'omniflow' | 'fallback'

    // Parent Modal & Template Selection State (Section E requirement)
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [waModalContact, setWaModalContact] = useState(null);

    const isManager = ['relationship_manager', 'admin', 'super_admin'].includes(currentUserRole);

    // 1. Fetch Contacts
    const fetchContacts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const supabase = createClient();
            
            let query = supabase
                .from('crm_leads')
                .select('id, contact_name, email, phone, title, status, assigned_to')
                .neq('source', 'App User')
                .order('contact_name', { ascending: true });

            if (!isManager) {
                query = query.eq('assigned_to', currentUserId);
            }

            const { data, fetchError } = await query;
            if (fetchError) throw fetchError;
            
            setContacts(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [isManager, currentUserId]);

    // 2. Fetch Templates
    const fetchTemplates = useCallback(async () => {
        setLoadingTemplates(true);
        setTemplatesError(null);
        try {
            const res = await fetch('/api/whatsapp/templates');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch WhatsApp templates');
            setTemplates(data.templates || []);
            setTemplateSource(data.source || null);
        } catch (err) {
            setTemplatesError(err.message);
        } finally {
            setLoadingTemplates(false);
        }
    }, []);

    useEffect(() => {
        fetchContacts();
        fetchTemplates();
    }, [fetchContacts, fetchTemplates]);

    // Parent State Flow Handler for Template Selection (Section E)
    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
        setIsWaModalOpen(true);
    };

    const handleOpenModalWithContact = (contact) => {
        setWaModalContact(contact);
        // If templates are loaded, select the first approved template by default when launching from contact card
        if (templates && templates.length > 0) {
            setSelectedTemplate(templates[0]);
            setIsWaModalOpen(true);
        } else {
            // Switch to templates tab so user can select a template
            setActiveTab('templates');
        }
    };

    const handleCloseModal = () => {
        setIsWaModalOpen(false);
        // Reset selected template after closing
        setTimeout(() => {
            setSelectedTemplate(null);
        }, 150);
    };

    const filteredContacts = contacts.filter(c => 
        (c.contact_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.phone?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 font-[family-name:var(--font-outfit)] space-y-8">
            
            {/* Header with Navigation & Action */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Contacts & Communication</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {isManager ? 'View team contacts and trigger WhatsApp campaign templates.' : 'Manage your assigned contacts and address book.'}
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* View Switcher Tabs */}
                    <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
                        <button
                            onClick={() => setActiveTab('contacts')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                                activeTab === 'contacts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <User size={14} />
                            <span>Contacts</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('templates')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                                activeTab === 'templates' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <MessageSquare size={14} />
                            <span>WhatsApp Templates</span>
                        </button>
                    </div>

                    {activeTab === 'contacts' && (
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search contacts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all text-sm font-medium bg-white"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* TAB 1: Contacts Grid */}
            {activeTab === 'contacts' && (
                <>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
                            <Loader2 size={32} className="animate-spin text-slate-600" />
                            <p className="text-sm font-medium">Loading contacts...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-red-50/50 rounded-3xl border border-red-100">
                            <AlertCircle size={32} className="text-red-400" />
                            <p className="text-red-900 font-semibold">{error}</p>
                        </div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4 bg-gray-50/50 rounded-3xl border border-gray-100 border-dashed">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-400">
                                <User size={32} />
                            </div>
                            <p className="text-gray-500 font-semibold text-lg">No contacts found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredContacts.map(contact => (
                                <div key={contact.id} className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-4 mb-5 relative z-10">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-xl shadow-md">
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
                                                        onClick={() => handleOpenModalWithContact(contact)}
                                                        title="Send WhatsApp Message"
                                                        className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs font-bold"
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
                                            <button
                                                onClick={() => handleOpenModalWithContact(contact)}
                                                className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1"
                                            >
                                                WhatsApp
                                            </button>
                                            <a href={`/crm/leads/${contact.id}`} className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1">
                                                View →
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* TAB 2: WhatsApp Template Gallery */}
            {activeTab === 'templates' && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                    <TemplateGallery
                        templates={templates}
                        isLoading={loadingTemplates}
                        error={templatesError}
                        onSelectTemplate={handleSelectTemplate}
                        onRetry={fetchTemplates}
                        templateSource={templateSource}
                    />
                </div>
            )}

            {/* Single Shared SendWhatsAppModal Instance (Section E) */}
            <SendWhatsAppModal
                isOpen={isWaModalOpen}
                selectedTemplate={selectedTemplate}
                onClose={handleCloseModal}
                contactId={waModalContact?.id}
                contactName={waModalContact?.contact_name}
                contactPhoneE164={
                    waModalContact?.phone
                        ? (waModalContact.phone.startsWith('+') ? waModalContact.phone : `+${waModalContact.phone.replace(/\D/g, '')}`)
                        : undefined
                }
                onSuccess={() => fetchContacts()}
            />
        </div>
    );
}
