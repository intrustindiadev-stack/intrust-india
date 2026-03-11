'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Clock, ShieldCheck, CheckCircle2, AlertCircle, X, ChevronRight, Search, Loader2 } from 'lucide-react';

export default function MerchantUdhariPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('pending'); // pending, active, history
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [denyNote, setDenyNote] = useState('');
    const [showDenyModal, setShowDenyModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedApproveRequest, setSelectedApproveRequest] = useState(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (user) fetchRequests();
    }, [user, authLoading, activeTab]);

    async function fetchRequests() {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const url = new URL('/api/udhari/list', window.location.origin);
            url.searchParams.append('role', 'merchant');
            
            const res = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const filtered = data.requests.filter(req => {
                if (activeTab === 'pending') return req.status === 'pending';
                if (activeTab === 'active') return req.status === 'approved';
                return ['completed', 'denied', 'expired', 'cancelled'].includes(req.status);
            });

            setRequests(filtered);
        } catch (error) {
            console.error('Error fetching udhari:', error);
            toast.error('Failed to load udhari requests');
        } finally {
            setLoading(false);
        }
    }

    const handleApproveClick = (req) => {
        setSelectedApproveRequest(req);
        setShowApproveModal(true);
    };

    const handleApproveConfirm = async () => {
        if (!selectedApproveRequest) return;
        
        const req = selectedApproveRequest;
        setProcessingId(req.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/udhari/respond', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    requestId: req.id,
                    action: 'approve',
                    disclaimerAccepted: true
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('Request approved! Gift card reserved.');
            setShowApproveModal(false);
            setSelectedApproveRequest(null);
            fetchRequests();
        } catch (error) {
            toast.error(error.message || 'Failed to approve');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDenySubmit = async () => {
        if (!selectedRequest) return;
        
        setProcessingId(selectedRequest.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/udhari/respond', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    requestId: selectedRequest.id,
                    action: 'deny',
                    merchantNote: denyNote || undefined
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('Request denied.');
            setShowDenyModal(false);
            setDenyNote('');
            fetchRequests();
        } catch (error) {
            toast.error(error.message || 'Failed to deny');
        } finally {
            setProcessingId(null);
        }
    };

    if (authLoading) return <div className="p-8"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Store Credit Requests</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage deferred payments from your customers</p>
                </div>
                <button
                    onClick={() => router.push('/merchant/settings/udhari')}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                    Udhari Settings
                </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-white rounded-lg p-1 border border-gray-200 max-w-md">
                {['pending', 'active', 'history'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 px-4 rounded text-sm font-bold capitalize transition-all ${
                            activeTab === tab
                                ? 'bg-amber-100 text-amber-800 shadow-sm'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        {tab === 'active' ? 'Awaiting Payment' : tab}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-gray-400" /></div>
                ) : requests.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Clock size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-medium text-lg text-gray-900">No {activeTab} requests</p>
                        <p className="text-sm">You're all caught up for this view.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        <AnimatePresence>
                            {requests.map((req) => (
                                <UdhariRow 
                                    key={req.id} 
                                    req={req} 
                                    activeTab={activeTab} 
                                    processingId={processingId}
                                    onApproveClick={handleApproveClick}
                                    onDenyClick={(r) => {
                                        setSelectedRequest(r);
                                        setShowDenyModal(true);
                                    }}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Approve Modal */}
            <AnimatePresence>
                {showApproveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-[32px] w-full max-w-md p-8 shadow-2xl relative border border-gray-100 dark:border-white/10 overflow-hidden"
                        >
                            {/* Decorative background element */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
                            
                            <button onClick={() => setShowApproveModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors">
                                <X size={24} />
                            </button>

                            <div className="mb-8 flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-3xl flex items-center justify-center mb-6 text-amber-500 shadow-inner">
                                    <ShieldCheck size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Compliance Warning</h3>
                                <div className="mt-2 text-sm text-gray-500 font-medium">
                                    Risk Disclosure & Agreement
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                        By approving this request for <span className="font-black text-gray-900 dark:text-white underline decoration-amber-500/30">₹{(selectedApproveRequest?.amount_paise/100).toFixed(2)}</span>, you agree to reserve the gift card for <span className="font-black text-gray-900 dark:text-white">{selectedApproveRequest?.duration_days} days</span>.
                                    </p>
                                </div>

                                <div className="flex gap-4 items-start p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                    <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                                        Intrust India acts only as a record-keeper. You, the merchant, bear the full risk of non-payment by the customer.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleApproveConfirm}
                                    disabled={processingId === selectedApproveRequest?.id}
                                    className="w-full py-4 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex justify-center items-center shadow-xl shadow-gray-200 dark:shadow-none tracking-widest text-xs"
                                >
                                    {processingId === selectedApproveRequest?.id ? <Loader2 size={20} className="animate-spin" /> : 'ACCEPT RISK & APPROVE'}
                                </button>
                                <button
                                    onClick={() => setShowApproveModal(false)}
                                    className="w-full py-4 bg-transparent text-gray-400 font-bold hover:text-gray-600 transition-colors text-xs"
                                >
                                    GO BACK
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Deny Modal */}
            <AnimatePresence>
                {showDenyModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-[32px] w-full max-w-md p-8 shadow-2xl relative border border-gray-100 dark:border-white/10"
                        >
                            <button onClick={() => setShowDenyModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors">
                                <X size={24} />
                            </button>

                            <div className="mb-8 flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mb-6 text-red-500 shadow-inner">
                                    <X size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Deny Request</h3>
                                <p className="text-sm text-gray-500 mt-2 font-medium">Please provide a reason if necessary.</p>
                            </div>

                            <div className="mb-8">
                                <textarea
                                    value={denyNote}
                                    onChange={(e) => setDenyNote(e.target.value)}
                                    className="w-full border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all placeholder:text-gray-400"
                                    rows={4}
                                    placeholder="E.g., You have outstanding dues or incorrect profile information."
                                />
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleDenySubmit}
                                    disabled={processingId === selectedRequest?.id}
                                    className="w-full py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex justify-center items-center shadow-xl shadow-red-200 dark:shadow-none tracking-widest text-xs"
                                >
                                    {processingId === selectedRequest?.id ? <Loader2 size={20} className="animate-spin" /> : 'CONFIRM DENIAL'}
                                </button>
                                <button
                                    onClick={() => setShowDenyModal(false)}
                                    className="w-full py-4 bg-transparent text-gray-400 font-bold hover:text-gray-600 transition-colors text-xs"
                                >
                                    CANCEL
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function UdhariRow({ req, activeTab, processingId, onApproveClick, onDenyClick }) {
    return (
        <motion.div 
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-5 flex flex-col lg:flex-row gap-6 hover:bg-gray-50/50 transition-colors"
        >
            {/* Customer Info */}
            <div className="flex-1 space-y-3">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                        {req.customer?.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900">{req.customer?.full_name || 'Unknown User'}</h3>
                            {req.customer?.kyc_status === 'verified' && <ShieldCheck size={14} className="text-green-500" />}
                        </div>
                        <p className="text-sm text-gray-500">{req.customer?.phone || 'No phone'}</p>
                        
                        {/* Trust metrics */}
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${req.customerStats?.accountAgeDays > 30 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                Acct Age: {req.customerStats?.accountAgeDays}d
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                Purchases: {req.customerStats?.purchaseCount}
                            </span>
                            {req.customerStats?.defaultCount > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                                    <AlertCircle size={10} />
                                    Defaults: {req.customerStats?.defaultCount}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                {req.customer_note && (
                    <div className="ml-16 bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm text-gray-600 italic">
                        "{req.customer_note}"
                    </div>
                )}
            </div>

            {/* Order Details */}
            <div className="flex-1 lg:border-l border-gray-100 lg:pl-6 space-y-1">
                <div className="text-xs font-bold uppercase text-gray-400 mb-1">Gift Card Details</div>
                <div className="font-medium text-gray-900">{req.coupon?.title}</div>
                <div className="text-2xl font-extrabold text-gray-900 bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                    ₹{(req.amount_paise / 100).toFixed(2)}
                </div>
                
                {activeTab === 'active' && req.due_date && (
                    <div className="mt-2 text-sm">
                        <span className="text-gray-500">Due: </span>
                        <span className="font-semibold text-amber-600">
                            {new Date(req.due_date).toLocaleDateString()}
                        </span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="w-full lg:w-48 flex flex-col justify-center gap-2 lg:border-l border-gray-100 lg:pl-6">
                {activeTab === 'pending' && (
                    <>
                        <button
                            onClick={() => onApproveClick(req)}
                            disabled={processingId === req.id || req.customerStats?.defaultCount > 0}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center h-10 shadow-lg shadow-amber-200"
                        >
                            {processingId === req.id ? <Loader2 size={16} className="animate-spin" /> : 'Approve'}
                        </button>
                        <button
                            onClick={() => onDenyClick(req)}
                            disabled={processingId === req.id}
                            className="w-full py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 h-10"
                        >
                            Deny
                        </button>
                    </>
                )}

                {activeTab === 'active' && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-center">
                        <Clock size={20} className="mx-auto mb-1 text-amber-500" />
                        <span className="text-sm font-bold">Awaiting Payment</span>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className={`rounded-lg p-3 text-center border ${
                        req.status === 'completed' ? 'bg-green-50 border-green-200 text-green-700' :
                        req.status === 'denied' ? 'bg-red-50 border-red-200 text-red-700' :
                        'bg-gray-50 border-gray-200 text-gray-700'
                    }`}>
                        <span className="text-sm font-bold uppercase">{req.status}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

import { AnimatePresence, motion } from 'framer-motion';
