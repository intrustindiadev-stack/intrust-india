import { getISTDateString, formatTimeIST, calculateDuration, calculateElapsedTime } from '../lib/hrm/date';
import { computeAttendanceMetrics, getLocationStatusBadge } from '../lib/hrm/attendance';
import { ClockInSchema, ClockOutSchema, AttendanceOverrideSchema } from '../lib/hrm/validation';

describe('HRM Attendance Utilities & Validations', () => {
  describe('IST Date & Time Formatting', () => {
    test('getISTDateString formats dates in Asia/Kolkata timezone', () => {
      const dateStr = getISTDateString(new Date('2026-08-15T01:30:00Z'));
      expect(dateStr).toBe('2026-08-15');
    });

    test('formatTimeIST formats timestamptz to 12-hour string', () => {
      const timeStr = formatTimeIST('2026-08-15T04:00:00Z'); // 09:30 IST
      expect(timeStr).toContain('09:30');
    });

    test('calculateDuration correctly computes diff between timestamps', () => {
      const duration = calculateDuration('2026-08-15T04:00:00Z', '2026-08-15T13:00:00Z');
      expect(duration).toBe('9h 0m');
    });

    test('calculateDuration handles invalid or missing timestamps gracefully', () => {
      expect(calculateDuration(null, null)).toBe('—');
      expect(calculateDuration('2026-08-15T10:00:00Z', '2026-08-15T09:00:00Z')).toBe('—');
    });
  });

  describe('Attendance Metrics', () => {
    test('computeAttendanceMetrics calculates rate accurately', () => {
      const records = [
        { id: '1', status: 'present' },
        { id: '2', status: 'late' },
        { id: '3', status: 'absent' },
        { id: '4', status: 'wfh' }
      ];
      const metrics = computeAttendanceMetrics(records);
      expect(metrics.totalRecords).toBe(4);
      expect(metrics.presentDays).toBe(3); // present + late + wfh
      expect(metrics.lateDays).toBe(1);
      expect(metrics.absentDays).toBe(1);
      expect(metrics.attendanceRatePct).toBe(75);
    });

    test('getLocationStatusBadge correctly identifies onsite vs offsite', () => {
      const onsiteRec = { is_onsite: true };
      const offsiteRec = { is_onsite: false, check_in_lat: 19.1, check_in_lng: 72.8 };
      const noGpsRec = { is_onsite: false };

      expect(getLocationStatusBadge(onsiteRec).label).toBe('On-Site');
      expect(getLocationStatusBadge(offsiteRec).label).toBe('Off-Site');
      expect(getLocationStatusBadge(noGpsRec).label).toBe('No GPS');
    });
  });

  describe('Attendance Zod Schemas', () => {
    test('ClockInSchema accepts valid coordinates or null', () => {
      expect(ClockInSchema.safeParse({ lat: 19.0760, lng: 72.8777 }).success).toBe(true);
      expect(ClockInSchema.safeParse({}).success).toBe(true);
      expect(ClockInSchema.safeParse({ lat: 100, lng: 72.8777 }).success).toBe(false); // Lat > 90
    });

    test('AttendanceOverrideSchema validates mandatory override reason', () => {
      const valid = AttendanceOverrideSchema.safeParse({
        attendance_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'present',
        reason: 'Approved medical absence'
      });
      expect(valid.success).toBe(true);

      const invalidReason = AttendanceOverrideSchema.safeParse({
        attendance_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'present',
        reason: 'ab' // < 3 chars
      });
      expect(invalidReason.success).toBe(false);
    });
  });
});
