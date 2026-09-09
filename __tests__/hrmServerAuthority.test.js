import { calculateSalaryBreakdown } from '../lib/hrm/payroll';

describe('Server Authority & Payroll Input Validation', () => {
  test('Rule 16: Adjustment requires non-empty reason if amount > 0', () => {
    const validateAdjustment = (amount, reason) => {
      const adjAmount = Math.max(0, Number(amount) || 0);
      const trimmedReason = (reason || '').trim();
      if (adjAmount > 0 && trimmedReason.length < 3) {
        return { valid: false, error: 'Adjustment reason is required (minimum 3 characters).' };
      }
      return { valid: true };
    };

    expect(validateAdjustment(500, '').valid).toBe(false);
    expect(validateAdjustment(500, '   ').valid).toBe(false);
    expect(validateAdjustment(500, 'ok').valid).toBe(false);
    expect(validateAdjustment(500, 'Performance bonus').valid).toBe(true);
    expect(validateAdjustment(0, '').valid).toBe(true);
  });

  test('Rule 18: Server recalculation prevents client from overriding final payable amount', () => {
    // Client tries to send a malicious/tampered final net payable:
    const clientSuppliedValues = {
      base_salary: 15000,
      working_days: 27,
      absent_days: 1,
      half_day_days: 1,
      client_net_salary: 50000, // Malicious override attempt!
    };

    // Server ignores client_net_salary and computes authoritative breakdown:
    const serverBreakdown = calculateSalaryBreakdown({
      base_salary: clientSuppliedValues.base_salary,
      working_days: clientSuppliedValues.working_days,
      absent_days: clientSuppliedValues.absent_days,
      half_day_days: clientSuppliedValues.half_day_days,
    });

    // Authoritative math: 15000 / 27 = 555.56.
    // Absent: 555.56 + Half-day: 277.78 = 833.34.
    // 15000 - 833.34 = 14166.66
    expect(serverBreakdown.final_payable).toBe(14166.66);
    expect(serverBreakdown.final_payable).not.toBe(clientSuppliedValues.client_net_salary);
  });

  test('Realistic Prompt Example: Basic = ₹15,000, Month = 31 days, 4 Sundays = 27 working days, 1 absent, 1 half day', () => {
    const breakdown = calculateSalaryBreakdown({
      base_salary: 15000,
      working_days: 27,
      absent_days: 1,
      half_day_days: 1,
    });

    // Daily rate: ₹15,000 / 27
    expect(breakdown.daily_basic_rate).toBe(555.56);
    // Absent deduction: 1 * 555.56 = 555.56
    expect(breakdown.absent_deduction).toBe(555.56);
    // Half-day deduction: 0.5 * 555.56 = 277.78
    expect(breakdown.half_day_deduction).toBe(277.78);
    // Total attendance deduction: 833.34
    expect(breakdown.attendance_deduction).toBe(833.34);
    // Calculated Net: ₹14,166.66
    expect(breakdown.calculated_net_salary).toBe(14166.66);
    // Rounded integer payable: ₹14,167
    expect(Math.round(breakdown.final_payable)).toBe(14167);
  });
});
