'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle, XCircle, Eye, Clock, Building2, Phone, Mail, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

import MerchantCard from '@/components/admin/merchants/MerchantCard';

export default function AdminMerchantsPage() {
    const [filter, setFilter] = useState('pending');
    const [merchants, setMerchants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(null);
    const [verifyingBank, setVerifyingBank] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchMerchants = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const res = await fetch('/api/admin/merchants', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to load merchants');

            const data = result.merchants || [];

            const transformed = data.map(m => ({
                id: m.id,
                userId: m.user_id,
                businessName: m.business_name || 'N/A',
                ownerName: m.user_profiles?.full_name || 'Unknown',
                phone: m.user_profiles?.phone || 'N/A',
                email: m.user_profiles?.email || 'N/A',
                gstNumber: m.gst_number || 'N/A',
                status: m.status || 'pending',
                bankVerified: m.bank_verified || false,
                hasBankData: !!(m.bank_account_number || m.bank_data?.account_number),
                bankAccountName: m.bank_account_name || m.bank_data?.account_holder_name || null,
                appliedDate: new Date(m.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }),
                documents: 0
            }));

            setMerchants(transformed);
        } catch (error) {
            console.error('Error fetching merchants:', error);
            toast.error('Failed to load merchants: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMerchants();
    }, []);

    const filteredMerchants = merchants.filter(m => {
        const matchesStatus = m.status === filter;
        const matchesSearch =
            m.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const handleApprove = async (id, userId) => {
        if (!confirm('Are you sure you want to approve this merchant?')) return;

        setApproving(id);
        const toastId = toast.loading('Approving merchant...');

        try {
            const response = await fetch('/api/admin/approve-merchant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicationId: id, userId }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to approve merchant');
            }

            toast.success('Merchant approved successfully!', { id: toastId });

            // Refresh list
            fetchMerchants();
        } catch (error) {
            console.error('Approval error:', error);
            toast.error(error.message, { id: toastId });
        } finally {
            setApproving(null);
        }
    };

    const handleReject = async (id) => {
        if (!confirm('Reject this application? (This feature is currently mock-only)')) return;
        console.log('Reject merchant:', id);
        toast.success('Merchant rejected (Mock)');
    };

    const handleVerifyBank = async (id) => {
        if (!confirm('Confirm bank account as verified for this merchant?')) return;
        setVerifyingBank(id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/verify-bank', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ merchantId: id }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed');
            toast.success('Bank account verified!');
            fetchMerchants();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setVerifyingBank(null);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-[family-name:var(--font-outfit)]">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Merchant Applications
                    </h1>
                    <p className="text-slate-500 dark:text-gray-400 font-medium">
                        Review and manage merchant onboarding requests
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search business, owner, or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-80 pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <Eye size={18} strokeWidth={2.5} />
                        </div>
                    </div>
                    <button
                        onClick={fetchMerchants}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all font-bold text-sm shadow-sm"
                    >
                        <RefreshCw size={18} strokeWidth={2.5} className={loading ? "animate-spin text-blue-500" : ""} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex overflow-x-auto hide-scrollbar gap-3 mb-8 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {['pending', 'approved', 'rejected'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold capitalize transition-all text-sm shadow-sm ${filter === status
                            ? 'bg-slate-800 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
                            }`}
                    >
                        {status}
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-extrabold ${filter === status ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {merchants.filter(m => m.status === status).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Loading State */}
            {loading && (
                <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center shadow-sm">
                    <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 font-bold">Loading applications...</p>
                </div>
            )}

            {/* Merchants Grid */}
            {!loading && (
                <>
                    {filteredMerchants.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredMerchants.map((merchant) => (
                                <MerchantCard
                                    key={merchant.id}
                                    merchant={merchant}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    onVerifyBank={handleVerifyBank}
                                    isApproving={approving}
                                    isVerifyingBank={verifyingBank}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Building2 className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">No {filter} merchants</h3>
                            <p className="text-slate-500 font-medium">There are no merchant applications with {filter} status.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
