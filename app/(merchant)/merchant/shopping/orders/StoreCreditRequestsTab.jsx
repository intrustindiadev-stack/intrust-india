"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle2, XCircle, Search, RefreshCw, AlertCircle } from "lucide-react";

export default function StoreCreditRequestsTab({ merchantId }) {
    const supabase = createClient();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, [merchantId]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("udhari_requests")
                .select(`
                    id,
                    customer_id,
                    amount_paise,
                    duration_days,
                    status,
                    created_at,
                    shopping_order_group_id,
                    customer:user_profiles!udhari_requests_customer_id_fkey(full_name, phone)
                `)
                .eq("merchant_id", merchantId)
                .eq("source_type", "shop_order")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            console.error("Error fetching credit requests:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (requestId, action) => {
        if (!confirm(`Are you sure you want to ${action} this store credit request?`)) return;
        setProcessingId(requestId);
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Not authenticated");

            const response = await fetch('/api/udhari/respond', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    requestId,
                    action: action === 'approve' ? 'approve' : 'deny',
                    disclaimerAccepted: true // Confirmed by the browser confirm dialog
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `Failed to ${action} request`);
            
            // Re-fetch to update state
            await fetchRequests();
        } catch (err) {
            console.error(`Failed to ${action} request:`, err);
            alert(`Failed to ${action} request: ${err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    const filtered = requests.filter(r => {
        const query = search.toLowerCase();
        return (
            r.id.toLowerCase().includes(query) ||
            r.shopping_order_group_id?.toLowerCase().includes(query) ||
            r.customer?.full_name?.toLowerCase().includes(query)
        );
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading store credit requests...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by ID or customer..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-1 focus:ring-emerald-500/40 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="space-y-4">
                <AnimatePresence>
                    {filtered.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white/50 border border-slate-200 border-dashed rounded-3xl p-12 text-center"
                        >
                            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-4" />
                            <h3 className="font-bold text-slate-900 mb-1">No Requests Found</h3>
                            <p className="text-sm text-slate-500">There are no matching store credit requests.</p>
                        </motion.div>
                    ) : (
                        filtered.map(req => (
                            <motion.div
                                key={req.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-5"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl flex items-center justify-center shrink-0 ${
                                            req.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                            req.status === 'approved' ? 'bg-blue-100 text-blue-600' :
                                            req.status === 'settled' ? 'bg-emerald-100 text-emerald-600' :
                                            'bg-red-100 text-red-600'
                                        }`}>
                                            {req.status === 'pending' ? <Clock className="w-6 h-6" /> :
                                             req.status === 'approved' ? <CheckCircle2 className="w-6 h-6" /> :
                                             req.status === 'settled' ? <CheckCircle2 className="w-6 h-6" /> :
                                             <XCircle className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-sm">#{req.id.slice(0, 8).toUpperCase()}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-black bg-slate-100 text-slate-600">
                                                    {req.status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {format(new Date(req.created_at), "dd MMM, HH:mm")} • Customer: {req.customer?.full_name || 'Guest'}
                                            </div>
                                            {req.shopping_order_group_id && (
                                                <div className="text-[10px] text-slate-400 mt-1">
                                                    Order: #{req.shopping_order_group_id.slice(0, 8).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Requested Credit</p>
                                            <p className="font-bold text-lg">₹{((req.amount_paise || 0) / 100).toLocaleString('en-IN')}</p>
                                            <p className="text-[10px] text-slate-400">Duration: {req.duration_days} days</p>
                                        </div>

                                        {req.status === 'pending' && (
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <button
                                                    onClick={() => handleAction(req.id, 'approve')}
                                                    disabled={processingId === req.id}
                                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {processingId === req.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                    APPROVE
                                                </button>
                                                <button
                                                    onClick={() => handleAction(req.id, 'deny')}
                                                    disabled={processingId === req.id}
                                                    className="px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 text-slate-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    DENY
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
