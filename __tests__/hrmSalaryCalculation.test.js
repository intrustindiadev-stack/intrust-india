import { calculateMonthWorkingDays, calculateSalaryBreakdown, roundToTwo } from '../lib/hrm/payroll';

describe('HRM Salary & Working-Day Calculation Business Rules', () => {
  describe('Working Days Calculation', () => {
    test('Rule 2 & 3: 31 calendar days with 4 Sundays = 27 working days', () => {
      // In May 2026: 31 days, 5 Sundays (3, 10, 17, 24, 31).
      // Let's test a month with 31 days and 4 Sundays (e.g. July 2026: July has 4 Sundays: 5, 12, 19, 26).
      const res = calculateMonthWorkingDays(2026, 7, null, [0], []);
      expect(res.calendarDays).toBe(31);
      expect(res.weeklyOffs).toBe(4);
      expect(res.holidays).toBe(0);
      expect(res.workingDays).toBe(27);
    });

    test('Prompt Example: September 2026 has 30 calendar days, 4 Sundays, 0 holidays = 26 working days', () => {
      // September 2026 has 30 days, Sundays on Sep 6, 13, 20, 27 (4 Sundays).
      const res = calculateMonthWorkingDays(2026, 9, null, [0], []);
      expect(res.calendarDays).toBe(30);
      expect(res.weeklyOffs).toBe(4);
      expect(res.holidays).toBe(0);
      expect(res.workingDays).toBe(26);
    });

    test('Rule 4: Configured holidays are not counted as working days and not absent', () => {
      // In August 2026, Independence Day is on 2026-08-15 (Saturday).
      // Sundays in August 2026: Aug 2, 9, 16, 23, 30 = 5 Sundays.
      const res = calculateMonthWorkingDays(2026, 8, null, [0], ['2026-08-15']);
      expect(res.calendarDays).toBe(31);
      expect(res.weeklyOffs).toBe(5);
      expect(res.holidays).toBe(1);
      expect(res.workingDays).toBe(25); // 31 - 5 - 1 = 25
    });

    test('Edge Case 12: Employee joining after beginning of month only counts working days from joining date', () => {
      // Employee joins on September 15, 2026.
      // Total days in Sep: 30. From Sep 15 to 30: 16 calendar days.
      // Sundays in that period: Sep 20, Sep 27 = 2 Sundays.
      const res = calculateMonthWorkingDays(2026, 9, '2026-09-15', [0], []);
      expect(res.calendarDays).toBe(30);
      expect(res.workingDays).toBe(14); // 16 - 2 = 14 working days
    });
  });

  describe('Salary Calculations & Deductions', () => {
    test('Rule 2 & 8: Daily basic salary is calculated strictly on working days', () => {
      const breakdown = calculateSalaryBreakdown({
        base_salary: 15000,
        working_days: 27,
        absent_days: 0,
        half_day_days: 0,
      });

      // 15000 / 27 = 555.5555... -> 555.56
      expect(breakdown.daily_basic_rate).toBe(555.56);
      expect(breakdown.attendance_deduction).toBe(0);
      expect(breakdown.calculated_net_salary).toBe(15000);
      expect(breakdown.final_payable).toBe(15000);
    });

    test('Rule 6, 7, 8: Full-day absent deducts 1 daily basic, half-day deducts 0.5 daily basic', () => {
      // Example from prompt:
      // Basic = ₹15,000, working days = 27, absent = 1, half day = 1
      const breakdown = calculateSalaryBreakdown({
        base_salary: 15000,
        working_days: 27,
        absent_days: 1,
        half_day_days: 1,
      });

      expect(breakdown.daily_basic_rate).toBe(555.56);
      expect(breakdown.absent_deduction).toBe(555.56);
      expect(breakdown.half_day_deduction).toBe(277.78);
      // 555.56 + 277.78 = 833.34
      expect(breakdown.attendance_deduction).toBe(833.34);
      // 15000 - 833.34 = 14166.66
      expect(breakdown.calculated_net_salary).toBe(14166.66);
      expect(breakdown.final_payable).toBe(14166.66);
    });

    test('Rule 9 & 10: HRA, standard allowances, incentives, and existing deductions remain separate', () => {
      const breakdown = calculateSalaryBreakdown({
        base_salary: 20000,
        hra: 5000,
        allowances: 3000,
        approved_incentives_rupees: 2500,
        existing_deductions: 1000,
        working_days: 26,
        absent_days: 2,
        half_day_days: 0,
      });

      // Daily basic: 20000 / 26 = 769.23
      expect(breakdown.daily_basic_rate).toBe(769.23);
      // 2 * 769.23 = 1538.46
      expect(breakdown.attendance_deduction).toBe(1538.46);
      // Gross: 20000 + 5000 + 3000 + 2500 = 30500
      expect(breakdown.gross_salary).toBe(30500);
      // Net: 30500 - 1538.46 (att) - 1000 (existing ded) = 27961.54
      expect(breakdown.calculated_net_salary).toBe(27961.54);
      expect(breakdown.final_payable).toBe(27961.54);
      expect(breakdown.total_deductions).toBe(2538.46);
    });

    test('Rule 11, 12, 13: Manual addition adjustment works with reason', () => {
      const breakdown = calculateSalaryBreakdown({
        base_salary: 20000,
        working_days: 26,
        absent_days: 0,
        half_day_days: 0,
        adjustment_type: 'addition',
        adjustment_amount: 1500,
        adjustment_reason: 'Special performance bonus',
      });

      expect(breakdown.calculated_net_salary).toBe(20000);
      expect(breakdown.adjustment_amount).toBe(1500);
      expect(breakdown.final_payable).toBe(21500);
      expect(breakdown.adjustment_reason).toBe('Special performance bonus');
    });

    test('Rule 11, 12, 13: Manual deduction adjustment works with reason', () => {
      const breakdown = calculateSalaryBreakdown({
        base_salary: 20000,
        working_days: 26,
        absent_days: 0,
        half_day_days: 0,
        adjustment_type: 'deduction',
        adjustment_amount: 800,
        adjustment_reason: 'Loan recovery',
      });

      expect(breakdown.calculated_net_salary).toBe(20000);
      expect(breakdown.adjustment_amount).toBe(800);
      expect(breakdown.final_payable).toBe(19200);
      expect(breakdown.total_deductions).toBe(800);
      expect(breakdown.adjustment_reason).toBe('Loan recovery');
    });

    test('Decimal safety: roundToTwo avoids floating-point precision issues', () => {
      expect(roundToTwo(0.1 + 0.2)).toBe(0.3);
      expect(roundToTwo(15000 / 27)).toBe(555.56);
      expect(roundToTwo(555.555 * 1.5)).toBe(833.33);
    });

    test('Part 9: Exact August 2026 TechnoDosz Scenario - 25 working days, 6 present, 15 absent', () => {
      // 31 calendar days - 5 Sundays - 1 holiday (Aug 15) = 25 working days.
      // Base: ₹50,000 -> Daily Basic Rate: ₹50,000 / 25 = ₹2,000.
      // 6 present + 4 approved leave on working days = 10 days paid in full.
      // 15 absent days -> 15 * ₹2,000 = ₹30,000 deduction.
      // Net: ₹50,000 - ₹30,000 = ₹20,000.
      const breakdown = calculateSalaryBreakdown({
        base_salary: 50000,
        working_days: 25,
        absent_days: 15,
        half_day_days: 0,
      });

      expect(breakdown.working_days).toBe(25);
      expect(breakdown.daily_basic_rate).toBe(2000);
      expect(breakdown.absent_deduction).toBe(30000);
      expect(breakdown.attendance_deduction).toBe(30000);
      expect(breakdown.calculated_net_salary).toBe(20000);
      expect(breakdown.final_payable).toBe(20000);
    });

    test('Part 9: Prompt Example Variant - 25 working days, 6 present, 5 leave (14 absent)', () => {
      // If 14 days absent:
      // 14 * ₹2,000 = ₹28,000 deduction.
      // Net: ₹50,000 - ₹28,000 = ₹22,000.
      const breakdown = calculateSalaryBreakdown({
        base_salary: 50000,
        working_days: 25,
        absent_days: 14,
        half_day_days: 0,
      });

      expect(breakdown.working_days).toBe(25);
      expect(breakdown.daily_basic_rate).toBe(2000);
      expect(breakdown.absent_deduction).toBe(28000);
      expect(breakdown.attendance_deduction).toBe(28000);
      expect(breakdown.calculated_net_salary).toBe(22000);
      expect(breakdown.final_payable).toBe(22000);
    });
  });

  describe('calculateApprovedLeaveWorkingDays', () => {
    const { calculateApprovedLeaveWorkingDays } = require('../lib/hrm/payroll');

    test('excludes Sundays and holidays from approved leave days', () => {
      // Leave from Saturday Aug 22 to Wednesday Aug 26 = 5 calendar days.
      // Aug 23 is Sunday.
      // Working days on leave should be 4 (Aug 22, 24, 25, 26).
      const count = calculateApprovedLeaveWorkingDays(
        [{ from_date: '2026-08-22', to_date: '2026-08-26' }],
        '2026-08-01',
        '2026-08-31',
        [0], // Sunday
        ['2026-08-15'] // Independence Day
      );

      expect(count).toBe(4);
    });

    test('handles leave that spans across month boundaries', () => {
      // Leave from Aug 28 to Sep 3
      const countAug = calculateApprovedLeaveWorkingDays(
        [{ from_date: '2026-08-28', to_date: '2026-09-03' }],
        '2026-08-01',
        '2026-08-31',
        [0],
        []
      );
      // Aug 28 (Fri), Aug 29 (Sat), Aug 30 (Sun - skip), Aug 31 (Mon) = 3 working days in August
      expect(countAug).toBe(3);
    });
  });
});
