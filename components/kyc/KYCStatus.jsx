'use client';

import { CheckCircle, AlertCircle, Clock, Shield } from 'lucide-react';

<<<<<<< Updated upstream
export default function KYCStatus({ status = 'not_started', onStartKYC }) {
=======
import VerifiedBadge from '@/components/ui/VerifiedBadge';

export default function KYCStatus({ status, onStartKYC }) {
    // Normalize status: if null or undefined, treat as 'not_started' or use the prop directly if valid
    const currentStatus = (status === 'pending' || status === 'verified' || status === 'rejected') ? status : 'not_started';

>>>>>>> Stashed changes
    const statusConfig = {
        not_started: {
            color: 'from-gray-500 to-gray-600',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            icon: AlertCircle,
            title: 'KYC Not Completed',
            description: 'Complete your KYC verification to access all features',
            action: 'Start KYC Verification',
            actionColor: 'from-[#92BCEA] to-[#AFB3F7]'
        },
        pending: {
            color: 'from-yellow-500 to-orange-500',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200',
            icon: Clock,
            title: 'KYC Under Review',
            description: 'Your documents are being verified. This usually takes 24-48 hours.',
            action: null,
            actionColor: null
        },
        verified: {
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            icon: VerifiedBadge,
            title: 'Verified',
            description: 'Your account is verified. You have full access.',
            action: null,
            actionColor: null
        },
        rejected: {
            color: 'from-red-500 to-rose-500',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            icon: AlertCircle,
            title: 'KYC Rejected',
            description: 'Your verification was rejected. Please resubmit with correct documents.',
            action: 'Resubmit KYC',
            actionColor: 'from-red-500 to-rose-500'
        }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <div className={`${config.bgColor} border-2 ${config.borderColor} rounded-2xl p-6 shadow-lg`}>
            <div className="flex items-start gap-4">
                {/* Icon */}
                {currentStatus === 'verified' ? (
                    <div className="flex-shrink-0">
                        <VerifiedBadge size={56} className="text-[#1877F2]" />
                    </div>
                ) : (
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                        <Icon size={28} className="text-white" />
                    </div>
                )}

                {/* Content */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{config.title}</h3>
                        {currentStatus === 'verified' && <VerifiedBadge size={20} className="text-[#1877F2]" />}
                    </div>
                    <p className="text-gray-600 mb-4">{config.description}</p>

                    {config.action && (
                        <button
                            onClick={onStartKYC}
                            className={`px-6 py-3 bg-gradient-to-r ${config.actionColor} hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg`}
                        >
                            {config.action}
                        </button>
                    )}

<<<<<<< Updated upstream
                    {status === 'pending' && (
                        <div className="flex items-center gap-2 text-sm text-yellow-700 font-semibold">
                            <Clock size={16} />
                            <span>Estimated time: 24-48 hours</span>
                        </div>
                    )}

                    {status === 'verified' && (
                        <div className="flex items-center gap-2 text-sm text-green-700 font-semibold">
=======
                    {currentStatus === 'verified' && (
                        <div className="flex items-center gap-2 text-sm text-blue-700 font-semibold mt-2">
>>>>>>> Stashed changes
                            <Shield size={16} />
                            <span>Identity verified safely</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
