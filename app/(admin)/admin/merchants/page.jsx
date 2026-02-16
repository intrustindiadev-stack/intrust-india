'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle, XCircle, Eye, Clock, Building2, Phone, Mail, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminMerchantsPage() {
    const [filter, setFilter] = useState('pending');
    const [merchants, setMerchants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(null);

    const fetchMerchants = async () => {
        setLoading(true);
        try {
            // Fetch merchants with user profile data
            // We optimize by selecting specific fields
            const { data, error } = await supabase
                .from('merchants')
                .select(`
                    *,
                    user_profiles:user_id (
                        full_name,
                        phone_number,
                        email
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log('Fetched merchants:', data);

            // Transform data to match UI expectations
            const transformed = data.map(m => ({
                id: m.id,
                userId: m.user_id,
                businessName: m.business_name || 'N/A',
                // Use profile data if available, fallback to merchant data if it exists (it might not)
                ownerName: m.user_profiles?.full_name || 'Unknown',
                phone: m.user_profiles?.phone_number || 'N/A',
                email: m.user_profiles?.email || 'N/A',
                gstNumber: m.gst_number || 'N/A',
                status: m.status || 'pending',
                appliedDate: new Date(m.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }),
                documents: 0 // Placeholder
            }));

            setMerchants(transformed);
        } catch (error) {
            console.error('Error fetching merchants:', error);
            toast.error('Failed to load merchant applications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMerchants();
    }, []);

    const filteredMerchants = merchants.filter(m => m.status === filter);

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
        // Placeholder for reject logic
        console.log('Reject merchant:', id);
        toast.success('Merchant rejected (Mock)');
        // In real impl, call API to update status to 'rejected'
    };

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="p-6 lg:p-12 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                            Merchant Applications
                        </h1>
                        <p className="text-gray-600">Review and manage merchant onboarding requests</p>
                    </div>
                    <button
                        onClick={fetchMerchants}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all font-medium text-sm shadow-sm"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        Refresh List
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-3 mb-8">
                    {['pending', 'approved', 'rejected'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-5 py-2.5 rounded-lg font-medium capitalize transition-all text-sm ${filter === status
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            {status}
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${filter === status ? 'bg-white/20' : 'bg-gray-100'
                                }`}>
                                {merchants.filter(m => m.status === status).length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading applications...</p>
                    </div>
                )}

                {/* Merchants Table */}
                {!loading && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Business Details</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Info</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">GST Number</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Applied Date</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredMerchants.length > 0 ? (
                                        filteredMerchants.map((merchant) => (
                                            <tr key={merchant.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                                                            {merchant.businessName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900">{merchant.businessName}</div>
                                                            <div className="text-sm text-gray-500">{merchant.ownerName}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <Phone size={14} className="text-gray-400" />
                                                            {merchant.phone}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <Mail size={14} className="text-gray-400" />
                                                            {merchant.email}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-inconsolata bg-gray-50 px-2 py-1 rounded border border-gray-200 inline-block text-gray-700">
                                                        {merchant.gstNumber}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Clock size={14} className="text-gray-400" />
                                                        {merchant.appliedDate}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${merchant.status === 'pending'
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : merchant.status === 'approved'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-red-50 text-red-700 border-red-200'
                                                        }`}>
                                                        {merchant.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all" title="View Details">
                                                            <Eye size={18} />
                                                        </button> */}
                                                        {merchant.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleReject(merchant.id)}
                                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                    title="Reject"
                                                                    disabled={approving === merchant.id}
                                                                >
                                                                    <XCircle size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleApprove(merchant.id, merchant.userId)}
                                                                    className={`p-2 rounded-lg transition-all ${approving === merchant.id
                                                                            ? 'bg-emerald-50 text-emerald-600 cursor-wait'
                                                                            : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
                                                                        }`}
                                                                    title="Approve"
                                                                    disabled={approving === merchant.id}
                                                                >
                                                                    {approving === merchant.id ? (
                                                                        <div className="w-[18px] h-[18px] border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                                                                    ) : (
                                                                        <CheckCircle size={18} />
                                                                    )}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colspan="6" className="text-center py-16">
                                                <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                                    <Building2 className="w-8 h-8 text-gray-300" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-1">No {filter} merchants</h3>
                                                <p className="text-gray-500">There are no merchant applications with {filter} status.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
