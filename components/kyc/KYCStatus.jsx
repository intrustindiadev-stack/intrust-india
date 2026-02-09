'use client';

import { CheckCircle, AlertCircle, Clock, Shield } from 'lucide-react';

export default function KYCStatus({ status, onStartKYC }) {
    // Normalize status: if null or undefined, treat as 'not_started' or use the prop directly if valid
    const currentStatus = (status === 'pending' || status === 'verified' || status === 'rejected') ? status : 'not_started';

    const statusConfig = {
        not_started: {
            color: 'from-gray-500 to-gray-600',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            icon: AlertCircle,
            title: 'KYC Not Completed',
            description: 'Complete your KYC to unlock full access.',
            action: 'Start KYC',
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
            color: 'from-green-500 to-emerald-500',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            icon: CheckCircle,
            title: 'KYC Verified',
            description: 'Your account is fully verified. You can access all features.',
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

    const config = statusConfig[currentStatus];
    const Icon = config.icon;

    return (
        <div className={`${config.bgColor} border-2 ${config.borderColor} rounded-2xl p-6 shadow-lg`}>
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <Icon size={28} className="text-white" />
                </div>

                {/* Content */}
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h3>
                    <p className="text-gray-600 mb-4">{config.description}</p>

                    {config.action && (
                        <button
                            onClick={onStartKYC}
                            className={`px-6 py-3 bg-gradient-to-r ${config.actionColor} hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-lg`}
                        >
                            {config.action}
                        </button>
                    )}

                    {currentStatus === 'verified' && (
                        <div className="flex items-center gap-2 text-sm text-green-700 font-semibold mt-2">
                            <Shield size={16} />
                            <span>Account fully verified</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
