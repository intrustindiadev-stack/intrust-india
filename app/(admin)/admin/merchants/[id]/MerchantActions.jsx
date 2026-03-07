'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MerchantActions({ merchantId, userId, status }) {
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const router = useRouter();

    if (status !== 'pending') return null;

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
            router.refresh(); // Important to update the Server page
        } catch (error) {
            console.error('Approval error:', error);
            toast.error(error.message, { id: toastId });
        } finally {
            setIsApproving(false);
        }
    };

    const handleReject = async () => {
        const reason = prompt('Please provide a reason for rejecting this merchant application (optional):');
        if (reason === null) return; // User cancelled

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

    return (
        <div className="flex flex-row gap-3 w-full lg:w-auto mt-4 lg:mt-0">
            <button
                onClick={handleReject}
                disabled={isApproving || isRejecting}
                className="flex-1 lg:flex-none px-4 sm:px-6 py-3.5 bg-white text-red-600 text-sm font-bold rounded-2xl border border-red-100 hover:bg-red-50 transition-all flex items-center justify-center gap-2 shadow-sm group disabled:opacity-50"
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
                className="flex-1 lg:flex-none px-6 sm:px-8 py-3.5 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
                {isApproving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <>
                        <CheckCircle size={18} strokeWidth={2.5} /> Approve
                    </>
                )}
            </button>
        </div>
    );
}
