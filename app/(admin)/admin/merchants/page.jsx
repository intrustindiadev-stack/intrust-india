'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle, XCircle, Eye, Clock, Building2, Phone, Mail, RefreshCw, AlertCircle, CreditCard, Search, ShieldOff, ShieldCheck, X, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

import MerchantCard from '@/components/admin/merchants/MerchantCard';

/* ─── Production-grade Action Modal (replaces all browser dialogs) ─── */
function ActionModal({ isOpen, onClose, config, onConfirm, isLoading }) {
    const [reason, setReason] = useState('');
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen);
        setReason('');
    }

    if (!config) return null;

    const handleConfirm = () => {
        if (config.requiresReason && !reason.trim()) {
            toast.error('Please provide a reason before continuing.');
            return;
        }
        onConfirm(reason.trim());
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-100"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${config.iconBg}`}>
                            <config.Icon size={24} className={config.iconColor} />
                        </div>

                        <h3 className="text-lg font-black text-slate-900 mb-1">{config.title}</h3>
                        <p className="text-sm text-slate-500 mb-5 leading-relaxed">{config.message}</p>

                        {config.requiresReason && (
                            <div className="mb-5">
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                                    {config.reasonLabel || 'Reason'} <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                    placeholder={config.reasonPlaceholder || 'Provide a reason...'}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                                />
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isLoading || (config.requiresReason && !reason.trim())}
                                className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${config.confirmCls}`}
                            >
                                {isLoading
                                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : config.confirmLabel
                                }
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default function AdminMerchantsPage() {
    const [filter, setFilter] = useState('pending');
    const [merchants, setMerchants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [quickPhone, setQuickPhone] = useState('');
    const [foundMerchant, setFoundMerchant] = useState(null);

    // Modal state
    const [modal, setModal] = useState({ open: false, config: null, handler: null });
    const [modalLoading, setModalLoading] = useState(false);

    // Specific operation tracking
    const [approving, setApproving] = useState(null);
    const [rejecting, setRejecting] = useState(null);
    const [verifyingBank, setVerifyingBank] = useState(null);
    const [togglingSupend, setTogglingSupend] = useState(null);

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
                avatarUrl: m.user_profiles?.avatar_url || null,
                phone: m.user_profiles?.phone || m.business_phone || 'N/A',
                email: m.user_profiles?.email || m.business_email || 'N/A',
                gstNumber: m.gst_number || 'N/A',
                status: m.status || 'pending',
                subscriptionStatus: m.subscription_status || 'unpaid',
                subscriptionExpiresAt: m.subscription_expires_at || null,
                bankVerified: m.bank_verified || false,
                hasBankData: !!(m.bank_account_number || m.bank_data?.account_number),
                bankAccountName: m.bank_account_name || m.bank_data?.account_holder_name || null,
                appliedDate: new Date(m.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
                documents: 0,
                udhariEnabled: m.udhari_enabled,
                autoModeStatus: m.auto_mode_status || 'inactive',
                autoModeValidUntil: m.auto_mode_valid_until || null,
            }));
            setMerchants(transformed);
        } catch (error) {
            console.error('Error fetching merchants:', error);
            toast.error('Failed to load merchants: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMerchants(); }, []);

    const filteredMerchants = merchants.filter(m => {
        const matchesStatus = searchTerm.trim() !== '' ? true : m.status === filter;
        const matchesSearch =
            m.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.phone.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    /* ─── Modal helpers ─── */
    const openModal = (config, handler) => setModal({ open: true, config, handler });
    const closeModal = () => setModal({ open: false, config: null, handler: null });

    const handleModalConfirm = async (reason) => {
        setModalLoading(true);
        try {
            await modal.handler(reason);
        } finally {
            setModalLoading(false);
            closeModal();
        }
    };

    /* ─── Approve ─── */
    const handleApprove = (id, userId) => {
        openModal({
            title: 'Approve Merchant',
            message: 'Are you sure you want to approve this merchant? They will gain full platform access.',
            Icon: CheckCircle,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            confirmLabel: 'Approve',
            confirmCls: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25',
            requiresReason: false,
        }, async () => {
            setApproving(id);
            const toastId = toast.loading('Approving merchant...');
            try {
                const response = await fetch('/api/admin/approve-merchant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ applicationId: id, userId }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to approve merchant');
                toast.success('Merchant approved successfully!', { id: toastId });
                fetchMerchants();
            } catch (error) {
                toast.error(error.message, { id: toastId });
            } finally {
                setApproving(null);
            }
        });
    };

    /* ─── Reject ─── */
    const handleReject = (id, userId) => {
        openModal({
            title: 'Reject Merchant Application',
            message: `Please provide a reason for rejecting this merchant application. The merchant will be notified.`,
            Icon: XCircle,
            iconBg: 'bg-rose-50',
            iconColor: 'text-rose-600',
            confirmLabel: 'Reject Application',
            confirmCls: 'bg-rose-600 hover:bg-rose-700 text-white',
            requiresReason: true,
            reasonLabel: 'Rejection Reason',
            reasonPlaceholder: 'e.g., Incomplete documents, GST number invalid...',
        }, async (reason) => {
            setRejecting(id);
            const toastId = toast.loading('Rejecting merchant...');
            try {
                const response = await fetch('/api/admin/reject-merchant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ applicationId: id, userId, reason }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to reject merchant');
                toast.success('Merchant rejected successfully!', { id: toastId });
                fetchMerchants();
            } catch (error) {
                toast.error(error.message, { id: toastId });
            } finally {
                setRejecting(null);
            }
        });
    };

    /* ─── Toggle Suspend ─── */
    const handleToggleSuspend = (id, userId, currentStatus) => {
        const willSuspend = currentStatus !== 'suspended';

        if (willSuspend) {
            openModal({
                title: 'Suspend Merchant Account',
                message: 'This will immediately restrict the merchant from using the platform. Please provide a reason.',
                Icon: ShieldOff,
                iconBg: 'bg-orange-50',
                iconColor: 'text-orange-600',
                confirmLabel: 'Suspend Account',
                confirmCls: 'bg-orange-600 hover:bg-orange-700 text-white',
                requiresReason: true,
                reasonLabel: 'Suspension Reason',
                reasonPlaceholder: 'e.g., Policy violation, Suspicious activity...',
            }, async (reason) => {
                setTogglingSupend(id);
                const toastId = toast.loading('Suspending merchant...');
                try {
                    const response = await fetch(`/api/admin/merchants/${id}/toggle-suspend`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ suspend: true, reason }),
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || 'Failed to suspend merchant');
                    toast.success('Merchant suspended successfully!', { id: toastId });
                    fetchMerchants();
                } catch (error) {
                    toast.error(error.message, { id: toastId });
                } finally {
                    setTogglingSupend(null);
                }
            });
        } else {
            openModal({
                title: 'Unsuspend Merchant Account',
                message: 'This will restore the merchant\'s full platform access. Are you sure?',
                Icon: ShieldCheck,
                iconBg: 'bg-emerald-50',
                iconColor: 'text-emerald-600',
                confirmLabel: 'Unsuspend Account',
                confirmCls: 'bg-emerald-600 hover:bg-emerald-700 text-white',
                requiresReason: false,
            }, async () => {
                setTogglingSupend(id);
                const toastId = toast.loading('Unsuspending merchant...');
                try {
                    const response = await fetch(`/api/admin/merchants/${id}/toggle-suspend`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ suspend: false }),
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || 'Failed to unsuspend merchant');
                    toast.success('Merchant unsuspended successfully!', { id: toastId });
                    fetchMerchants();
                } catch (error) {
                    toast.error(error.message, { id: toastId });
                } finally {
                    setTogglingSupend(null);
                }
            });
        }
    };

    /* ─── Verify Bank ─── */
    const handleVerifyBank = (id) => {
        openModal({
            title: 'Verify Bank Account',
            message: 'Confirm that you have manually verified the bank account details for this merchant. This action is logged.',
            Icon: CheckCircle,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            confirmLabel: 'Mark as Verified',
            confirmCls: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25',
            requiresReason: false,
        }, async () => {
            setVerifyingBank(id);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch('/api/admin/verify-bank', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
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
        });
    };

    useEffect(() => {
        if (quickPhone.trim().length >= 10) {
            const merchant = merchants.find(m => m.phone.includes(quickPhone) || quickPhone.includes(m.phone));
            setFoundMerchant(merchant || null);
        } else {
            setFoundMerchant(null);
        }
    }, [quickPhone, merchants]);

    return (
        <div className="p-4 sm:p-8 lg:p-10 max-w-[1600px] mx-auto font-[family-name:var(--font-outfit)] min-h-screen bg-slate-50/50">
            {/* Production Modal — replaces all browser dialogs */}
            <ActionModal
                isOpen={modal.open}
                onClose={closeModal}
                config={modal.config}
                onConfirm={handleModalConfirm}
                isLoading={modalLoading}
            />

            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                            <Building2 className="text-white" size={20} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                            Merchants <span className="text-blue-600">Portal</span>
                        </h1>
                    </div>
                    <p className="text-slate-500 font-bold text-sm sm:text-base max-w-xl">
                        Centralized hub for reviewing, approving, and managing merchant onboarding and operational status.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/merchants/udhari" className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all font-black text-xs uppercase tracking-widest shadow-sm group">
                            <CreditCard size={16} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                            Store Credit
                        </Link>
                        <button
                            onClick={fetchMerchants}
                            disabled={loading}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all font-black text-xs uppercase tracking-widest shadow-sm group"
                        >
                            <RefreshCw size={16} strokeWidth={2.5} className={`${loading ? 'animate-spin text-blue-500' : 'group-hover:rotate-180'} transition-all duration-500`} />
                            Refresh
                        </button>
                    </div>

                    <div className="relative group flex-1 sm:flex-none">
                        <input
                            type="text"
                            placeholder="Universal merchant search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-80 pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-400"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Search size={18} strokeWidth={3} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Phone Action Section */}
            <div className="mb-12 bg-slate-900 rounded-[2.5rem] p-6 sm:p-12 border border-slate-800 shadow-2xl relative overflow-hidden group/quick">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover/quick:bg-blue-600/30 transition-all duration-700" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2" />

                <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-10">
                    <div className="space-y-3 text-center xl:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                            <RefreshCw size={10} className="animate-spin-slow" /> Instant Action
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                            Quick Search <br className="hidden sm:block" />
                            <span className="text-blue-500">& Action Hub</span>
                        </h2>
                        <p className="text-slate-500 font-bold text-base max-w-md">Enter a mobile number to instantly manage merchant status and banking details.</p>
                    </div>

                    <div className="w-full sm:w-auto xl:min-w-[450px]">
                        <div className="relative">
                            <input
                                type="tel"
                                placeholder="Enter 10-digit mobile number..."
                                value={quickPhone}
                                onChange={(e) => setQuickPhone(e.target.value)}
                                className="w-full pl-16 pr-6 py-6 bg-slate-800/40 border-2 border-slate-700/50 rounded-[2rem] text-white font-black text-xl placeholder:text-slate-600 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-slate-800/60 outline-none transition-all shadow-2xl tracking-widest"
                            />
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500">
                                <Search size={28} strokeWidth={3} />
                            </div>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {foundMerchant && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="mt-12 pt-12 border-t border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-10"
                        >
                            <div className="flex items-center gap-8">
                                <div className="relative">
                                    {foundMerchant.avatarUrl ? (
                                        <img src={foundMerchant.avatarUrl} className="w-24 h-24 rounded-[2rem] object-cover border-4 border-slate-800 shadow-2xl" alt={foundMerchant.businessName} />
                                    ) : (
                                        <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-blue-500/20">
                                            {foundMerchant.businessName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl border-4 border-slate-900 flex items-center justify-center shadow-xl ${foundMerchant.status === 'approved' ? 'bg-emerald-500' : foundMerchant.status === 'suspended' ? 'bg-orange-500' : 'bg-slate-500'}`}>
                                        {foundMerchant.status === 'approved' ? <CheckCircle size={18} className="text-white" strokeWidth={3} /> : <Clock size={18} className="text-white" strokeWidth={3} />}
                                    </div>
                                </div>
                                <div className="text-center sm:text-left">
                                    <div className="flex items-center gap-3 mb-1 justify-center sm:justify-start">
                                        <h3 className="text-white font-black text-2xl sm:text-3xl tracking-tight leading-tight">{foundMerchant.businessName}</h3>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${foundMerchant.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                            {foundMerchant.status}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 font-bold text-lg">{foundMerchant.ownerName} • <span className="text-blue-500 tracking-widest">{foundMerchant.phone}</span></p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-4">
                                {(foundMerchant.status === 'approved' || foundMerchant.status === 'suspended') && (
                                    <button
                                        onClick={() => handleToggleSuspend(foundMerchant.id, foundMerchant.userId, foundMerchant.status)}
                                        disabled={togglingSupend === foundMerchant.id}
                                        className={`flex items-center gap-3 px-10 py-5 rounded-[1.5rem] font-black text-sm transition-all shadow-2xl active:scale-95 disabled:opacity-50 ${foundMerchant.status === 'suspended' ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/25' : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-500/25'}`}
                                    >
                                        {togglingSupend === foundMerchant.id
                                            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            : foundMerchant.status === 'suspended' ? <ShieldCheck size={20} strokeWidth={2.5} /> : <ShieldOff size={20} strokeWidth={2.5} />}
                                        {foundMerchant.status === 'suspended' ? 'UNSUSPEND ACCOUNT' : 'SUSPEND ACCOUNT'}
                                    </button>
                                )}

                                {foundMerchant.status === 'approved' && foundMerchant.hasBankData && !foundMerchant.bankVerified && (
                                    <button
                                        onClick={() => handleVerifyBank(foundMerchant.id)}
                                        disabled={verifyingBank === foundMerchant.id}
                                        className="flex items-center gap-3 px-10 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/25 active:scale-95 disabled:opacity-50"
                                    >
                                        {verifyingBank === foundMerchant.id
                                            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            : <CheckCircle size={20} strokeWidth={2.5} />}
                                        VERIFY BANK REGISTRY
                                    </button>
                                )}

                                {foundMerchant.bankVerified && (
                                    <div className="flex items-center gap-3 px-10 py-5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-[1.5rem] font-black text-sm shadow-inner">
                                        <CheckCircle size={20} strokeWidth={2.5} /> BANK VERIFIED
                                    </div>
                                )}

                                <Link href={`/admin/merchants/${foundMerchant.id}`} className="p-5 bg-slate-800 text-slate-300 rounded-[1.5rem] hover:bg-slate-700 hover:text-white transition-all border border-slate-700 shadow-xl active:scale-95 group">
                                    <Eye size={28} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Filter Tabs */}
            <div className="flex overflow-x-auto hide-scrollbar gap-4 mb-10 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {['pending', 'approved', 'rejected', 'suspended'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`shrink-0 flex items-center gap-3 px-6 py-3.5 rounded-[1.25rem] font-black capitalize transition-all text-xs tracking-widest shadow-sm border-2 ${filter === status
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200'
                            : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-100 hover:border-slate-200 hover:text-slate-900'}`}
                    >
                        {status}
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${filter === status ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {merchants.filter(m => m.status === status).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Loading Skeletons */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm animate-pulse">
                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-14 h-14 bg-slate-100 rounded-2xl" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                                    <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                                </div>
                            </div>
                            <div className="space-y-3 mb-5">
                                <div className="h-3 bg-slate-100 rounded w-full" />
                                <div className="h-3 bg-slate-100 rounded w-4/5" />
                            </div>
                            <div className="flex gap-2 pt-4 border-t border-slate-50">
                                <div className="flex-1 h-9 bg-slate-100 rounded-xl" />
                                <div className="flex-1 h-9 bg-slate-100 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Merchants Grid */}
            {!loading && (
                <>
                    {filteredMerchants.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                            {filteredMerchants.map((merchant) => (
                                <MerchantCard
                                    key={merchant.id}
                                    merchant={merchant}
                                    udhariEnabled={merchant.udhariEnabled}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    onVerifyBank={handleVerifyBank}
                                    onToggleSuspend={handleToggleSuspend}
                                    isApproving={approving}
                                    isRejecting={rejecting}
                                    isVerifyingBank={verifyingBank}
                                    isTogglingSuspend={togglingSupend}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 shadow-sm transition-all hover:bg-slate-50/50 group">
                            <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
                                <Building2 className="w-10 h-10 text-slate-300" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">No {filter} merchants found</h3>
                            <p className="text-slate-400 font-bold text-sm max-w-xs mx-auto">We couldn&apos;t find any merchant records matching the current filters or search criteria.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
