'use client';

/**
 * KYC Profile Page — Light Theme
 *
 * Allows users to view and manage their KYC verification status.
 * Users can submit KYC for the first time or update pending/rejected applications.
 *
 * @page /profile/kyc
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield, CheckCircle, Clock, XCircle,
    ArrowLeft, Loader2, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import KYCForm from '@/components/forms/KYCForm';
import { getKYCRecord } from '@/app/actions/kyc';
import { maskPAN } from '@/app/types/kyc';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function ProfileKYCPage() {
    const router = useRouter();
    const { user, loading: authLoading, refreshProfile } = useAuth();
    const [kycRecord, setKycRecord] = useState(/** @type {Record<string, unknown> | null} */(null));
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
        if (kycRecord?.verification_status !== 'pending' || isPolling) return;

        setIsPolling(true);
        let cancelled = false;

        const pollInterval = setInterval(async () => {
            if (cancelled) return;
            try {
                const result = await getKYCRecord();
                if (cancelled) return;
                if (result.data && result.data.verification_status !== 'pending') {
                    setKycRecord(result.data);
                    setShowForm(false);
                    setIsPolling(false);
                    clearInterval(pollInterval);

                    if (result.data.verification_status === 'verified') {
                        toast.success('🎉 KYC Verified Instantly!', { duration: 5000, icon: '✅' });
                    } else if (result.data.verification_status === 'rejected') {
                        toast.error(`❌ KYC Verification Failed: ${result.data.rejection_reason || 'Please try again'}`, { duration: 5000, icon: '❌' });
                    }
                }
            } catch (error) {
                console.error('Error polling KYC status:', error);
            }
        }, 2000);

        const timeout = setTimeout(() => {
            clearInterval(pollInterval);
            setIsPolling(false);
        }, 30000);

        return () => {
            cancelled = true;
            clearInterval(pollInterval);
            clearTimeout(timeout);
        };
    }, [kycRecord?.verification_status]);

    const fetchKYCRecord = async () => {
        setLoading(true);
        try {
            const result = await getKYCRecord();

            if (result.error) {
                toast.error(result.error);
                return;
            }

            setKycRecord(result.data);

            if (!result.data || result.data.verification_status === 'rejected') {
                setShowForm(true);
            } else {
                setShowForm(false);
            }
        } catch (error) {
            console.error('Error fetching KYC record:', error);
            toast.error('Failed to load KYC information');
        } finally {
            setLoading(false);
        }
    };

    const handleKYCSuccess = (data) => {
        // Refresh KYC record in the background — do NOT navigate away.
        // Set the KYC record but do NOT call setShowForm(false) here,
        // so that the SuccessScreen overlay remains visible.
        if (data) {
            setKycRecord(data);
        } else {
            fetchKYCRecordSilent();
        }
        if (refreshProfile) refreshProfile();
    };

    const fetchKYCRecordSilent = async () => {
        try {
            const result = await getKYCRecord();
            if (result.data) {
                setKycRecord(result.data);
            }
        } catch (error) {
            console.error('Silent fetch failed:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-electric animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Loading KYC information...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/profile')}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} className="text-slate-500" />
                            </button>
                            <div>
                                <h1
                                    className="text-2xl font-bold text-slate-900"
                                    style={{ fontFamily: 'var(--font-sora)' }}
                                >
                                    KYC Verification
                                </h1>
                                <p className="text-sm text-slate-500 font-medium">Know Your Customer process</p>
                            </div>
                        </div>
                        {kycRecord && kycRecord.verification_status === 'pending' && (
                            <button
                                onClick={fetchKYCRecord}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-electric hover:bg-electric/10 rounded-lg transition-colors"
                            >
                                <RefreshCw size={16} />
                                Refresh
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
                {/* Status Banner */}
                {kycRecord && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <StatusBanner
                            status={/** @type {string} */ (kycRecord.verification_status)}
                            rejectionReason={/** @type {string | undefined} */ (kycRecord.rejection_reason)}
                        />
                    </motion.div>
                )}

                {/* No KYC Record */}
                {!kycRecord && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border-l-4 border-l-[#1A56DB] shadow-sm rounded-xl p-5 mb-8 flex items-start gap-4"
                    >
                        <div className="bg-[#1A56DB]/10 p-2.5 rounded-full mt-0.5">
                            <Shield size={24} className="text-[#1A56DB]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-900 text-base mb-1">Secure Your Account</h3>
                            <p className="text-[#475569] text-[13px] leading-relaxed">
                                You haven&apos;t completed your KYC verification yet. Please provide the required details below to unlock full platform access.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* KYC Details (Verified) */}
                {kycRecord && kycRecord.verification_status === 'verified' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 mb-8"
                    >
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Shield size={20} className="text-green-500" />
                            Your KYC Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoField label="Full Name" value={/** @type {string} */ (kycRecord.full_legal_name)} />
                            <InfoField label="Phone Number" value={/** @type {string} */ (kycRecord.phone_number)} />
                            <InfoField
                                label="Date of Birth"
                                value={kycRecord.date_of_birth ? new Date(kycRecord.date_of_birth + 'T00:00:00').toLocaleDateString('en-IN') : 'N/A'}
                            />
                            <InfoField
                                label="PAN Number"
                                value={kycRecord.pan_number ? maskPAN(/** @type {string} */(kycRecord.pan_number)) : 'N/A'}
                            />
                            <InfoField label="Address" value={/** @type {string} */ (kycRecord.full_address)} fullWidth />
                            <InfoField
                                label="Bank-Grade Security"
                                value={kycRecord.bank_grade_security ? 'Enabled' : 'Not Enabled'}
                            />
                        </div>
                        {kycRecord.verified_at && (
                            <p className="mt-4 text-xs text-slate-500 border-t border-slate-100 pt-4">
                                Verified on {new Date(/** @type {string} */(kycRecord.verified_at)).toLocaleString()}
                            </p>
                        )}
                    </motion.div>
                )}

                {/* Polling indicator */}
                {isPolling && (
                    <div className="flex items-center justify-center py-2">
                        <div className="flex items-center gap-2 text-sm text-electric font-medium">
                            <Loader2 size={16} className="animate-spin" />
                            Processing verification...
                        </div>
                    </div>
                )}

                {/* KYC Form */}
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
                            onError={(/** @type {string} */ error) => {
                                console.error('KYC submission error:', error);
                            }}
                        />
                    </motion.div>
                )}

                {/* Help Section */}
                {kycRecord && kycRecord.verification_status === 'pending' && (
                    <div className="mt-8 bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                        <h3 className="font-bold text-slate-900 mb-3">What happens next?</h3>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                                <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                                <span>Your KYC is being verified automatically via SprintVerify</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle size={16} className="text-green-400 mt-0.5 shrink-0" />
                                <span>Verification usually completes within a few seconds</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle size={16} className="text-green-400 mt-0.5 shrink-0" />
                                <span>You&apos;ll see the result instantly on this page</span>
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Status Banner — Dark glass theme
 * @param {{ status: string, rejectionReason?: string }} props
 */
function StatusBanner({ status, rejectionReason }) {
    const isManualReview = status === 'pending' && !!rejectionReason;

    /** @type {Record<string, { bg: string, border: string, icon: JSX.Element, iconBg: string, title: string, description: string }>} */
    const statusConfig = {
        pending: {
            bg: isManualReview ? 'bg-amber-900/20' : 'bg-yellow-900/20',
            border: isManualReview ? 'border-amber-500/30' : 'border-yellow-500/30',
            icon: <Clock size={24} className={isManualReview ? 'text-amber-400' : 'text-yellow-400'} />,
            iconBg: isManualReview ? 'bg-amber-500/20' : 'bg-yellow-500/20',
            title: isManualReview ? 'KYC Under Review' : 'KYC Verification in Progress',
            description: isManualReview
                ? 'Your KYC application is currently under manual review by our team. This usually takes 24-48 hours.'
                : 'Your KYC is being processed automatically via SprintVerify. This usually takes just a few seconds.',
        },
        verified: {
            bg: 'bg-green-900/20',
            border: 'border-green-500/30',
            icon: <CheckCircle size={24} className="text-green-400" />,
            iconBg: 'bg-green-500/20',
            title: 'KYC Verified Instantly ✓',
            description: 'Your identity has been verified automatically via SprintVerify. You have full access to all platform features.',
        },
        rejected: {
            bg: 'bg-red-900/20',
            border: 'border-red-500/30',
            icon: <XCircle size={24} className="text-red-400" />,
            iconBg: 'bg-red-500/20',
            title: 'KYC Verification Rejected',
            description: rejectionReason || 'Your KYC verification was rejected. Please update your information and resubmit.',
        },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
        <div className={`${config.bg} border ${config.border} rounded-2xl p-6`}>
            <div className="flex items-start gap-4">
                <div className={`${config.iconBg} p-3 rounded-full shrink-0`}>
                    {config.icon}
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-2">{config.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        {config.description}
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * Info Field — Light theme
 * @param {{ label: string, value: unknown, fullWidth?: boolean }} props
 */
function InfoField({ label, value, fullWidth = false }) {
    return (
        <div className={fullWidth ? 'col-span-full' : ''}>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
            <p className="text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
                {typeof value === 'string' || typeof value === 'number' ? value : 'N/A'}
            </p>
        </div>
    );
}
