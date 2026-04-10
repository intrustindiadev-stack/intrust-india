'use client';

import { CheckCircle, AlertCircle, Clock, Shield, ArrowRight } from 'lucide-react';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

export default function KYCStatus({ status, onStartKYC }) {
    // Normalize status: pending means it's under manual review or API call
    const currentStatus = (status === 'verified' || status === 'rejected' || status === 'pending') ? status : 'not_started';

    const statusConfig = {
        not_started: {
            color: 'from-gray-500 to-gray-600',
            pulseColor: 'bg-gray-400 dark:bg-gray-500',
            shadowColor: 'shadow-gray-500/10',
            icon: AlertCircle,
            title: 'KYC Verification',
            subtitle: 'Identity Status',
            description: 'Complete your KYC to unlock full access. Verification is instant via SprintVerify.',
            action: 'INITIALIZE KYC',
            actionBtnClass: 'bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100',
        },
        pending: {
            color: 'from-amber-500 to-amber-600',
            pulseColor: 'bg-amber-500',
            shadowColor: 'shadow-amber-500/10',
            icon: Clock,
            title: 'Under Review',
            subtitle: 'Identity Status',
            description: 'Your KYC application is currently under manual review by our team. This usually takes 24-48 hours.',
            action: null,
            actionBtnClass: null
        },
        verified: {
            color: 'from-blue-500 to-blue-600',
            pulseColor: 'bg-blue-500',
            shadowColor: 'shadow-blue-500/10',
            icon: Shield,
            title: 'Verified KYC',
            subtitle: 'Identity Status',
            description: 'Your account has been officially verified via SprintVerify. Full protocol access granted.',
            action: null,
            actionBtnClass: null
        },
        rejected: {
            color: 'from-red-500 to-rose-600',
            pulseColor: 'bg-red-500',
            shadowColor: 'shadow-red-500/10',
            icon: AlertCircle,
            title: 'Verification Failed',
            subtitle: 'Identity Status',
            description: 'Your verification failed via SprintVerify. Please resubmit with correct information.',
            action: 'RESUBMIT KYC',
            actionBtnClass: 'bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100'
        }
    };

    const config = statusConfig[currentStatus];
    const Icon = config.icon;

    return (
        <div className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-[2.5rem] border border-gray-100 dark:border-white/5 p-8 shadow-xl relative overflow-hidden transition-all duration-500 group">

            {/* Background elements to match overall theme */}
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] opacity-20 -mr-10 -mt-10 transition-all duration-700 ${config.pulseColor}`} />

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-[1.25rem] bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg ${config.shadowColor}`}>
                        <Icon size={20} className="text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{config.title}</h3>
                            {currentStatus === 'verified' && <VerifiedBadge size="sm" />}
                        </div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">{config.subtitle}</p>
                    </div>
                </div>
                {/* Visual pulse for pending/not started */}
                {currentStatus !== 'verified' && currentStatus !== 'rejected' && (
                    <div className={`w-2 h-2 rounded-full ${config.pulseColor} animate-pulse shadow-lg ${config.shadowColor}`} />
                )}
            </div>

            <div className="bg-gray-50 dark:bg-white/[0.02] rounded-3xl p-6 border border-gray-100 dark:border-white/5 mb-6 relative z-10">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-relaxed tracking-tight">
                    {config.description}
                </p>
                {currentStatus === 'verified' && (
                    <div className="flex items-center gap-2 text-[10px] text-blue-600 dark:text-blue-400 font-black tracking-widest uppercase mt-4">
                        <Shield size={12} />
                        <span>Instant Verification Protocol</span>
                    </div>
                )}
            </div>

            {config.action && (
                <button
                    onClick={onStartKYC}
                    className={`w-full py-4 text-[11px] font-black rounded-2xl transition-all uppercase tracking-[0.15em] flex items-center justify-center gap-2 active:scale-95 shadow-2xl relative z-10 group/btn ${config.actionBtnClass}`}
                >
                    {config.action}
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
            )}
        </div>
    );
}
