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
            toast.error('Failed to load KYC status');
        } finally {
            setLoading(false);
        }
    };

    const handleKYCSuccess = async () => {
        toast.success('KYC Submitted Successfully!');
        await refreshProfile();
        await fetchKYCRecord();
    };

    if (authLoading || loading) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
                <Loader2 size={36} className="animate-spin text-primary mb-4" />
                <p className="text-on-surface-variant text-sm font-semibold">Checking KYC status...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/profile')}
                        className="p-2 hover:bg-surface-container rounded-xl text-on-surface-variant hover:text-on-surface transition-colors"
                        title="Back to Profile"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">
                            Identity Verification (KYC)
                        </h1>
                        <p className="text-xs sm:text-sm text-on-surface-variant font-medium">
                            Verify your identity to unlock higher limits and instant secure payouts
                        </p>
                    </div>
                </div>

                {kycRecord && kycRecord.verification_status === 'pending' && (
                    <button
                        onClick={fetchKYCRecord}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors"
                    >
                        <RefreshCw size={14} />
                        Refresh
                    </button>
                )}
            </div>

            {/* Status Banner */}
            {kycRecord && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <StatusBanner
                        status={/** @type {string} */ (kycRecord.verification_status)}
                        rejectionReason={/** @type {string | undefined} */ (kycRecord.rejection_reason)}
                    />
                </motion.div>
            )}

            {/* No KYC Record */}
            {!kycRecord && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface-container-lowest border border-outline-variant/30 shadow-sm rounded-3xl p-6 flex items-start gap-4"
                >
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-on-surface text-base mb-1">Government ID Verification</h3>
                        <p className="text-on-surface-variant text-xs leading-relaxed">
                            You have not completed KYC verification yet. Provide your legal identity details below to enable bank-grade security protection and higher transaction tiers.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* KYC Details (Verified) */}
            {kycRecord && kycRecord.verification_status === 'verified' && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface-container-lowest border border-outline-variant/30 shadow-sm rounded-3xl p-6 space-y-4"
                >
                    <h3 className="font-extrabold text-on-surface flex items-center gap-2 text-base">
                        <Shield size={18} className="text-emerald-500" />
                        Verified Government Records
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoField label="Full Legal Name" value={/** @type {string} */ (kycRecord.full_legal_name)} />
                        <InfoField label="Phone Number" value={/** @type {string} */ (kycRecord.phone_number)} />
                        <InfoField
                            label="Date of Birth"
                            value={kycRecord.date_of_birth ? new Date(kycRecord.date_of_birth + 'T00:00:00').toLocaleDateString('en-IN') : 'N/A'}
                        />
                        <InfoField
                            label="PAN Number"
                            value={kycRecord.pan_number ? maskPAN(/** @type {string} */(kycRecord.pan_number)) : 'N/A'}
                        />
                        <InfoField label="Permanent Address" value={/** @type {string} */ (kycRecord.full_address)} fullWidth />
                    </div>
                    {kycRecord.verified_at && (
                        <p className="text-xs text-on-surface-variant/70 border-t border-outline-variant/15 pt-3">
                            Verified via SprintVerify on {new Date(/** @type {string} */(kycRecord.verified_at)).toLocaleString('en-IN')}
                        </p>
                    )}
                </motion.div>
            )}

            {/* Polling indicator */}
            {isPolling && (
                <div className="flex items-center justify-center py-2">
                    <div className="flex items-center gap-2 text-xs text-primary font-bold">
                        <Loader2 size={16} className="animate-spin" />
                        Verifying details with government database...
                    </div>
                </div>
            )}

            {/* KYC Form */}
            {showForm && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-sm">
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
                    </div>
                </motion.div>
            )}

            {/* Help Section */}
            {kycRecord && kycRecord.verification_status === 'pending' && (
                <div className="bg-surface-container-lowest border border-outline-variant/30 shadow-sm rounded-3xl p-6">
                    <h3 className="font-extrabold text-on-surface mb-3 text-sm">What happens next?</h3>
                    <ul className="space-y-2 text-xs text-on-surface-variant">
                        <li className="flex items-start gap-2">
                            <CheckCircle size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>Your KYC is verified in real-time via SprintVerify registry</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>Verification usually finishes within 30 to 60 seconds</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>Your status will update automatically right on this page</span>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
}

function StatusBanner({ status, rejectionReason }) {
    const isManualReview = status === 'pending' && !!rejectionReason;

    const statusConfig = {
        pending: {
            bg: 'bg-amber-500/10 border-amber-500/30',
            icon: <Clock size={20} className="text-amber-500" />,
            title: isManualReview ? 'KYC Under Review' : 'KYC Verification in Progress',
            description: isManualReview
                ? 'Your KYC application is currently under manual review by compliance. This usually takes 24 hours.'
                : 'Your KYC is being verified automatically. This usually takes just a few seconds.',
        },
        verified: {
            bg: 'bg-emerald-500/10 border-emerald-500/30',
            icon: <CheckCircle size={20} className="text-emerald-500" />,
            title: 'KYC Verified Instantly ✓',
            description: 'Your identity has been verified. You have unrestricted access to all platform features and secure payment rails.',
        },
        rejected: {
            bg: 'bg-rose-500/10 border-rose-500/30',
            icon: <XCircle size={20} className="text-rose-500" />,
            title: 'KYC Verification Rejected',
            description: rejectionReason || 'Your KYC verification was rejected. Please review your details and resubmit.',
        },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
        <div className={`${config.bg} border rounded-2xl p-5`}>
            <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-surface-container-lowest shrink-0">
                    {config.icon}
                </div>
                <div>
                    <h3 className="font-extrabold text-on-surface text-sm mb-1">{config.title}</h3>
                    <p className="text-on-surface-variant text-xs leading-relaxed">
                        {config.description}
                    </p>
                </div>
            </div>
        </div>
    );
}

function InfoField({ label, value, fullWidth = false }) {
    return (
        <div className={fullWidth ? 'col-span-full' : ''}>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">{label}</label>
            <p className="text-xs font-semibold text-on-surface bg-surface-container-low border border-outline-variant/30 px-3 py-2.5 rounded-xl">
                {typeof value === 'string' || typeof value === 'number' ? value : 'N/A'}
            </p>
        </div>
    );
}
