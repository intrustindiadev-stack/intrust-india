import { LeaveStatus, LeaveType, EmployeeLeaveBalance, LeaveBreakdown, LeaveRequestRecord } from '@/types/hrm';
import { LEAVE_TYPE_LABELS } from './validation';

export const LEAVE_STATUS_META: Record<string, { label: string; badgeCls: string; description: string }> = {
  pending_hr_review: {
    label: 'Pending HR Review',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    description: 'Awaiting HR manager recommendation or review'
  },
  pending_admin_confirmation: {
    label: 'Pending Admin Confirmation',
    badgeCls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    description: 'HR recommended — Awaiting final admin approval'
  },
  approved: {
    label: 'Approved',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    description: 'Leave request approved by admin'
  },
  rejected_by_hr: {
    label: 'Rejected by HR',
    badgeCls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    description: 'Rejected during HR review stage'
  },
  rejected_by_admin: {
    label: 'Rejected by Admin',
    badgeCls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    description: 'Rejected during admin review stage'
  },
  cancelled: {
    label: 'Cancelled',
    badgeCls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    description: 'Cancelled by employee'
  },
  // Legacy compatibility fallbacks
  pending: {
    label: 'Pending HR Review',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    description: 'Awaiting review'
  },
  rejected: {
    label: 'Rejected',
    badgeCls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    description: 'Leave request rejected'
  }
};

export function getLeaveTypeLabel(type: LeaveType | string): string {
  if (type in LEAVE_TYPE_LABELS) {
    return LEAVE_TYPE_LABELS[type];
  }
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function computeAvailableLeaveDays(balance: Partial<EmployeeLeaveBalance>, allowNegative: boolean = false): number {
  const entitled = Number(balance.entitled_days) || 0;
  const carried = Number(balance.carried_forward_days) || 0;
  const accrued = Number(balance.accrued_days) || 0;
  const adjustment = Number(balance.adjustment_days) || 0;
  const used = Number(balance.used_days) || 0;
  const reserved = Number(balance.reserved_days) || 0;

  const available = (entitled + carried + accrued + adjustment) - (used + reserved);
  const rounded = Math.round(available * 100) / 100;
  return allowNegative ? rounded : Math.max(0, rounded);
}

export function formatLeaveBreakdownSummary(breakdown?: LeaveBreakdown | null): string {
  if (!breakdown) return '';
  const parts: string[] = [];
  parts.push(`${breakdown.chargeable_days} chargeable work day(s)`);
  if (breakdown.weekend_days > 0) parts.push(`${breakdown.weekend_days} weekend(s) excluded`);
  if (breakdown.holiday_days > 0) parts.push(`${breakdown.holiday_days} holiday(s) excluded`);
  return parts.join(' · ');
}

export function canEmployeeCancel(status: LeaveStatus | string): boolean {
  return ['pending_hr_review', 'pending_admin_confirmation', 'pending'].includes(status);
}

export function canHRReview(request: LeaveRequestRecord, userRole: string, userId: string): boolean {
  if (userRole !== 'hr_manager') return false;
  if (request.status !== 'pending_hr_review' && request.status !== 'pending') return false;
  // HR managers must never review their own leave or other HR managers' leave
  if (request.employee_id === userId) return false;
  if (request.requester_role_snapshot === 'hr_manager') return false;
  return true;
}

export function canAdminReview(status: LeaveStatus | string, userRole: string): boolean {
  if (!['admin', 'super_admin'].includes(userRole)) return false;
  return status === 'pending_admin_confirmation';
}

export function getLeaveStatusStage(status: LeaveStatus | string): number {
  switch (status) {
    case 'pending_hr_review':
    case 'pending':
      return 1; // Submitted, awaiting HR
    case 'pending_admin_confirmation':
      return 2; // HR recommended (or HR direct), awaiting Admin
    case 'approved':
      return 3; // Approved
    case 'rejected_by_hr':
    case 'rejected_by_admin':
    case 'rejected':
    case 'cancelled':
      return -1; // Terminal rejected/cancelled
    default:
      return 0;
  }
}
