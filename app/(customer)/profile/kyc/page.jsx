'use client';

/**
 * KYC Profile Page
 * 
 * Allows users to view and manage their KYC verification status.
 * Users can submit KYC for the first time or update pending/rejected applications.
 * 
 * @page /profile/kyc
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield, CheckCircle, Clock, XCircle, AlertCircle,
    ArrowLeft, Loader2, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import KYCForm from '@/components/forms/KYCForm';
import { getKYCRecord } from '@/app/actions/kyc';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileKYCPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [kycRecord, setKycRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isPolling, setIsPolling] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/profile/kyc');
            return;
        }

        if (user) {
            fetchKYCRecord();
        }
    }, [user, authLoading, router]);

    // Poll for status updates when KYC is pending
    useEffect(() => {
        if (kycRecord?.verification_status === 'pending' && !isPolling) {
            setIsPolling(true);
            const pollInterval = setInterval(async () => {
                try {
                    const result = await getKYCRecord();
                    if (result.data && result.data.verification_status !== 'pending') {
                        setKycRecord(result.data);
                        setShowForm(false);
                        setIsPolling(false);
                        clearInterval(pollInterval);

                        if (result.data.verification_status === 'verified') {
                            toast.success('🎉 KYC Verified Instantly!', {
                                duration: 5000,
                                icon: '✅'
                            });
                        } else if (result.data.verification_status === 'rejected') {
                            toast.error(`❌ KYC Verification Failed: ${result.data.rejection_reason || 'Please try again'}`, {
                                duration: 5000,
                                icon: '❌'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error polling KYC status:', error);
                }
            }, 2000); // Poll every 2 seconds

            // Stop polling after 30 seconds max
            setTimeout(() => {
                clearInterval(pollInterval);
                setIsPolling(false);
            }, 30000);

            return () => clearInterval(pollInterval);
        }
    }, [kycRecord?.verification_status]);

    const fetchKYCRecord = async () => {
        console.log('CLIENT: fetchKYCRecord started');
        setLoading(true);
        try {
            console.log('CLIENT: calling getKYCRecord server action');
            const result = await getKYCRecord();
            console.log('CLIENT: getKYCRecord result received', result);

            if (result.error) {
                toast.error(result.error);
                return;
            }

            setKycRecord(result.data);

            // Show form if no record, or record is rejected (not pending since KYC is automated)
            if (!result.data || result.data.verification_status === 'rejected') {
                setShowForm(true);
            } else if (result.data.verification_status === 'pending') {
                setShowForm(false); // Hide form during automated verification
            } else {
                setShowForm(false); // Hide form for verified status
            }
        } catch (error) {
            console.error('Error fetching KYC record:', error);
            toast.error('Failed to load KYC information');
        } finally {
            console.log('CLIENT: fetchKYCRecord finally block, setting loading false');
            setLoading(false);
        }
    };

    const handleKYCSuccess = () => {
        // Refresh KYC record after successful submission
        fetchKYCRecord().then(() => {
            // Start polling for automated verification result
            if (kycRecord?.verification_status === 'pending') {
                setIsPolling(true);
            }
        });
        setShowForm(false);
        toast.success('KYC submitted successfully! Your verification will be processed instantly.');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Loading KYC information...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/profile')}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} className="text-slate-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">KYC Verification</h1>
                                <p className="text-sm text-slate-500">Know Your Customer verification status</p>
                            </div>
                        </div>
                        {kycRecord && kycRecord.verification_status === 'pending' && (
                            <button
                                onClick={fetchKYCRecord}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <RefreshCw size={16} />
                                Refresh
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Status Banner */}
                {kycRecord && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <StatusBanner status={kycRecord.verification_status} rejectionReason={kycRecord.rejection_reason} />
                    </motion.div>
                )}

                {/* No KYC Record */}
                {!kycRecord && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8"
                    >
                        <div className="flex items-start gap-4">
                            <div className="bg-blue-100 p-3 rounded-full">
                                <Shield size={24} className="text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-blue-900 mb-2">Complete Your KYC</h3>
                                <p className="text-blue-700 text-sm leading-relaxed">
                                    You haven't submitted your KYC verification yet. Complete the form below to unlock full platform access
                                    and start making transactions.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* KYC Details (Verified) */}
                {kycRecord && kycRecord.verification_status === 'verified' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8"
                    >
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Shield size={20} className="text-green-600" />
                            Your KYC Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoField label="Full Name" value={kycRecord.full_legal_name} />
                            <InfoField label="Phone Number" value={kycRecord.phone_number} />
                            <InfoField label="Date of Birth" value={new Date(kycRecord.date_of_birth).toLocaleDateString()} />
                            <InfoField label="PAN Number" value={kycRecord.pan_number} />
                            <InfoField label="Address" value={kycRecord.full_address} fullWidth />
                            <InfoField
                                label="Bank-Grade Security"
                                value={kycRecord.bank_grade_security ? 'Enabled' : 'Not Enabled'}
                            />
                        </div>
                        {kycRecord.verified_at && (
                            <p className="mt-4 text-xs text-slate-500 border-t border-slate-100 pt-4">
                                Verified on {new Date(kycRecord.verified_at).toLocaleString()}
                            </p>
                        )}
                    </motion.div>
                )}

                {/* KYC Form */}
                {isPolling && (
                    <div className="flex items-center justify-center py-2">
                        <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                            <Loader2 size={16} className="animate-spin" />
                            Processing verification...
                        </div>
                    </div>
                )}
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <KYCForm
                            initialData={kycRecord ? {
                                fullName: kycRecord.full_legal_name,
                                phoneNumber: kycRecord.phone_number,
                                dateOfBirth: kycRecord.date_of_birth,
                                panNumber: kycRecord.pan_number,
                                fullAddress: kycRecord.full_address,
                                bankGradeSecurity: kycRecord.bank_grade_security
                            } : {}}
                            onSuccess={handleKYCSuccess}
                            onError={(error) => {
                                console.error('KYC submission error:', error);
                            }}
                        />
                    </motion.div>
                )}

                {/* Help Section */}
                {kycRecord && kycRecord.verification_status === 'pending' && (
                    <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-900 mb-3">What happens next?</h3>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                                <CheckCircle size={16} className="text-green-600 mt-0.5 shrink-0" />
                                <span>Your KYC is being verified automatically via SprintVerify</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle size={16} className="text-green-600 mt-0.5 shrink-0" />
                                <span>Verification usually completes within a few seconds</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle size={16} className="text-green-600 mt-0.5 shrink-0" />
                                <span>You'll see the result instantly on this page</span>
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Status Banner Component
 */
function StatusBanner({ status, rejectionReason }) {
    const statusConfig = {
        pending: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            icon: <Clock size={24} className="text-yellow-600" />,
            iconBg: 'bg-yellow-100',
            title: 'KYC Verification in Progress',
            titleColor: 'text-yellow-900',
            description: 'Your KYC is being processed automatically via SprintVerify. This usually takes just a few seconds.',
            descColor: 'text-yellow-700'
        },
        verified: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            icon: <CheckCircle size={24} className="text-green-600" />,
            iconBg: 'bg-green-100',
            title: 'KYC Verified Instantly ✓',
            titleColor: 'text-green-900',
            description: 'Your identity has been verified automatically via SprintVerify. You have full access to all platform features.',
            descColor: 'text-green-700'
        },
        rejected: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            icon: <XCircle size={24} className="text-red-600" />,
            iconBg: 'bg-red-100',
            title: 'KYC Verification Rejected',
            titleColor: 'text-red-900',
            description: rejectionReason || 'Your KYC verification was rejected. Please update your information and resubmit.',
            descColor: 'text-red-700'
        }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
        <div className={`${config.bg} border ${config.border} rounded-2xl p-6`}>
            <div className="flex items-start gap-4">
                <div className={`${config.iconBg} p-3 rounded-full shrink-0`}>
                    {config.icon}
                </div>
                <div className="flex-1">
                    <h3 className={`font-bold ${config.titleColor} mb-2`}>{config.title}</h3>
                    <p className={`${config.descColor} text-sm leading-relaxed`}>
                        {config.description}
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * Info Field Component
 */
function InfoField({ label, value, fullWidth = false }) {
    return (
        <div className={fullWidth ? 'col-span-full' : ''}>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
            <p className="text-sm font-medium text-slate-900 bg-slate-50 px-3 py-2 rounded-lg">
                {value || 'N/A'}
            </p>
        </div>
    );
}
