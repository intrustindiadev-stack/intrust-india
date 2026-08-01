import { LeaveRequestSchema, LeaveReviewSchema, LeaveCancelSchema, CANONICAL_LEAVE_TYPES } from '../lib/hrm/validation';
import { computeAvailableLeaveDays, getLeaveTypeLabel } from '../lib/hrm/leave';

describe('HRM Leaves Utilities & Validations', () => {
  describe('Canonical Leave Types & Labels', () => {
    test('canonical leave types contains required policy values', () => {
      expect(CANONICAL_LEAVE_TYPES).toContain('casual');
      expect(CANONICAL_LEAVE_TYPES).toContain('sick');
      expect(CANONICAL_LEAVE_TYPES).toContain('earned');
      expect(CANONICAL_LEAVE_TYPES).toContain('unpaid');
      expect(CANONICAL_LEAVE_TYPES).toContain('maternity');
      expect(CANONICAL_LEAVE_TYPES).toContain('paternity');
    });

    test('getLeaveTypeLabel maps canonical keys to UI display labels', () => {
      expect(getLeaveTypeLabel('casual')).toBe('Casual Leave');
      expect(getLeaveTypeLabel('sick')).toBe('Sick Leave');
      expect(getLeaveTypeLabel('earned')).toBe('Earned Leave');
    });
  });

  describe('Leave Balance Calculations', () => {
    test('computeAvailableLeaveDays subtracts used and reserved from entitled', () => {
      const balance = {
        entitled_days: 12,
        carried_forward_days: 2,
        accrued_days: 0,
        used_days: 3,
        reserved_days: 2,
        adjustment_days: 0
      };
      // (12 + 2) - (3 + 2) = 9
      expect(computeAvailableLeaveDays(balance)).toBe(9);
    });

    test('computeAvailableLeaveDays does not return negative values', () => {
      const balance = {
        entitled_days: 5,
        used_days: 6,
        reserved_days: 0
      };
      expect(computeAvailableLeaveDays(balance)).toBe(0);
    });
  });

  describe('Leave Zod Schemas', () => {
    test('LeaveRequestSchema rejects end date before start date', () => {
      const invalid = LeaveRequestSchema.safeParse({
        leave_type: 'casual',
        from_date: '2026-08-10',
        to_date: '2026-08-05',
        reason: 'Personal work'
      });
      expect(invalid.success).toBe(false);
    });

    test('LeaveRequestSchema accepts valid canonical request', () => {
      const valid = LeaveRequestSchema.safeParse({
        leave_type: 'casual',
        from_date: '2026-08-10',
        to_date: '2026-08-12',
        reason: 'Family event'
      });
      expect(valid.success).toBe(true);
    });

    test('LeaveRequestSchema rejects legacy display label leave type', () => {
      const invalid = LeaveRequestSchema.safeParse({
        leave_type: 'Casual Leave',
        from_date: '2026-08-10',
        to_date: '2026-08-12'
      });
      expect(invalid.success).toBe(false);
    });

    test('LeaveReviewSchema accepts approved and rejected actions', () => {
      expect(LeaveReviewSchema.safeParse({ action: 'approved', note: 'Looks good' }).success).toBe(true);
      expect(LeaveReviewSchema.safeParse({ action: 'rejected', note: 'Project deadline' }).success).toBe(true);
      expect(LeaveReviewSchema.safeParse({ action: 'pending' }).success).toBe(false);
    });
  });
});
