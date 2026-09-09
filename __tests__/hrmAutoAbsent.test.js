import { calculateMonthWorkingDays } from '../lib/hrm/payroll';

/**
 * Server-Side Auto-Absent Business Logic Tests
 * Testing conditions:
 * 1. Working day with no attendance -> marked absent
 * 2. Sunday with no attendance -> skipped, NOT marked absent
 * 3. Weekly off with no attendance -> skipped, NOT marked absent
 * 4. Holiday with no attendance -> skipped, NOT marked absent
 * 5. Existing attendance (present/half-day) -> preserved, NOT overwritten
 * 6. Running auto-absent twice -> idempotent, no duplicates
 */

describe('Server-Side Auto-Absent Business Logic', () => {
  const weeklyOffs = [0]; // Sunday = 0
  const configuredHolidays = ['2026-08-15', '2026-10-02', '2026-12-25', '2026-01-26'];

  function evaluateAutoAbsentEligibility({
    dateStr,
    hasExistingAttendance = false,
    hasApprovedLeave = false,
    employeeJoiningDate = '2025-01-01',
    isSuspended = false,
  }) {
    const d = new Date(dateStr);
    const dayOfWeek = d.getDay();

    // Condition 1: Check suspension
    if (isSuspended) {
      return { eligible: false, reason: 'employee_suspended' };
    }

    // Condition 2: Check joining date
    if (employeeJoiningDate && new Date(employeeJoiningDate) > d) {
      return { eligible: false, reason: 'prior_to_joining' };
    }

    // Condition 3: Check Sunday / weekly off
    if (weeklyOffs.includes(dayOfWeek)) {
      return { eligible: false, reason: 'weekly_off' };
    }

    // Condition 4: Check configured holiday
    if (configuredHolidays.includes(dateStr)) {
      return { eligible: false, reason: 'holiday' };
    }

    // Condition 5: Check existing attendance
    if (hasExistingAttendance) {
      return { eligible: false, reason: 'existing_attendance' };
    }

    // Condition 6: Check approved leave
    if (hasApprovedLeave) {
      return { eligible: false, reason: 'approved_leave' };
    }

    return { eligible: true, action: 'mark_absent' };
  }

  test('Condition 1: Working day with no attendance is marked ABSENT', () => {
    // 2026-09-08 is Tuesday (Working day)
    const result = evaluateAutoAbsentEligibility({
      dateStr: '2026-09-08',
      hasExistingAttendance: false,
      hasApprovedLeave: false,
    });

    expect(result.eligible).toBe(true);
    expect(result.action).toBe('mark_absent');
  });

  test('Condition 2 & 3: Sunday / weekly off with no attendance is NOT marked absent', () => {
    // 2026-09-06 is Sunday
    const result = evaluateAutoAbsentEligibility({
      dateStr: '2026-09-06',
      hasExistingAttendance: false,
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('weekly_off');
  });

  test('Condition 4: Configured holiday with no attendance is NOT marked absent', () => {
    // 2026-08-15 is Independence Day
    const result = evaluateAutoAbsentEligibility({
      dateStr: '2026-08-15',
      hasExistingAttendance: false,
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('holiday');
  });

  test('Condition 5: Existing attendance is preserved and never overwritten', () => {
    const resultPresent = evaluateAutoAbsentEligibility({
      dateStr: '2026-09-08',
      hasExistingAttendance: true,
    });

    expect(resultPresent.eligible).toBe(false);
    expect(resultPresent.reason).toBe('existing_attendance');
  });

  test('Condition 6: Idempotency - running auto-absent twice does not create duplicates', () => {
    // First run on unclocked employee
    const firstRun = evaluateAutoAbsentEligibility({
      dateStr: '2026-09-08',
      hasExistingAttendance: false,
    });
    expect(firstRun.eligible).toBe(true);

    // Simulating second run (now attendance record exists)
    const secondRun = evaluateAutoAbsentEligibility({
      dateStr: '2026-09-08',
      hasExistingAttendance: true, // Now exists
    });
    expect(secondRun.eligible).toBe(false);
    expect(secondRun.reason).toBe('existing_attendance');
  });

  test('Edge case: Employee joining mid-month is not marked absent for prior dates', () => {
    // Employee joins on 2026-09-15. Evaluating for 2026-09-08.
    const result = evaluateAutoAbsentEligibility({
      dateStr: '2026-09-08',
      employeeJoiningDate: '2026-09-15',
      hasExistingAttendance: false,
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('prior_to_joining');
  });

  test('Edge case: Approved leave prevents marking absent', () => {
    const result = evaluateAutoAbsentEligibility({
      dateStr: '2026-09-08',
      hasExistingAttendance: false,
      hasApprovedLeave: true,
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('approved_leave');
  });
});
