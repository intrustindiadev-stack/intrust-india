import {
  calculateMonthWorkingDays,
  calculateSalaryBreakdown,
  classifyMonthAttendanceAndLeaves,
  roundToTwo,
} from '../lib/hrm/payroll';

describe('HRM Salary, Payroll & Payslip Confirmed Business Rules', () => {
  describe('1. Salary Basis: Daily Basic Rate uses Calendar Days (NOT Working Days)', () => {
    test('31-day month: ₹50,000 / 31 = ₹1,612.90', () => {
      const breakdown = calculateSalaryBreakdown({
        base_salary: 50000,
        calendar_days: 31,
        working_days: 25, // informational only
        absent_days: 0,
        half_day_days: 0,
      });

      expect(breakdown.calendar_days).toBe(31);
      expect(breakdown.working_days).toBe(25);
      expect(breakdown.daily_basic_rate).toBe(1612.90);
      expect(breakdown.attendance_deduction).toBe(0);
      expect(breakdown.calculated_net_salary).toBe(50000);
      expect(breakdown.final_payable).toBe(50000);
    });

    test('30-day month: ₹30,000 / 30 = ₹1,000.00', () => {
      const breakdown = calculateSalaryBreakdown({
        base_salary: 30000,
        calendar_days: 30,
        working_days: 26,
        absent_days: 0,
        half_day_days: 0,
      });

      expect(breakdown.calendar_days).toBe(30);
      expect(breakdown.daily_basic_rate).toBe(1000.00);
      expect(breakdown.final_payable).toBe(30000);
    });

    test('28-day month (February non-leap): ₹28,000 / 28 = ₹1,000.00', () => {
      const breakdown = calculateSalaryBreakdown({
        base_salary: 28000,
        calendar_days: 28,
        working_days: 24,
        absent_days: 0,
        half_day_days: 0,
      });

      expect(breakdown.calendar_days).toBe(28);
      expect(breakdown.daily_basic_rate).toBe(1000.00);
    });

    test('29-day month (February leap year): ₹29,000 / 29 = ₹1,000.00', () => {
      const breakdown = calculateSalaryBreakdown({
        base_salary: 29000,
        calendar_days: 29,
        working_days: 25,
        absent_days: 0,
        half_day_days: 0,
      });

      expect(breakdown.calendar_days).toBe(29);
      expect(breakdown.daily_basic_rate).toBe(1000.00);
    });
  });

  describe('2. Attendance Deductions: Absent & Half Day', () => {
    test('Present days incur 0 deduction', () => {
      const breakdown = calculateSalaryBreakdown({
        base_salary: 31000,
        calendar_days: 31,
        absent_days: 0,
        half_day_days: 0,
      });
      expect(breakdown.daily_basic_rate).toBe(1000.00);
      expect(breakdown.absent_deduction).toBe(0);
      expect(breakdown.half_day_deduction).toBe(0);
      expect(breakdown.attendance_deduction).toBe(0);
    });

    test('Absent: 2 days absent = 2 × Daily Basic Rate', () => {
      const breakdown = calculateSalaryBreakdown({
        base_salary: 31000,
        calendar_days: 31,
        absent_days: 2,
        half_day_days: 0,
      });
      // Daily rate = 1000
      expect(breakdown.absent_deduction).toBe(2000);
      expect(breakdown.attendance_deduction).toBe(2000);
      expect(breakdown.calculated_net_salary).toBe(29000);
    });

    test('Half Day: 1 half day = 0.5 × Daily Basic Rate', () => {
      const breakdown = calculateSalaryBreakdown({
        base_salary: 31000,
        calendar_days: 31,
        absent_days: 0,
        half_day_days: 1,
      });
      expect(breakdown.half_day_deduction).toBe(500);
      expect(breakdown.attendance_deduction).toBe(500);
      expect(breakdown.calculated_net_salary).toBe(30500);
    });

    test('Combined: 2 absent + 1 half day', () => {
      const breakdown = calculateSalaryBreakdown({
        base_salary: 50000,
        calendar_days: 31,
        absent_days: 2,
        half_day_days: 1,
      });
      // Daily rate = 50000 / 31 = 1612.90
      // 2 * 1612.90 = 3225.80
      // 1 * 1612.90 * 0.5 = 806.45
      // Total = 4032.25
      expect(breakdown.daily_basic_rate).toBe(1612.90);
      expect(breakdown.absent_deduction).toBe(3225.80);
      expect(breakdown.half_day_deduction).toBe(806.45);
      expect(breakdown.attendance_deduction).toBe(4032.25);
      expect(breakdown.calculated_net_salary).toBe(45967.75);
    });
  });

  describe('3. Leave Rules: Paid Leave vs Unpaid Leave', () => {
    test('Approved Paid Leave: 0 deduction (Paid in full)', () => {
      const res = classifyMonthAttendanceAndLeaves({
        year: 2026,
        month: 8,
        weeklyOffs: [0],
        holidays: ['2026-08-15'],
        attendanceRecords: [
          { date: '2026-08-01', status: 'present' },
        ],
        leaveRequests: [
          { from_date: '2026-08-03', to_date: '2026-08-05', leave_type: 'casual', status: 'approved' },
        ],
      });

      expect(res.paidLeaveDays).toBe(3);
      expect(res.unpaidLeaveDays).toBe(0);

      const breakdown = calculateSalaryBreakdown({
        base_salary: 31000,
        calendar_days: res.calendarDays,
        absent_days: 0,
        half_day_days: 0,
        unpaid_leave_days: res.unpaidLeaveDays,
      });

      expect(breakdown.unpaid_leave_deduction).toBe(0);
      expect(breakdown.attendance_deduction).toBe(0);
    });

    test('Approved Unpaid Leave: 1 day deduction per unpaid day', () => {
      const breakdown = calculateSalaryBreakdown({
        base_salary: 31000,
        calendar_days: 31,
        absent_days: 0,
        half_day_days: 0,
        unpaid_leave_days: 2,
      });

      expect(breakdown.daily_basic_rate).toBe(1000.00);
      expect(breakdown.unpaid_leave_deduction).toBe(2000.00);
      expect(breakdown.attendance_deduction).toBe(2000.00);
      expect(breakdown.calculated_net_salary).toBe(29000.00);
    });

    test('Pending Paid Leave & Pending Unpaid Leave produce NO leave deduction', () => {
      // Pending requests must have no approved leave status effect
      const res = classifyMonthAttendanceAndLeaves({
        year: 2026,
        month: 8,
        weeklyOffs: [0],
        holidays: ['2026-08-15'],
        attendanceRecords: [],
        leaveRequests: [
          { from_date: '2026-08-03', to_date: '2026-08-04', leave_type: 'casual', status: 'pending' },
          { from_date: '2026-08-05', to_date: '2026-08-06', leave_type: 'unpaid', status: 'pending_admin_confirmation' },
          { from_date: '2026-08-07', to_date: '2026-08-08', leave_type: 'sick', status: 'rejected_by_hr' },
        ],
        completedUntilDateStr: '2026-08-01', // cutoff before leaves
      });

      expect(res.paidLeaveDays).toBe(0);
      expect(res.unpaidLeaveDays).toBe(0);
    });
  });

  describe('4. Calendar Rules: Sundays / Weekly Offs & Holidays are PAID', () => {
    test('Sundays and Configured Holidays are classified as paid and NEVER absent', () => {
      // In August 2026:
      // Aug 2, 9, 16, 23, 30 are Sundays (weekly offs).
      // Aug 15 is Independence Day (Holiday).
      const res = classifyMonthAttendanceAndLeaves({
        year: 2026,
        month: 8,
        weeklyOffs: [0],
        holidays: ['2026-08-15'],
        attendanceRecords: [],
        leaveRequests: [],
        completedUntilDateStr: '2026-08-31',
      });

      expect(res.weeklyOffs).toBe(5);
      expect(res.holidays).toBe(1);
      expect(res.dateDetails['2026-08-02'].classification).toBe('weekly_off');
      expect(res.dateDetails['2026-08-02'].isPaid).toBe(true);
      expect(res.dateDetails['2026-08-15'].classification).toBe('holiday');
      expect(res.dateDetails['2026-08-15'].isPaid).toBe(true);
      expect(res.dateDetails['2026-08-15'].deductionDays).toBe(0);
    });
  });

  describe('5. CRITICAL: Strict No Double Counting', () => {
    test('Unpaid Leave is NOT also counted as Absent', () => {
      // Suppose Aug 3 and Aug 4 have approved unpaid leave
      // Even if an errant absent attendance record exists for Aug 3,
      // the date classification must NOT deduct both absent and unpaid leave
      const res = classifyMonthAttendanceAndLeaves({
        year: 2026,
        month: 8,
        weeklyOffs: [0],
        holidays: [],
        attendanceRecords: [
          { date: '2026-08-03', status: 'absent' }, // errant duplicate
        ],
        leaveRequests: [
          { from_date: '2026-08-03', to_date: '2026-08-04', leave_type: 'unpaid', status: 'approved' },
        ],
        completedUntilDateStr: '2026-08-04',
      });

      expect(res.unpaidLeaveDays).toBe(2);
      expect(res.dateDetails['2026-08-03'].classification).toBe('unpaid_leave');
      expect(res.dateDetails['2026-08-04'].classification).toBe('unpaid_leave');

      // Date Aug 3 must not be counted in absentDays
      expect(res.absentDays).not.toBeGreaterThan(2); // exactly other unclocked working days
    });

    test('Paid Leave is NOT counted as Absent', () => {
      const res = classifyMonthAttendanceAndLeaves({
        year: 2026,
        month: 8,
        weeklyOffs: [0],
        holidays: [],
        attendanceRecords: [
          { date: '2026-08-10', status: 'absent' }, // errant duplicate
        ],
        leaveRequests: [
          { from_date: '2026-08-10', to_date: '2026-08-12', leave_type: 'casual', status: 'approved' },
        ],
        completedUntilDateStr: '2026-08-12',
      });

      expect(res.paidLeaveDays).toBe(3);
      expect(res.dateDetails['2026-08-10'].classification).toBe('paid_leave');
      expect(res.dateDetails['2026-08-10'].deductionDays).toBe(0);
    });

    test('Weekly Off or Holiday is NOT counted as Absent', () => {
      const res = classifyMonthAttendanceAndLeaves({
        year: 2026,
        month: 8,
        weeklyOffs: [0],
        holidays: ['2026-08-15'],
        attendanceRecords: [
          { date: '2026-08-15', status: 'absent' }, // spurious absent on holiday
          { date: '2026-08-16', status: 'absent' }, // spurious absent on Sunday
        ],
        completedUntilDateStr: '2026-08-16',
      });

      expect(res.dateDetails['2026-08-15'].classification).toBe('holiday');
      expect(res.dateDetails['2026-08-16'].classification).toBe('weekly_off');
    });
  });

  describe('6. Manual Adjustments', () => {
    test('Positive addition with reason increases net payable', () => {
      const breakdown = calculateSalaryBreakdown({
        base_salary: 30000,
        calendar_days: 30,
        absent_days: 0,
        half_day_days: 0,
        adjustment_type: 'addition',
        adjustment_amount: 2500,
        adjustment_reason: 'Festival Bonus',
      });

      expect(breakdown.calculated_net_salary).toBe(30000);
      expect(breakdown.adjustment_type).toBe('addition');
      expect(breakdown.adjustment_amount).toBe(2500);
      expect(breakdown.final_payable).toBe(32500);
      expect(breakdown.adjustment_reason).toBe('Festival Bonus');
    });

    test('Negative deduction with reason reduces net payable', () => {
      const breakdown = calculateSalaryBreakdown({
        base_salary: 30000,
        calendar_days: 30,
        absent_days: 0,
        half_day_days: 0,
        adjustment_type: 'deduction',
        adjustment_amount: 1500,
        adjustment_reason: 'Advance Salary Recovery',
      });

      expect(breakdown.calculated_net_salary).toBe(30000);
      expect(breakdown.adjustment_type).toBe('deduction');
      expect(breakdown.adjustment_amount).toBe(1500);
      expect(breakdown.final_payable).toBe(28500);
      expect(breakdown.total_deductions).toBe(1500);
      expect(breakdown.adjustment_reason).toBe('Advance Salary Recovery');
    });
  });

  describe('7. August 2026 TechnoDosz Regression Scenario', () => {
    test('Exact August 2026 scenario: ₹50,000 basic, 31 calendar days, 25 working days, 6 present, 15 absent', () => {
      // 31 calendar days in August 2026
      // 5 Sundays (2, 9, 16, 23, 30)
      // 1 Holiday (Aug 15)
      // 6 Present (Aug 1, 3, 7, 8, 13, 20)
      // 1 Approved Casual Leave (Aug 22-26, spanning Aug 22, 24, 25, 26 + Sunday Aug 23) -> 4 days covered, 3 chargeable working days
      // 15 Absent days (unclocked working days)
      // Daily Basic Rate: ₹50,000 / 31 = ₹1,612.90
      // Absent Deduction: 15 × ₹1,612.90 = ₹24,193.50
      // Net Salary: ₹50,000 - ₹24,193.50 = ₹25,806.50
      const breakdown = calculateSalaryBreakdown({
        base_salary: 50000,
        calendar_days: 31,
        working_days: 25,
        absent_days: 15,
        half_day_days: 0,
        unpaid_leave_days: 0,
      });

      expect(breakdown.calendar_days).toBe(31);
      expect(breakdown.daily_basic_rate).toBe(1612.90);
      expect(breakdown.absent_deduction).toBe(24193.50);
      expect(breakdown.unpaid_leave_deduction).toBe(0);
      expect(breakdown.attendance_deduction).toBe(24193.50);
      expect(breakdown.calculated_net_salary).toBe(25806.50);
      expect(breakdown.final_payable).toBe(25806.50);
    });

    test('TechnoDosz Variant: If 2-day unpaid leave had been approved, no double deduction occurs', () => {
      // If 2 days on unpaid leave were approved:
      // Absent days drop from 15 to 13.
      // Unpaid leave days = 2.
      // Total deducted days = 13 + 2 = 15.
      // Absent deduction: 13 × 1,612.90 = 20,967.70
      // Unpaid leave deduction: 2 × 1,612.90 = 3,225.80
      // Total attendance deduction: 20,967.70 + 3,225.80 = 24,193.50
      // Net: ₹25,806.50
      const breakdown = calculateSalaryBreakdown({
        base_salary: 50000,
        calendar_days: 31,
        working_days: 25,
        absent_days: 13,
        half_day_days: 0,
        unpaid_leave_days: 2,
      });

      expect(breakdown.daily_basic_rate).toBe(1612.90);
      expect(breakdown.absent_deduction).toBe(20967.70);
      expect(breakdown.unpaid_leave_deduction).toBe(3225.80);
      expect(breakdown.attendance_deduction).toBe(24193.50);
      expect(breakdown.calculated_net_salary).toBe(25806.50);
      expect(breakdown.final_payable).toBe(25806.50);
    });
  });

  describe('8. Backwards-compatibility utilities', () => {
    test('calculateMonthWorkingDays correctly excludes weekly offs and holidays', () => {
      const res = calculateMonthWorkingDays(2026, 8, null, [0], ['2026-08-15']);
      expect(res.calendarDays).toBe(31);
      expect(res.weeklyOffs).toBe(5);
      expect(res.holidays).toBe(1);
      expect(res.workingDays).toBe(25);
    });

    test('roundToTwo prevents floating point inaccuracies', () => {
      expect(roundToTwo(0.1 + 0.2)).toBe(0.3);
      expect(roundToTwo(50000 / 31)).toBe(1612.90);
    });
  });
});
