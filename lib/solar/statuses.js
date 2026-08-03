import { Sparkles, PhoneCall, CheckCircle2, CalendarCheck, FileCheck2, TrendingUp, XCircle, Ban } from 'lucide-react';

export const SOLAR_STATUSES = {
    new: { label: 'New', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: Sparkles, step: 1 },
    contacted: { label: 'Contacted', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', icon: PhoneCall, step: 2 },
    qualified: { label: 'Qualified', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800', icon: CheckCircle2, step: 3 },
    site_visit: { label: 'Site Survey', color: 'text-fuchsia-600', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20', border: 'border-fuchsia-200 dark:border-fuchsia-800', icon: CalendarCheck, step: 4 },
    quoted: { label: 'Quoted', color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800', icon: FileCheck2, step: 5 },
    converted: { label: 'Converted', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', icon: TrendingUp, terminal: true, step: 6 },
    lost: { label: 'Lost', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: XCircle, terminal: true },
    cancelled: { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/20', border: 'border-slate-200 dark:border-slate-800', icon: Ban, terminal: true },
};

export const SOLAR_STATUS_FLOW = ['new', 'contacted', 'qualified', 'site_visit', 'quoted', 'converted', 'lost', 'cancelled'];

export function isValidTransition(currentStatus, nextStatus) {
    // Basic terminal check
    if (SOLAR_STATUSES[currentStatus]?.terminal) {
        return false; // Can't transition out of a terminal state directly through normal flow
    }
    
    // Can always mark as lost or cancelled
    if (nextStatus === 'lost' || nextStatus === 'cancelled') return true;
    
    // Otherwise, ensure they're moving forward or staying in the same step
    const currentStep = SOLAR_STATUSES[currentStatus]?.step || 0;
    const nextStep = SOLAR_STATUSES[nextStatus]?.step || 0;
    
    return nextStep >= currentStep;
}
