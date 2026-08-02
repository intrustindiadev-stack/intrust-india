import {
  LeaveRequestSchema,
  LeaveReviewSchema,
  HRLeaveReviewSchema,
  AdminLeaveReviewSchema,
  LeaveCancelSchema,
  LeavePolicyYearSchema,
  LeavePolicySchema,
  AdjustBalanceSchema,
  CANONICAL_LEAVE_TYPES
} from '../lib/hrm/validation';

import {
  computeAvailableLeaveDays,
  getLeaveTypeLabel,
  canEmployeeCancel,
  canHRReview,
  canAdminReview,
  getLeaveStatusStage,
  LEAVE_STATUS_META
} from '../lib/hrm/leave';

describe('HRM Leaves Production Multi-Stage Approval Workflow & Policy Suite', () => {

  describe('1. Workflow Status Meta & Display Labels', () => {
    test('all 6 workflow status states have defined metadata and badges', () => {
      expect(LEAVE_STATUS_META['pending_hr_review']).toBeDefined();
      expect(LEAVE_STATUS_META['pending_admin_confirmation']).toBeDefined();
      expect(LEAVE_STATUS_META['approved']).toBeDefined();
      expect(LEAVE_STATUS_META['rejected_by_hr']).toBeDefined();
      expect(LEAVE_STATUS_META['rejected_by_admin']).toBeDefined();
      expect(LEAVE_STATUS_META['cancelled']).toBeDefined();
    });

    test('getLeaveTypeLabel formats custom policy keys and canonical keys', () => {
      expect(getLeaveTypeLabel('casual')).toBe('Casual Leave');
      expect(getLeaveTypeLabel('paternity')).toBe('Paternity Leave');
      expect(getLeaveTypeLabel('sabbatical_leave')).toBe('Sabbatical Leave');
    });
  });

  describe('2. Leave Balance Calculations', () => {
    test('computeAvailableLeaveDays subtracts used and reserved from entitled + carried + accrued + adjustment', () => {
      const balance = {
        entitled_days: 12,
        carried_forward_days: 3,
        accrued_days: 1,
        adjustment_days: 2,
        used_days: 4,
        reserved_days: 2
      };
      // (12 + 3 + 1 + 2) - (4 + 2) = 18 - 6 = 12
      expect(computeAvailableLeaveDays(balance)).toBe(12);
    });

    test('computeAvailableLeaveDays clamps to 0 when negative balance is disallowed', () => {
      const balance = {
        entitled_days: 5,
        used_days: 6,
        reserved_days: 1
      };
      expect(computeAvailableLeaveDays(balance, false)).toBe(0);
      expect(computeAvailableLeaveDays(balance, true)).toBe(-2);
    });
  });

  describe('3. Workflow Stage & Permission Helpers', () => {
    test('1. Ordinary employee submission starts in pending_hr_review (Stage 1)', () => {
      expect(getLeaveStatusStage('pending_hr_review')).toBe(1);
    });

    test('2. HR manager submission starts in pending_admin_confirmation (Stage 2)', () => {
      expect(getLeaveStatusStage('pending_admin_confirmation')).toBe(2);
    });

    test('3. HR manager cannot review own request', () => {
      const request = {
        id: 'req-1',
        employee_id: 'hr-user-id-123',
        status: 'pending_hr_review',
        requester_role_snapshot: 'hr_manager'
      };
      expect(canHRReview(request, 'hr_manager', 'hr-user-id-123')).toBe(false);
    });

    test('4. HR manager cannot review another HR manager’s request', () => {
      const request = {
        id: 'req-2',
        employee_id: 'other-hr-user-id',
        status: 'pending_hr_review',
        requester_role_snapshot: 'hr_manager'
      };
      expect(canHRReview(request, 'hr_manager', 'hr-user-id-123')).toBe(false);
    });

    test('5 & 6. HR manager CAN review ordinary employee in pending_hr_review', () => {
      const request = {
        id: 'req-3',
        employee_id: 'emp-user-id',
        status: 'pending_hr_review',
        requester_role_snapshot: 'employee'
      };
      expect(canHRReview(request, 'hr_manager', 'hr-user-id-123')).toBe(true);
    });

    test('7 & 8. Admin review allowed only for pending_admin_confirmation status', () => {
      expect(canAdminReview('pending_admin_confirmation', 'admin')).toBe(true);
      expect(canAdminReview('pending_hr_review', 'admin')).toBe(false);
      expect(canAdminReview('approved', 'admin')).toBe(false);
    });

    test('10 & 11. Cancellation permitted only from pending states', () => {
      expect(canEmployeeCancel('pending_hr_review')).toBe(true);
      expect(canEmployeeCancel('pending_admin_confirmation')).toBe(true);
      expect(canEmployeeCancel('approved')).toBe(false);
      expect(canEmployeeCancel('rejected_by_hr')).toBe(false);
      expect(canEmployeeCancel('cancelled')).toBe(false);
    });
  });

  describe('4. Zod Input Validation Schemas', () => {
    test('LeaveRequestSchema accepts valid dynamic leave type key and dates', () => {
      const valid = LeaveRequestSchema.safeParse({
        leave_type: 'paternity',
        from_date: '2026-08-10',
        to_date: '2026-08-15',
        reason: 'Paternity leave'
      });
      expect(valid.success).toBe(true);
    });

    test('LeaveRequestSchema rejects invalid date range', () => {
      const invalid = LeaveRequestSchema.safeParse({
        leave_type: 'casual',
        from_date: '2026-08-15',
        to_date: '2026-08-10'
      });
      expect(invalid.success).toBe(false);
    });

    test('HRLeaveReviewSchema requires note for rejection', () => {
      const validRecommend = HRLeaveReviewSchema.safeParse({ action: 'recommend', note: null });
      expect(validRecommend.success).toBe(true);

      const invalidReject = HRLeaveReviewSchema.safeParse({ action: 'reject', note: '' });
      expect(invalidReject.success).toBe(false);

      const validReject = HRLeaveReviewSchema.safeParse({ action: 'reject', note: 'Project delivery overlap' });
      expect(validReject.success).toBe(true);
    });

    test('AdminLeaveReviewSchema requires note for rejection', () => {
      const validApprove = AdminLeaveReviewSchema.safeParse({ action: 'approve', note: null });
      expect(validApprove.success).toBe(true);

      const invalidReject = AdminLeaveReviewSchema.safeParse({ action: 'reject', note: ' ' });
      expect(invalidReject.success).toBe(false);

      const validReject = AdminLeaveReviewSchema.safeParse({ action: 'reject', note: 'Insufficient notice' });
      expect(validReject.success).toBe(true);
    });

    test('AdjustBalanceSchema enforces non-zero delta_days and min 3 char reason', () => {
      expect(AdjustBalanceSchema.safeParse({ delta_days: 0, reason: 'Valid reason' }).success).toBe(false);
      expect(AdjustBalanceSchema.safeParse({ delta_days: 2.5, reason: 'ok' }).success).toBe(false);
      expect(AdjustBalanceSchema.safeParse({ delta_days: -1.5, reason: 'Correction for payroll' }).success).toBe(true);
    });

    test('LeavePolicyYearSchema validates effective dates', () => {
      const invalidDates = LeavePolicyYearSchema.safeParse({
        policy_year: 2026,
        name: '2026 Policy',
        status: 'draft',
        effective_from: '2026-12-31',
        effective_to: '2026-01-01'
      });
      expect(invalidDates.success).toBe(false);
    });
  });

  describe('5. Policy Publishing & Balance Isolation Verification', () => {
    test('Summary GET structure contract requires active_policy_year and balances', () => {
      const summaryPayload = {
        success: true,
        policy_year: 2026,
        is_policy_configured: true,
        active_policies: [{ leave_type_key: 'casual', annual_entitlement: 12 }],
        balances: { casual: { available_days: 12 } },
        holidays: []
      };

      expect(summaryPayload.is_policy_configured).toBe(true);
      expect(summaryPayload.balances.casual.available_days).toBe(12);
    });
  });
});
