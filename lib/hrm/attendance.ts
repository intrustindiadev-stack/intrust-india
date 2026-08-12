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
  expectedWorkingDays: number; // added
}

export function computeAttendanceMetrics(
  records: AttendanceRecord[],
  windowStartStr?: string,
  windowEndStr?: string,
  joiningDateStr?: string,
  weeklyOffs: number[] = [0, 6], // Sunday=0, Saturday=6
  holidays: string[] = [], // YYYY-MM-DD
  leaveDates: string[] = [] // YYYY-MM-DD
): AttendanceMetrics {
  const totalRecords = records.length;
  const presentDays = records.filter(r => r.status === 'present' || r.status === 'wfh').length;
  const lateDays = records.filter(r => r.status === 'late').length;
  const absentDays = records.filter(r => r.status === 'absent').length;
  
  const effectivePresent = presentDays + lateDays + records.filter(r => r.status === 'half_day').length * 0.5;
  
  let expectedWorkingDays = 0;

  if (windowStartStr && windowEndStr) {
    const start = new Date(windowStartStr);
    const end = new Date(windowEndStr);
    const joinDate = joiningDateStr ? new Date(joiningDateStr) : new Date('2000-01-01');

    // Calculate actual bounds
    const actualStart = start < joinDate ? joinDate : start;
    const actualEnd = end > new Date() ? new Date() : end; // don't count future days

    // Normalize actualEnd to midnight for easy comparison if they are same day
    actualStart.setHours(0,0,0,0);
    actualEnd.setHours(0,0,0,0);

    const holidaySet = new Set(holidays);
    const leaveSet = new Set(leaveDates);

    let currentDate = new Date(actualStart);
    while (currentDate <= actualEnd) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const isWeekend = weeklyOffs.includes(dayOfWeek);
      const isHoliday = holidaySet.has(dateStr);
      const isLeave = leaveSet.has(dateStr);

      if (!isWeekend && !isHoliday && !isLeave) {
        expectedWorkingDays++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else {
    expectedWorkingDays = totalRecords;
  }

  const attendanceRatePct = expectedWorkingDays > 0 ? Math.round((effectivePresent / expectedWorkingDays) * 100) : (totalRecords > 0 ? 100 : 0);

  return {
    totalRecords,
    presentDays: presentDays + lateDays,
    lateDays,
    absentDays,
    attendanceRatePct,
    expectedWorkingDays
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
