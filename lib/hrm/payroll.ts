/**
 * Authoritative Payroll & Working Days Calculation Utilities for Intrust India HRM
 */

export interface MonthWorkingDaysResult {
  calendarDays: number;
  workingDays: number;
  weeklyOffs: number;
  holidays: number;
}

export interface AttendanceCounts {
  present: number;
  absent: number;
  half_day: number;
  late: number;
  approved_leave: number;
}

export interface SalaryBreakdownParams {
  base_salary: number;
  hra?: number;
  allowances?: number;
  approved_incentives_rupees?: number;
  existing_deductions?: number;
  working_days: number;
  absent_days: number;
  half_day_days: number;
  adjustment_type?: 'addition' | 'deduction';
  adjustment_amount?: number;
  adjustment_reason?: string;
}

export interface SalaryBreakdownResult {
  base_salary: number;
  hra: number;
  allowances: number;
  approved_incentives_rupees: number;
  working_days: number;
  daily_basic_rate: number;
  absent_days: number;
  half_day_days: number;
  absent_deduction: number;
  half_day_deduction: number;
  attendance_deduction: number;
  gross_salary: number;
  existing_deductions: number;
  calculated_net_salary: number;
  adjustment_type: 'addition' | 'deduction';
  adjustment_amount: number;
  adjustment_reason: string;
  final_payable: number;
  total_deductions: number;
}

/**
 * Rounds a number safely to 2 decimal places to avoid IEEE-754 floating-point drift.
 */
export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates actual chargeable working days, weekly offs, and holidays for a given month.
 * Standard weekly offs default to [0] (Sunday) per Intrust India business rules.
 */
export function calculateMonthWorkingDays(
  year: number,
  month: number, // 1-12
  joiningDateStr?: string | null,
  weeklyOffs: number[] = [0], // Default Sunday = 0
  holidays: string[] = [] // YYYY-MM-DD strings
): MonthWorkingDaysResult {
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const holidaySet = new Set(holidays);

  let startDate = 1;
  if (joiningDateStr) {
    const jDate = new Date(joiningDateStr);
    // If employee joined during this month, only count days on or after joining date
    if (jDate.getFullYear() === year && jDate.getMonth() + 1 === month) {
      startDate = Math.max(1, jDate.getDate());
    } else if (jDate > new Date(year, month - 1, totalDaysInMonth)) {
      // Joined in a future month
      return {
        calendarDays: totalDaysInMonth,
        workingDays: 0,
        weeklyOffs: 0,
        holidays: 0,
      };
    }
  }

  let weeklyOffsCount = 0;
  let holidaysCount = 0;
  let workingDaysCount = 0;

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const current = new Date(year, month - 1, day);
    const dayOfWeek = current.getDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const isWeeklyOff = weeklyOffs.includes(dayOfWeek);
    const isHoliday = holidaySet.has(dateStr);

    if (day >= startDate) {
      if (isWeeklyOff) {
        weeklyOffsCount++;
      } else if (isHoliday) {
        holidaysCount++;
      } else {
        workingDaysCount++;
      }
    } else {
      // Prior to joining date: still count weekly offs/holidays for full month calendar statistics if needed
      if (isWeeklyOff) weeklyOffsCount++;
      else if (isHoliday) holidaysCount++;
    }
  }

  return {
    calendarDays: totalDaysInMonth,
    workingDays: workingDaysCount,
    weeklyOffs: weeklyOffsCount,
    holidays: holidaysCount,
  };
}

/**
 * Calculates authoritative salary breakdown and final net payable according to confirmed business rules.
 */
