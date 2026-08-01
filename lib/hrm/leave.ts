import { LeaveStatus, LeaveType, EmployeeLeaveBalance, LeaveBreakdown } from '@/types/hrm';
import { LEAVE_TYPE_LABELS } from './validation';

export const LEAVE_STATUS_META: Record<LeaveStatus, { label: string; badgeCls: string }> = {
  pending:   { label: 'Pending',   badgeCls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
  approved:  { label: 'Approved',  badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
  rejected:  { label: 'Rejected',  badgeCls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' },
  cancelled: { label: 'Cancelled', badgeCls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
};

export function getLeaveTypeLabel(type: LeaveType | string): string {
  if (type in LEAVE_TYPE_LABELS) {
    return LEAVE_TYPE_LABELS[type as LeaveType];
  }
  return type;
}

export function computeAvailableLeaveDays(balance: Partial<EmployeeLeaveBalance>): number {
  const entitled = Number(balance.entitled_days) || 0;
  const carried = Number(balance.carried_forward_days) || 0;
  const accrued = Number(balance.accrued_days) || 0;
  const adjustment = Number(balance.adjustment_days) || 0;
  const used = Number(balance.used_days) || 0;
  const reserved = Number(balance.reserved_days) || 0;

  const available = (entitled + carried + accrued + adjustment) - (used + reserved);
  return Math.max(0, available);
}

export function formatLeaveBreakdownSummary(breakdown?: LeaveBreakdown | null): string {
  if (!breakdown) return '';
  const parts: string[] = [];
  parts.push(`${breakdown.chargeable_days} chargeable work day(s)`);
  if (breakdown.weekend_days > 0) parts.push(`${breakdown.weekend_days} weekend(s) excluded`);
  if (breakdown.holiday_days > 0) parts.push(`${breakdown.holiday_days} holiday(s) excluded`);
  return parts.join(' · ');
}
