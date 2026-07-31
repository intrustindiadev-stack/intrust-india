'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { Search, Phone, Mail, User, Building2, Loader2, AlertCircle } from 'lucide-react';

export default function ContactsClient({ currentUserId, currentUserRole }) {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const isManager = ['relationship_manager', 'admin', 'super_admin'].includes(currentUserRole);

    const fetchContacts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const supabase = createClient();
            
            let query = supabase
                .from('crm_leads')
                .select('id, full_name, email, phone, company, status, assigned_to')
                .neq('source', 'App User')
                .order('full_name', { ascending: true });

            if (!isManager) {
                query = query.eq('assigned_to', currentUserId);
            }

            const { data, error: fetchError } = await query;
            if (fetchError) throw fetchError;
            
            setContacts(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [isManager, currentUserId]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    const filteredContacts = contacts.filter(c => 
        (c.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.company?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (c.phone?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 font-[family-name:var(--font-outfit)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Contacts</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {isManager ? 'View all team contacts and leads in one place.' : 'Manage your assigned contacts and address book.'}
                    </p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
                    <Loader2 size={32} className="animate-spin text-indigo-500" />
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
                        <div key={contact.id} className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-50/80 to-transparent rounded-bl-full pointer-events-none" />
                            
                            <div className="flex items-center gap-4 mb-5 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-500/20">
                                    {contact.full_name?.charAt(0).toUpperCase() || 'C'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-extrabold text-gray-900 text-lg truncate">{contact.full_name || 'Unknown Contact'}</h3>
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mt-0.5">
                                        <Building2 size={12} />
                                        <span className="truncate">{contact.company || 'No Company'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3 relative z-10">
                                <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm text-gray-600 font-medium hover:text-indigo-600 transition-colors p-2 -mx-2 rounded-lg hover:bg-indigo-50/50">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover/mail:bg-indigo-100">
                                        <Mail size={16} className="text-gray-400" />
                                    </div>
                                    <span className="truncate">{contact.email || 'No Email'}</span>
                                </a>
                                <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-sm text-gray-600 font-medium hover:text-indigo-600 transition-colors p-2 -mx-2 rounded-lg hover:bg-indigo-50/50">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                        <Phone size={16} className="text-gray-400" />
                                    </div>
                                    <span className="truncate">{contact.phone || 'No Phone Number'}</span>
                                </a>
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
                                <a href={`/crm/leads/${contact.id}`} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group/link">
                                    View Details <span className="transition-transform group-hover/link:translate-x-0.5">→</span>
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