export function calculateSalaryBreakdown(params: SalaryBreakdownParams): SalaryBreakdownResult {
  const baseSalary = Math.max(0, Number(params.base_salary) || 0);
  const hra = Math.max(0, Number(params.hra) || 0);
  const allowances = Math.max(0, Number(params.allowances) || 0);
  const incentives = Math.max(0, Number(params.approved_incentives_rupees) || 0);
  const existingDeductions = Math.max(0, Number(params.existing_deductions) || 0);
  const workingDays = Math.max(1, Number(params.working_days) || 1); // Avoid division by zero
  const absentDays = Math.max(0, Number(params.absent_days) || 0);
  const halfDayDays = Math.max(0, Number(params.half_day_days) || 0);

  // 1. Daily basic salary based on actual chargeable working days
  const dailyBasicRate = roundToTwo(baseSalary / workingDays);

  // 2. Attendance deductions apply strictly to basic salary
  const absentDeduction = roundToTwo(absentDays * dailyBasicRate);
  const halfDayDeduction = roundToTwo(halfDayDays * dailyBasicRate * 0.5);
  const attendanceDeduction = roundToTwo(absentDeduction + halfDayDeduction);

  // 3. Gross Salary = Basic + HRA + Standard Allowances + Approved Incentives
  const grossSalary = roundToTwo(baseSalary + hra + allowances + incentives);

  // 4. Calculated Net = Gross - Attendance Deduction - Existing Deductions
  const calculatedNet = Math.max(0, roundToTwo(grossSalary - attendanceDeduction - existingDeductions));

  // 5. Manual HR Adjustment
  const adjType = params.adjustment_type === 'deduction' ? 'deduction' : 'addition';
  const adjAmount = Math.max(0, Number(params.adjustment_amount) || 0);
  const adjReason = (params.adjustment_reason || '').trim();

  let finalPayable = calculatedNet;
  if (adjType === 'addition') {
    finalPayable = roundToTwo(calculatedNet + adjAmount);
  } else {
    finalPayable = Math.max(0, roundToTwo(calculatedNet - adjAmount));
  }

  const totalDeductions = roundToTwo(
    attendanceDeduction + existingDeductions + (adjType === 'deduction' ? adjAmount : 0)
  );

  return {
    base_salary: baseSalary,
    hra,
    allowances,
    approved_incentives_rupees: incentives,
    working_days: workingDays,
    daily_basic_rate: dailyBasicRate,
    absent_days: absentDays,
    half_day_days: halfDayDays,
    absent_deduction: absentDeduction,
    half_day_deduction: halfDayDeduction,
    attendance_deduction: attendanceDeduction,
    gross_salary: grossSalary,
    existing_deductions: existingDeductions,
    calculated_net_salary: calculatedNet,
    adjustment_type: adjType,
    adjustment_amount: adjAmount,
    adjustment_reason: adjReason,
    final_payable: finalPayable,
    total_deductions: totalDeductions,
  };
}

/**
 * Calculates the number of chargeable working days covered by approved leaves in a given date range.
 * Excludes weekly offs and configured holidays so that non-working days are not double-counted.
 */
export function calculateApprovedLeaveWorkingDays(
  leaves: Array<{ from_date: string; to_date: string }>,
  startDateStr: string,
  endDateStr: string,
  weeklyOffs: number[] = [0],
  holidays: string[] = []
): number {
  const holidaySet = new Set(holidays);
  const coveredWorkingDates = new Set<string>();

  leaves.forEach(l => {
    if (!l.from_date || !l.to_date) return;
    const start = l.from_date > startDateStr ? l.from_date : startDateStr;
    const end = l.to_date < endDateStr ? l.to_date : endDateStr;
    if (start > end) return;

    const [startYear, startMonth, startDay] = start.split('-').map(Number);
    const [endYear, endMonth, endDay] = end.split('-').map(Number);

    const curr = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const finalDate = new Date(Date.UTC(endYear, endMonth - 1, endDay));

    while (curr <= finalDate) {
      const dayOfWeek = curr.getUTCDay();
      const dateStr = curr.toISOString().split('T')[0];

      const isWeeklyOff = weeklyOffs.includes(dayOfWeek);
      const isHoliday = holidaySet.has(dateStr);

      if (!isWeeklyOff && !isHoliday) {
        coveredWorkingDates.add(dateStr);
      }
      curr.setUTCDate(curr.getUTCDate() + 1);
    }
  });

  return coveredWorkingDates.size;
}
