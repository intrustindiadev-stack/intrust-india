'use client';

/**
 * KYC Modal Component for Admin Approval
 * 
 * Displays KYC details in a modal overlay with approve/reject actions.
 * Only pending KYCs can be approved/rejected.
 * 
 * @component
 */

import { useState } from 'react';
import {
    X, User, Phone, Calendar, CreditCard, MapPin, Shield,
    CheckCircle, XCircle, Clock, Loader2, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { approveKYC, rejectKYC } from '@/app/actions/admin-kyc';

/**
 * @typedef {Object} KYCModalProps
 * @property {Object} kyc - KYC record with user details
 * @property {Function} onClose - Callback to close modal and refresh data
 */

export default function KYCModal({ kyc, onClose }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const isPending = kyc.verification_status === 'pending';
    const isVerified = kyc.verification_status === 'verified';
    const isRejected = kyc.verification_status === 'rejected';

    const handleApprove = async () => {
        if (!confirm('Are you sure you want to approve this KYC verification?')) {
            return;
        }

        setIsProcessing(true);

        try {
            const result = await approveKYC(kyc.id);

            if (result.success) {
                toast.success(result.message || 'KYC approved successfully!', {
                    duration: 4000,
                    icon: '✅'
                });
                onClose(); // Close modal and refresh data
            } else {
                toast.error(result.error || 'Failed to approve KYC', {
                    duration: 5000,
                    icon: '❌'
                });
            }
        } catch (error) {
            console.error('Error approving KYC:', error);
            toast.error('An unexpected error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        if (!confirm(`Are you sure you want to reject this KYC?\n\nReason: ${rejectionReason}`)) {
            return;
        }

        setIsProcessing(true);

        try {
            const result = await rejectKYC(kyc.id, rejectionReason);

            if (result.success) {
                toast.success(result.message || 'KYC rejected', {
                    duration: 4000,
                    icon: '❌'
                });
                onClose(); // Close modal and refresh data
            } else {
                toast.error(result.error || 'Failed to reject KYC', {
                    duration: 5000,
                    icon: '❌'
                });
            }
        } catch (error) {
            console.error('Error rejecting KYC:', error);
            toast.error('An unexpected error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleOverlayClick}
        >
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Shield size={24} className="text-blue-600" />
                            KYC Verification Details
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Review and approve customer information</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={isProcessing}
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Status Banner */}
                    <StatusBanner status={kyc.verification_status} rejectionReason={kyc.rejection_reason} />

                    {/* KYC Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailField
                            icon={<User size={18} className="text-gray-400" />}
                            label="Full Legal Name"
                            value={kyc.full_legal_name || kyc.full_name}
                        />
                        <DetailField
                            icon={<Phone size={18} className="text-gray-400" />}
                            label="Phone Number"
                            value={kyc.phone_number || '-'}
                        />
                        <DetailField
                            icon={<Calendar size={18} className="text-gray-400" />}
                            label="Date of Birth"
                            value={kyc.date_of_birth ? new Date(kyc.date_of_birth).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                            }) : '-'}
                        />
                        <DetailField
                            icon={<CreditCard size={18} className="text-gray-400" />}
                            label="PAN Number"
                            value={kyc.pan_number || '-'}
                            monospace
                        />
                    </div>

                    {/* Full Address (Full Width) */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <MapPin size={18} className="text-gray-400 mt-1 shrink-0" />
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Address</label>
                                <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap">{kyc.full_address || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailField
                            icon={<Shield size={18} className="text-gray-400" />}
                            label="Bank-Grade Security"
                            value={kyc.bank_grade_security ? 'Enabled' : 'Not Enabled'}
                            highlight={kyc.bank_grade_security}
                        />
                        <DetailField
                            icon={<Clock size={18} className="text-gray-400" />}
                            label="Submitted On"
                            value={new Date(kyc.created_at).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        />
                    </div>

                    {/* Show Rejection Reason if exists */}
                    {isRejected && kyc.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={18} className="text-red-600 mt-1 shrink-0" />
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-red-700 uppercase mb-1">Rejection Reason</label>
                                    <p className="text-sm text-red-900">{kyc.rejection_reason}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Verified Info */}
                    {(isVerified || isRejected) && kyc.verified_at && (
                        <div className="text-xs text-gray-500 bg-gray-100 rounded-lg p-3 text-center">
                            {isVerified ? 'Verified' : 'Rejected'} on {new Date(kyc.verified_at).toLocaleString('en-IN')}
                        </div>
                    )}

                    {/* Action Buttons (Only for Pending KYCs) */}
                    {isPending && (
                        <div className="space-y-4 pt-4 border-t border-gray-200">
                            {!showRejectForm ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <button
                                        onClick={handleApprove}
                                        disabled={isProcessing}
                                        className="py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Approving...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={18} />
                                                Approve KYC
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setShowRejectForm(true)}
                                        disabled={isProcessing}
                                        className="py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <XCircle size={18} />
                                        Reject KYC
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <label className="block">
                                        <span className="text-sm font-semibold text-gray-700 mb-2 block">
                                            Reason for Rejection <span className="text-red-600">*</span>
                                        </span>
                                        <textarea
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                                            rows="4"
                                            placeholder="Explain why this KYC is being rejected..."
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            disabled={isProcessing}
                                        />
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => {
                                                setShowRejectForm(false);
                                                setRejectionReason('');
                                            }}
                                            disabled={isProcessing}
                                            className="py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleReject}
                                            disabled={isProcessing || !rejectionReason.trim()}
                                            className="py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    Rejecting...
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle size={18} />
                                                    Confirm Rejection
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Already Processed Message */}
                    {!isPending && (
                        <div className={`text-center py-4 rounded-xl ${isVerified ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                            }`}>
                            <p className="font-medium">
                                {isVerified ? '✅ This KYC has been verified' : '❌ This KYC has been rejected'}
                            </p>
                            <p className="text-xs mt-1 opacity-75">No further action required</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Status Banner Component
 */
function StatusBanner({ status, rejectionReason }) {
    const config = {
        pending: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            icon: <Clock size={20} className="text-yellow-600" />,
            title: 'Pending Review',
            titleColor: 'text-yellow-900',
            desc: 'This KYC is awaiting admin approval',
            descColor: 'text-yellow-700'
        },
        verified: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            icon: <CheckCircle size={20} className="text-green-600" />,
            title: 'Verified ✓',
            titleColor: 'text-green-900',
            desc: 'This KYC has been approved and verified',
            descColor: 'text-green-700'
        },
        rejected: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            icon: <XCircle size={20} className="text-red-600" />,
            title: 'Rejected',
            titleColor: 'text-red-900',
            desc: rejectionReason || 'This KYC was rejected',
            descColor: 'text-red-700'
        }
    };

    const current = config[status] || config.pending;

    return (
        <div className={`${current.bg} border ${current.border} rounded-xl p-4`}>
            <div className="flex items-start gap-3">
                {current.icon}
                <div className="flex-1">
                    <h3 className={`font-bold ${current.titleColor} mb-1`}>{current.title}</h3>
                    <p className={`text-sm ${current.descColor}`}>{current.desc}</p>
                </div>
            </div>
        </div>
    );
}

/**
 * Detail Field Component
 */
function DetailField({ icon, label, value, monospace = false, highlight = false }) {
    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
                {icon}
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
                    <p className={`text-sm font-medium text-gray-900 ${monospace ? 'font-mono' : ''} ${highlight ? 'text-blue-600' : ''}`}>
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
}
