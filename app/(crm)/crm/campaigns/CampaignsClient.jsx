'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { Megaphone, Users, Target, Loader2, AlertCircle, BarChart3, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CampaignsClient({ currentUserId, currentUserRole }) {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isManager = ['relationship_manager', 'admin', 'super_admin'].includes(currentUserRole);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const supabase = createClient();
            
            let query = supabase
                .from('crm_leads')
                .select('id, contact_name, phone, email, source, status, created_at, assigned_to')
                .is('archived_at', null)
                .neq('source', 'App User');

            // Executives only see their assigned leads' sources
            if (!isManager) {
                query = query.eq('assigned_to', currentUserId);
            }

            const { data, error: fetchError } = await query;
            if (fetchError) throw fetchError;
            
            setLeads(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [isManager, currentUserId]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // Aggregate pseudo-campaigns from Lead source field
    const campaigns = leads.reduce((acc, lead) => {
        const source = lead.source || 'Organic / Unknown';
        if (!acc[source]) {
            acc[source] = {
                name: source,
                total_leads: 0,
                won_leads: 0,
                total_value: 0
            };
        }
        acc[source].total_leads += 1;
        if (lead.status === 'won') {
            acc[source].won_leads += 1;
        }
        acc[source].total_value += Number(lead.deal_value || 0);
        return acc;
    }, {});

    const campaignList = Object.values(campaigns).sort((a, b) => b.total_leads - a.total_leads);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 font-[family-name:var(--font-outfit)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Campaigns</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {isManager ? 'Track overall campaign performance and ROI.' : 'View performance metrics for your lead sources.'}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
                    <Loader2 size={32} className="animate-spin text-indigo-500" />
                    <p className="text-sm font-medium">Loading campaigns...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 bg-red-50/50 rounded-3xl border border-red-100">
                    <AlertCircle size={32} className="text-red-400" />
                    <p className="text-red-900 font-semibold">{error}</p>
                </div>
            ) : campaignList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4 bg-gray-50/50 rounded-3xl border border-gray-100 border-dashed">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-400">
                        <Megaphone size={32} />
                    </div>
                    <p className="text-gray-500 font-semibold text-lg">No active campaigns found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {campaignList.map((campaign, idx) => {
                            const conversionRate = ((campaign.won_leads / campaign.total_leads) * 100).toFixed(1);
                            return (
                                <motion.div
                                    key={idx}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-50/80 to-transparent rounded-bl-full pointer-events-none" />
                                    
                                    <div className="flex items-center gap-3 mb-6 relative z-10">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                                            <Megaphone size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-gray-900 text-lg">{campaign.name}</h3>
                                            <p className="text-xs font-semibold text-indigo-600">Lead Source</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 relative z-10">
                                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                                                <Users size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-wider">Total Leads</span>
                                            </div>
                                            <div className="text-2xl font-black text-gray-900">{campaign.total_leads}</div>
                                        </div>
                                        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                                            <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                                                <Target size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-wider">Won Leads</span>
                                            </div>
                                            <div className="text-2xl font-black text-emerald-700">{campaign.won_leads}</div>
                                        </div>
                                        <div className="col-span-2 bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex justify-between items-center">
                                            <div>
                                                <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                                                    <BarChart3 size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Conversion Rate</span>
                                                </div>
                                                <div className="text-2xl font-black text-indigo-900">{conversionRate}%</div>
                                            </div>
                                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-indigo-500">
                                                <TrendingUp size={20} />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
