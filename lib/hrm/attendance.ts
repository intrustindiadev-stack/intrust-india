import { AttendanceRecord, AttendanceStatus } from '@/types/hrm';
import { formatTimeIST, calculateDuration } from './date';

export const ATTENDANCE_STATUS_META: Record<AttendanceStatus, { label: string; badgeCls: string }> = {
  present:  { label: 'Present',  badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
  absent:   { label: 'Absent',   badgeCls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' },
  late:     { label: 'Late',     badgeCls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
  half_day: { label: 'Half Day', badgeCls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' },
  holiday:  { label: 'Holiday',  badgeCls: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800' },
  wfh:      { label: 'WFH',      badgeCls: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800' },
};

export interface AttendanceMetrics {
  totalRecords: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  attendanceRatePct: number;
}

export function computeAttendanceMetrics(records: AttendanceRecord[]): AttendanceMetrics {
  const totalRecords = records.length;
  const presentDays = records.filter(r => r.status === 'present' || r.status === 'wfh').length;
  const lateDays = records.filter(r => r.status === 'late').length;
  const absentDays = records.filter(r => r.status === 'absent').length;
  
  const effectivePresent = presentDays + lateDays + records.filter(r => r.status === 'half_day').length * 0.5;
  const attendanceRatePct = totalRecords > 0 ? Math.round((effectivePresent / totalRecords) * 100) : 100;

  return {
    totalRecords,
    presentDays: presentDays + lateDays,
    lateDays,
    absentDays,
    attendanceRatePct
  };
}

export function getLocationStatusBadge(record: AttendanceRecord): { label: string; cls: string } {
  if (record.is_onsite) {
    return { label: 'On-Site', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' };
  }
  if (record.check_in_lat != null && record.check_in_lng != null) {
    return { label: 'Off-Site', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300' };
  }
  return { label: 'No GPS', cls: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400' };
}
