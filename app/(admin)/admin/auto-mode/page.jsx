'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Users, Search, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import MerchantCard from '@/components/admin/merchants/MerchantCard';
import { supabase } from '@/lib/supabaseClient';

export default function AutoModeAdminDashboard() {
    const [merchants, setMerchants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchMerchants();
    }, []);

    const [totalRevenue, setTotalRevenue] = useState(0);

    const fetchMerchants = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const res = await fetch('/api/admin/merchants', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            
            if (!res.ok) {
                const errResult = await res.json().catch(() => ({}));
                throw new Error(errResult.error || 'Failed to fetch merchants (ensure SQL is run)');
            }
            const data = await res.json();
            
            // Only capture those explicitly active
            const autoModeActiveMerchants = (data.merchants || []).filter(m => m.auto_mode_status === 'active');
            
            const transformed = autoModeActiveMerchants.map(m => ({
                id: m.id,
                userId: m.user_id,
                businessName: m.business_name || 'Unnamed Business',
                ownerName: m.user_profiles?.full_name || 'N/A',
                phone: m.user_profiles?.phone || 'N/A',
                email: m.user_profiles?.email || 'N/A',
                gstNumber: m.gst_number || 'N/A',
                status: m.status,
                subscriptionStatus: m.subscription_status,
                subscriptionExpiresAt: m.subscription_expires_at,
                bankVerified: m.bank_verified,
                bankAccountNumber: m.bank_account_number,
                bankAccountName: m.bank_account_name,
                hasBankData: !!m.bank_data,
                appliedDate: new Date(m.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }),
                documents: 0,
                udhariEnabled: m.udhari_enabled,
                autoModeStatus: m.auto_mode_status,
                autoModeValidUntil: m.auto_mode_valid_until
            }));

            setMerchants(transformed);
            setTotalRevenue((data.totalSubscriptionRevenuePaise || 0) / 100);
        } catch (error) {
            console.error('Error fetching merchants:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMerchants = merchants.filter(m => 
        m.businessName.toLowerCase().includes(search.toLowerCase()) ||
        m.phone.includes(search)
    );

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-3xl text-white shadow-xl">
                <div className="space-y-4 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-md">
                        <Sparkles size={14} className="text-indigo-400" />
                        <span className="text-xs font-bold tracking-widest uppercase text-indigo-100">Premium Network</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                        Auto Mode Operations
                    </h1>
                    <p className="text-indigo-200/80 text-lg font-medium leading-relaxed max-w-xl">
                        Monitor and manage the exclusive tier of merchants utilizing AI fulfillment, real-time inventory automation, and automated delivery flows.
                    </p>
                </div>
                
                {/* Stats */}
                <div className="flex gap-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[140px]">
                        <div className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Active Automated</div>
                        <div className="text-3xl font-black text-white">{loading ? '-' : merchants.length}</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[140px]">
                        <div className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Actual Revenue <span className="opacity-40 text-[9px] ml-1">(Subscription)</span></div>
                        <div className="text-3xl font-black text-white flex items-baseline gap-1">
                            <span className="text-lg">₹</span>
                            {loading ? '-' : totalRevenue.toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>
            </header>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative w-full sm:w-[400px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search automated merchants..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* Data Grid */}
            <main>
                {loading ? (
                    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-slate-400 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200 border-dashed">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="font-bold tracking-tight">Syncing network...</p>
                    </div>
                ) : filteredMerchants.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredMerchants.map(merchant => (
                            <MerchantCard
                                key={merchant.id}
                                merchant={merchant}
                                udhariEnabled={merchant.udhariEnabled}
                                onApprove={() => {}}
                                onReject={() => {}}
                                onVerifyBank={() => {}}
                                onToggleSuspend={() => {}}
                                isApproving={false}
                                isVerifyingBank={false}
                                isRejecting={false}
                                isTogglingSuspend={false}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-slate-400 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200 border-dashed">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-400 mb-2 shadow-inner border border-indigo-100">
                            <Sparkles size={28} />
                        </div>
                        <h3 className="font-black text-xl text-slate-700 tracking-tight">No Automated Merchants Yet</h3>
                        <p className="text-sm font-medium text-slate-500 max-w-sm text-center">
                            Merchants who activate the Auto Mode subscription will appear here seamlessly.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
