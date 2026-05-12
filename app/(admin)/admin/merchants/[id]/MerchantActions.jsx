'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, ShieldOff, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MerchantActions({ merchantId, userId, status, hasBankData, bankVerified }) {
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isTogglingSuspend, setIsTogglingSuspend] = useState(false);
    const [isVerifyingBank, setIsVerifyingBank] = useState(false);
    const router = useRouter();

    const isPending = status === 'pending';
    const isApproved = status === 'approved';
    const isSuspended = status === 'suspended';

    // Only render for pending, approved, or suspended merchants
    if (!isPending && !isApproved && !isSuspended) return null;

    const handleApprove = async () => {
        if (!confirm('Are you sure you want to approve this merchant?')) return;

        setIsApproving(true);
        const toastId = toast.loading('Approving merchant...');

        try {
            const response = await fetch('/api/admin/approve-merchant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicationId: merchantId, userId }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to approve merchant');
            }

            toast.success('Merchant approved successfully!', { id: toastId });
            router.refresh();
        } catch (error) {
            console.error('Approval error:', error);
            toast.error(error.message, { id: toastId });
        } finally {
            setIsApproving(false);
        }
    };

    const handleReject = async () => {
        const reason = prompt('Please provide a reason for rejecting this merchant application (optional):');
        if (reason === null) return;

        setIsRejecting(true);
        const toastId = toast.loading('Rejecting merchant...');

        try {
            const response = await fetch('/api/admin/reject-merchant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicationId: merchantId, userId, reason: reason.trim() }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to reject merchant');
            }

            toast.success('Merchant rejected successfully!', { id: toastId });
            router.refresh();
        } catch (error) {
            console.error('Rejection error:', error);
            toast.error(error.message, { id: toastId });
        } finally {
            setIsRejecting(false);
        }
    };

    const handleToggleSuspend = async () => {
        const willSuspend = !isSuspended;

        if (willSuspend) {
            const reason = prompt('Please provide a reason for suspending this merchant:');
            if (reason === null) return;

            setIsTogglingSuspend(true);
            const toastId = toast.loading('Suspending merchant...');

            try {
                const response = await fetch(`/api/admin/merchants/${merchantId}/toggle-suspend`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ suspend: true, reason: reason.trim() }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to suspend merchant');
                }

                toast.success('Merchant suspended successfully!', { id: toastId });
                router.refresh();
            } catch (error) {
                console.error('Suspend error:', error);
                toast.error(error.message, { id: toastId });
            } finally {
                setIsTogglingSuspend(false);
            }
        } else {
            if (!confirm('Are you sure you want to unsuspend this merchant?')) return;

            setIsTogglingSuspend(true);
            const toastId = toast.loading('Unsuspending merchant...');

            try {
                const response = await fetch(`/api/admin/merchants/${merchantId}/toggle-suspend`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ suspend: false }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to unsuspend merchant');
                }

                toast.success('Merchant unsuspended successfully!', { id: toastId });
                router.refresh();
            } catch (error) {
                console.error('Unsuspend error:', error);
                toast.error(error.message, { id: toastId });
            } finally {
                setIsTogglingSuspend(false);
            }
        }
    };

    const handleVerifyBank = async () => {
        if (!confirm('Confirm bank account as verified for this merchant?')) return;
        setIsVerifyingBank(true);
        const toastId = toast.loading('Verifying bank account...');
        try {
            const response = await fetch('/api/admin/verify-bank', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ merchantId }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed');
            toast.success('Bank account verified!', { id: toastId });
            router.refresh();
        } catch (err) {
            toast.error(err.message, { id: toastId });
        } finally {
            setIsVerifyingBank(null);
        }
    };

    return (
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto mt-4 lg:mt-0">
            {/* Pending: Reject + Approve buttons */}
            {isPending && (
                <>
                    <button
                        onClick={handleReject}
                        disabled={isApproving || isRejecting}
                        className="w-full sm:w-auto px-6 py-3.5 bg-white text-red-600 text-sm font-bold rounded-2xl border border-red-100 hover:bg-red-50 transition-all flex items-center justify-center gap-2 shadow-sm group disabled:opacity-50"
                    >
                        {isRejecting ? (
                            <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <XCircle size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform" /> Reject
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={isApproving || isRejecting}
                        className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                    >
                        {isApproving ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <CheckCircle size={18} strokeWidth={2.5} /> Approve
                            </>
                        )}
                    </button>
                </>
            )}

            {/* Approved / Suspended: Suspend / Unsuspend button */}
            {(isApproved || isSuspended) && (
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                        onClick={handleToggleSuspend}
                        disabled={isTogglingSuspend}
                        className={`flex-1 px-8 py-3.5 text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 ${isSuspended
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                            }`}
                    >
                        {isTogglingSuspend ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : isSuspended ? (
                            <>
                                <ShieldCheck size={18} strokeWidth={2.5} /> Unsuspend Account
                            </>
                        ) : (
                            <>
                                <ShieldOff size={18} strokeWidth={2.5} /> Suspend Account
                            </>
                        )}
                    </button>

                    {isApproved && hasBankData && !bankVerified && (
                        <button
                            onClick={handleVerifyBank}
                            disabled={isVerifyingBank}
                            className="flex-1 px-8 py-3.5 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                        >
                            {isVerifyingBank ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <CheckCircle size={18} strokeWidth={2.5} /> Verify Bank Registry
                                </>
                            )}
                        </button>
                    )}

                    {isApproved && bankVerified && (
                        <div className="flex-1 px-8 py-3.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-inner">
                            <CheckCircle size={18} strokeWidth={2.5} /> Bank Verified
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
