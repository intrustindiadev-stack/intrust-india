'use client';

import { Clock, CheckCircle2, DollarSign, XCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { INCENTIVE_STATUS_LABELS } from '@/lib/hrm/incentives';

const STATUS_CONFIG = {
  pending: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
  },
  approved: {
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: CheckCircle2,
  },
  paid: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: DollarSign,
  },
  rejected: {
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: XCircle,
  },
  cancelled: {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: AlertTriangle,
  },
  reversed: {
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: RotateCcw,
  },
};

export default function IncentiveStatusBadge({ status, className = '' }) {
  const normalizedStatus = (status || 'pending').toLowerCase();
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  const label = INCENTIVE_STATUS_LABELS[normalizedStatus] || status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${className}`}
      aria-label={`Status: ${label}`}
    >
      <Icon size={13} className="shrink-0" />
      <span>{label}</span>
    </span>
  );
}
