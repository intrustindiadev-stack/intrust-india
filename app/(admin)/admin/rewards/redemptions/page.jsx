'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Filter,
    ArrowLeft,
    User,
    Wallet,
    AlertCircle,
    Info,
    Check,
    X,
    Loader2,
    Calendar,
    Phone,
    Mail
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useTheme } from '@/lib/contexts/ThemeContext';

export default function AdminRedemptionsPage() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('pending'); // pending, completed, rejected
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({ pending: 0, completed: 0, rejected: 0 });

    // Modals
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, requestId: null });
    const [rejectModal, setRejectModal] = useState({ isOpen: false, requestId: null, reason: '' });
    const [actionLoading, setActionLoading] = useState(false);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const statusFilter = activeTab === 'completed' ? 'completed' : activeTab;
            const response = await fetch(`/api/admin/rewards/redemptions?status=${statusFilter}`);
            const data = await response.json();
            
            if (data.requests) {
                setRequests(data.requests);
                // In a real app, we'd fetch counts for all tabs. For now, we update the current tab's count in stats if we were clever, 
                // but let's just keep it simple and update the current tab data.
            }
        } catch (err) {
            console.error('Error fetching redemptions:', err);
            toast.error('Failed to load redemption requests');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleApprove = async () => {
        if (!confirmModal.requestId) return;
        
        setActionLoading(true);
        try {
            const response = await fetch(`/api/admin/rewards/redemptions/${confirmModal.requestId}/approve`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                toast.success('Redemption approved and processed!');
                setConfirmModal({ isOpen: false, requestId: null });
                fetchRequests();
            } else {
                toast.error(data.error || 'Failed to approve request');
            }
        } catch (err) {
            console.error('Approval error:', err);
            toast.error('An unexpected error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectModal.requestId || !rejectModal.reason.trim()) {
            toast.error('Please provide a rejection reason');
            return;
        }
        
        setActionLoading(true);
        try {
            const response = await fetch(`/api/admin/rewards/redemptions/${rejectModal.requestId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejection_reason: rejectModal.reason })
            });
            const data = await response.json();
            
            if (data.success) {
                toast.success('Redemption request rejected');
                setRejectModal({ isOpen: false, requestId: null, reason: '' });
                fetchRequests();
            } else {
                toast.error(data.error || 'Failed to reject request');
            }
        } catch (err) {
            console.error('Rejection error:', err);
            toast.error('An unexpected error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredRequests = requests.filter(req => {
        const nameMatch = req.user_profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const emailMatch = req.user_profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const phoneMatch = req.user_profiles?.phone?.includes(searchQuery);
        return nameMatch || emailMatch || phoneMatch;
    });

    const StatusBadge = ({ status }) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Clock size={12} /> Pending
                    </span>
                );
            case 'completed':
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle2 size={12} /> Processed
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                        <XCircle size={12} /> Rejected
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link 
                                href="/admin/rewards"
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                                    Reward Redemptions
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    Manage and process point-to-wallet conversion requests
                                </p>
                            </div>
                        </div>

                        <div className="relative group min-w-[300px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name, email or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-2xl w-fit mb-8">
                    {[
                        { id: 'pending', label: 'Pending', icon: Clock },
                        { id: 'completed', label: 'Completed', icon: CheckCircle2 },
                        { id: 'rejected', label: 'Rejected', icon: XCircle },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all relative ${
                                activeTab === tab.id 
                                ? 'text-white' 
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-indigo-600 rounded-xl shadow-md"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <tab.icon size={16} className="relative z-10" />
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Table */}
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-500 gap-4">
                            <Loader2 className="animate-spin text-indigo-600" size={40} />
                            <p className="font-medium">Loading requests...</p>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-4 text-center px-6">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-2">
                                <Info size={40} className="text-gray-300 dark:text-gray-600" />
                            </div>
                            <div>
                                <p className="font-bold text-lg text-gray-900 dark:text-white">No requests found</p>
                                <p className="text-sm max-w-xs">There are no {activeTab} redemption requests at the moment.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">User Details</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">Points</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">Value</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">Requested On</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">Status</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {filteredRequests.map((req) => (
                                        <motion.tr 
                                            key={req.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors"
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                        <User size={20} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900 dark:text-white truncate max-w-[200px]">
                                                            {req.user_profiles?.full_name || 'Anonymous User'}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {req.user_profiles?.phone || 'No Phone'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="inline-flex items-center gap-1.5 font-black text-gray-900 dark:text-white">
                                                    <span className="text-amber-500">🪙</span>
                                                    {req.points_requested.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="inline-flex items-center gap-1.5 font-black text-indigo-600 dark:text-indigo-400">
                                                    <Wallet size={16} />
                                                    {formatCurrency(req.rupee_value_paise / 100)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {formatDate(req.created_at)}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 uppercase">
                                                        {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <StatusBadge status={req.status} />
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                {req.status === 'pending' ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => setRejectModal({ isOpen: true, requestId: req.id, reason: '' })}
                                                            className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 transition-colors"
                                                            title="Reject Request"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => setConfirmModal({ isOpen: true, requestId: req.id })}
                                                            className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 transition-colors"
                                                            title="Approve & Credit Wallet"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-end">
                                                        {req.processed_at && (
                                                            <span className="text-[10px] text-gray-400 uppercase block mb-1">
                                                                Processed {formatDate(req.processed_at)}
                                                            </span>
                                                        )}
                                                        {req.status === 'rejected' && req.rejection_reason && (
                                                            <div className="group relative">
                                                                <Info size={16} className="text-gray-400 cursor-help" />
                                                                <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl border border-white/10">
                                                                    Reason: {req.rejection_reason}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>

                {/* Legend/Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex gap-3">
                        <AlertCircle className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" size={20} />
                        <div>
                            <p className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase">Approval Logic</p>
                            <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-1">Approving will instantly deduct user points and add INR to their wallet.</p>
                        </div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800 flex gap-3">
                        <Phone className="text-amber-600 dark:text-amber-400 flex-shrink-0" size={20} />
                        <div>
                            <p className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase">User Verification</p>
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">Contact users directly if request details seem suspicious before approving.</p>
                        </div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex gap-3">
                        <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" size={20} />
                        <div>
                            <p className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase">Automatic Notifications</p>
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">Users are notified via in-app alerts when their request status changes.</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Approval Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onCancel={() => setConfirmModal({ isOpen: false, requestId: null })}
                onConfirm={handleApprove}
                title="Approve Redemption?"
                message="This will immediately deduct points and credit the equivalent INR to the user's wallet. This action cannot be undone."
                confirmLabel={actionLoading ? "Processing..." : "Confirm Approval"}
            />

            {/* Rejection Modal */}
            <AnimatePresence>
                {rejectModal.isOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !actionLoading && setRejectModal({ ...rejectModal, isOpen: false })}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className={`relative w-full max-w-md rounded-3xl p-8 shadow-2xl ${
                                isDark ? 'bg-[#12151c] border border-white/10' : 'bg-white border border-slate-100'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400">
                                    <XCircle size={28} />
                                </div>
                                <div>
                                    <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        Reject Request
                                    </h3>
                                    <p className="text-sm text-gray-500">Provide a reason for the user</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                                        Rejection Reason
                                    </label>
                                    <textarea
                                        autoFocus
                                        value={rejectModal.reason}
                                        onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                                        placeholder="e.g., Insufficient active referrals, suspicious activity..."
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-sm min-h-[120px] resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        disabled={actionLoading}
                                        onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}
                                        className={`flex-1 py-3.5 rounded-2xl font-black text-sm transition-all ${
                                            isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        }`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={actionLoading || !rejectModal.reason.trim()}
                                        onClick={handleReject}
                                        className="flex-1 py-3.5 rounded-2xl font-black text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                                        Reject Request
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
