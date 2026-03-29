'use client';

import { Clock, CheckCircle2, CreditCard, AlertCircle } from 'lucide-react';

export function RequestTimeline({ status }) {
    const stages = [
        { key: 'requested', label: 'Requested', icon: Clock },
        { key: 'approved', label: 'Approved', icon: CheckCircle2 },
        { key: 'paid', label: 'Paid', icon: CreditCard }
    ];

    const currentIdx = status === 'pending' ? 0 : status === 'approved' ? 1 : (status === 'completed' ? 2 : -1);

    return (
        <div className="mt-6 flex items-center justify-between relative max-w-[280px]">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2" />
            {stages.map((stage, idx) => {
                const isActive = idx <= currentIdx;
                const isPulse = idx === currentIdx && status !== 'completed';
                
                return (
                    <div key={idx} className="relative z-10 flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full border-2 transition-all duration-500 ${
                            isActive ? 'bg-amber-500 border-amber-500 scale-110' : 'bg-white border-gray-200'
                        } ${isPulse ? 'animate-pulse' : ''}`} />
                        <span className={`text-[9px] font-black uppercase tracking-tight mt-1 transition-colors ${
                            isActive ? 'text-gray-900' : 'text-gray-300'
                        }`}>
                            {stage.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export function UdhariStatusBadge({ status, daysLeft }) {
    if (status === 'pending') return (
        <div className="flex items-center gap-1.5 bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg shadow-blue-200">
            <Clock size={12} />
            Pending
        </div>
    );
    if (status === 'denied') return (
        <div className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg shadow-red-200">
            <AlertCircle size={12} />
            Denied
        </div>
    );
    if (status === 'completed') return (
        <div className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg shadow-green-200">
            <CheckCircle2 size={12} />
            Paid
        </div>
    );

    if (status === 'approved') {
        const isOverdue = daysLeft !== null && daysLeft < 0;
        const colorClass = isOverdue ? 'bg-red-500 shadow-red-200' : 'bg-amber-500 shadow-amber-200';
        const label = isOverdue ? 'Overdue' : daysLeft === 0 ? 'Due Today' : `${daysLeft}d Left`;

        return (
            <div className={`flex items-center gap-1.5 ${colorClass} text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg`}>
                <Clock size={12} />
                {label}
            </div>
        );
    }

    return null;
}
