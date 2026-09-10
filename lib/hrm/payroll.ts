/**
 * Authoritative Payroll, Attendance Classification & Salary Calculation Utilities for Intrust India HRM
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
  paid_leave: number;
  unpaid_leave: number;
  approved_leave?: number; // backwards compatibility
}

export interface DateClassificationDetail {
  date: string;
  dayOfWeek: number;
  classification:
    | 'present'
    | 'half_day'
    | 'absent'
    | 'paid_leave'
    | 'unpaid_leave'
    | 'weekly_off'
    | 'holiday'
    | 'prior_to_joining'
    | 'unclocked_future';
  isPaid: boolean;
  deductionDays: number; // 0, 0.5, or 1
  label: string;
}

export interface MonthlyClassificationResult {
  calendarDays: number;
  workingDays: number; // Informational (calendarDays - weeklyOffs - holidays on/after joining)
  weeklyOffs: number;
  holidays: number;
  presentDays: number;
  absentDays: number;
  halfDayDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  lateDays: number;
  priorToJoiningDays: number;
  unclockedFutureDays: number;
  dateDetails: Record<string, DateClassificationDetail>;
}

export interface SalaryBreakdownParams {
  base_salary: number;
  calendar_days?: number;
  working_days?: number; // Informational
  absent_days: number;
  half_day_days: number;
  unpaid_leave_days?: number;
  hra?: number;
  allowances?: number;
  approved_incentives_rupees?: number;
  existing_deductions?: number;
  adjustment_type?: 'addition' | 'deduction';
  adjustment_amount?: number;
  adjustment_reason?: string;
}

export interface SalaryBreakdownResult {
  base_salary: number;
  calendar_days: number;
  working_days: number;
  daily_basic_rate: number;
  absent_days: number;
  half_day_days: number;
  unpaid_leave_days: number;
  absent_deduction: number;
  half_day_deduction: number;
  unpaid_leave_deduction: number;
  attendance_deduction: number;
  gross_salary: number;
  hra: number;
  allowances: number;
  approved_incentives_rupees: number;
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
 * Calculates calendar days, informational working days, weekly offs, and holidays for a given month.
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
 * Authoritatively classifies every date of the month for an employee, strictly preventing
 * any double deductions between attendance, unpaid leave, paid leave, weekly offs, and holidays.
 *
 * Confirmed Rule:
 * Daily Basic Rate = Monthly Basic / Calendar Days
 * Weekly Offs, Holidays, Paid Leave, Present -> PAID (0 deduction)
 * Absent, Unpaid Leave -> 1 day deduction
 * Half Day -> 0.5 day deduction
 */
export function classifyMonthAttendanceAndLeaves(params: {
  year: number;
  month: number;
  joiningDateStr?: string | null;
  weeklyOffs?: number[];
  holidays?: string[];
  attendanceRecords?: Array<{ date?: string; work_date?: string; status: string }>;
  leaveRequests?: Array<{
    from_date: string;
    to_date: string;
    leave_type?: string;
    status: string;
    is_paid?: boolean;
    chargeable_days?: number;
  }>;
  completedUntilDateStr?: string | null;
}): MonthlyClassificationResult {
  const {
    year,
    month,
    joiningDateStr,
    weeklyOffs = [0],
    holidays = [],
    attendanceRecords = [],
    leaveRequests = [],
    completedUntilDateStr,
  } = params;

  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const holidaySet = new Set(holidays);
  const weeklyOffsSet = new Set(weeklyOffs);

  // Parse joining date bounds
  let joiningDay = 1;
  let hasJoinedBeforeMonth = true;
  let joinsInFutureMonth = false;

  if (joiningDateStr) {
    const jDate = new Date(joiningDateStr);
    if (jDate.getFullYear() === year && jDate.getMonth() + 1 === month) {
      joiningDay = Math.max(1, jDate.getDate());
      hasJoinedBeforeMonth = false;
    } else if (jDate > new Date(year, month - 1, totalDaysInMonth)) {
      joinsInFutureMonth = true;
    }
  }

  // Determine latest completed date for auto-absent logic
  // If not provided, fallback to yesterday in UTC/local or end of month if month is historical
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const targetMonthStart = new Date(year, month - 1, 1);

  let cutoffDateStr: string;
  if (completedUntilDateStr) {
    cutoffDateStr = completedUntilDateStr;
  } else if (targetMonthStart < currentMonthStart) {
    // Historical month has completely concluded
    cutoffDateStr = `${year}-${String(month).padStart(2, '0')}-${String(totalDaysInMonth).padStart(2, '0')}`;
  } else {
    // Current month: up to yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    cutoffDateStr = yesterday.toISOString().split('T')[0];
  }

  // Build lookup maps
  // Attendance records by normalized date
  const attRecordMap = new Map<string, string>();
  attendanceRecords.forEach((att) => {
    const d = att.work_date || att.date;
    if (d) {
      // If multiple records exist for same date, prioritize non-absent statuses
      const existing = attRecordMap.get(d);
      if (!existing || existing === 'absent') {
        attRecordMap.set(d, att.status);
      }
    }
  });

  // Only consider APPROVED leave requests for payroll
  const approvedLeaves = leaveRequests.filter((l) => l.status === 'approved');

  let workingDaysCount = 0;
  let weeklyOffsCount = 0;
  let holidaysCount = 0;
  let presentDays = 0;
  let absentDays = 0;
  let halfDayDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let lateDays = 0;
  let priorToJoiningDays = 0;
  let unclockedFutureDays = 0;

  const dateDetails: Record<string, DateClassificationDetail> = {};

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const currDate = new Date(year, month - 1, day);
    const dayOfWeek = currDate.getDay();

    const isPriorToJoining = joinsInFutureMonth || (!hasJoinedBeforeMonth && day < joiningDay);
    const isWeeklyOff = weeklyOffsSet.has(dayOfWeek);
    const isHoliday = holidaySet.has(dateStr);

    // Track informational working days for active employment period
    if (!isPriorToJoining) {
      if (isWeeklyOff) {
        weeklyOffsCount++;
      } else if (isHoliday) {
        holidaysCount++;
      } else {
        workingDaysCount++;
      }
    } else {
      if (isWeeklyOff) weeklyOffsCount++;
      else if (isHoliday) holidaysCount++;
    }

    // 1. Prior to joining date
    if (isPriorToJoining) {
      priorToJoiningDays++;
      dateDetails[dateStr] = {
        date: dateStr,
        dayOfWeek,
        classification: 'prior_to_joining',
        isPaid: false,
        deductionDays: 0,
        label: 'Prior to Joining',
      };
      continue;
    }

    // 2. Weekly Off (Sunday) - PAID, NEVER ABSENT
    if (isWeeklyOff) {
      dateDetails[dateStr] = {
        date: dateStr,
        dayOfWeek,
        classification: 'weekly_off',
        isPaid: true,
        deductionDays: 0,
        label: 'Weekly Off',
      };
      continue;
    }

    // 3. Configured Holiday - PAID, NEVER ABSENT
    if (isHoliday) {
      dateDetails[dateStr] = {
        date: dateStr,
        dayOfWeek,
        classification: 'holiday',
        isPaid: true,
        deductionDays: 0,
        label: 'Holiday',
      };
      continue;
    }

    // 4. Check Approved Leave Requests
    const coveringLeave = approvedLeaves.find((l) => l.from_date <= dateStr && l.to_date >= dateStr);

    if (coveringLeave) {
      const isUnpaid = coveringLeave.leave_type === 'unpaid' || coveringLeave.is_paid === false;
      const isHalfDay = coveringLeave.chargeable_days === 0.5;

      if (isUnpaid) {
        if (isHalfDay) {
          unpaidLeaveDays += 0.5;
          dateDetails[dateStr] = {
            date: dateStr,
            dayOfWeek,
            classification: 'unpaid_leave',
            isPaid: false,
            deductionDays: 0.5,
            label: 'Unpaid Leave (0.5 Day)',
          };
        } else {
          unpaidLeaveDays += 1;
          dateDetails[dateStr] = {
            date: dateStr,
            dayOfWeek,
            classification: 'unpaid_leave',
            isPaid: false,
            deductionDays: 1,
            label: 'Unpaid Leave',
          };
        }
      } else {
        // Paid Leave (casual, sick, earned, maternity, paternity)
        paidLeaveDays += 1;
        dateDetails[dateStr] = {
          date: dateStr,
          dayOfWeek,
          classification: 'paid_leave',
          isPaid: true,
          deductionDays: 0,
          label: 'Paid Leave',
        };
      }
      continue;
    }

    // 5. Check Attendance Record
    const attStatus = attRecordMap.get(dateStr);

    if (attStatus) {
      if (attStatus === 'present' || attStatus === 'wfh') {
        presentDays += 1;
        dateDetails[dateStr] = {
          date: dateStr,
          dayOfWeek,
          classification: 'present',
          isPaid: true,
          deductionDays: 0,
          label: attStatus === 'wfh' ? 'WFH' : 'Present',
        };
      } else if (attStatus === 'late') {
        presentDays += 1;
        lateDays += 1;
        dateDetails[dateStr] = {
          date: dateStr,
          dayOfWeek,
          classification: 'present',
          isPaid: true,
          deductionDays: 0,
          label: 'Late (Present)',
        };
      } else if (attStatus === 'half_day') {
        halfDayDays += 1;
        dateDetails[dateStr] = {
          date: dateStr,
          dayOfWeek,
          classification: 'half_day',
          isPaid: false, // 0.5 paid, 0.5 deducted
          deductionDays: 0.5,
          label: 'Half Day',
        };
      } else if (attStatus === 'absent') {
        absentDays += 1;
        dateDetails[dateStr] = {
          date: dateStr,
          dayOfWeek,
          classification: 'absent',
          isPaid: false,
          deductionDays: 1,
          label: 'Absent',
        };
      } else {
        // Default treat unmapped status as present
        presentDays += 1;
        dateDetails[dateStr] = {
          date: dateStr,
          dayOfWeek,
          classification: 'present',
          isPaid: true,
          deductionDays: 0,
          label: attStatus,
        };
      }
      continue;
    }

    // 6. Normal Chargeable Working Day with No Attendance Record
    if (dateStr <= cutoffDateStr) {
      // Past completed working day with no clock-in -> ABSENT
      absentDays += 1;
      dateDetails[dateStr] = {
        date: dateStr,
        dayOfWeek,
        classification: 'absent',
        isPaid: false,
        deductionDays: 1,
        label: 'Absent (No Attendance)',
      };
    } else {
      // Future day in current active month
      unclockedFutureDays += 1;
      dateDetails[dateStr] = {
        date: dateStr,
        dayOfWeek,
        classification: 'unclocked_future',
        isPaid: true,
        deductionDays: 0,
        label: 'Upcoming Day',
      };
    }
  }

  return {
    calendarDays: totalDaysInMonth,
    workingDays: workingDaysCount,
    weeklyOffs: weeklyOffsCount,
    holidays: holidaysCount,
    presentDays,
    absentDays,
    halfDayDays,
    paidLeaveDays,
    unpaidLeaveDays,
    lateDays,
    priorToJoiningDays,
    unclockedFutureDays,
    dateDetails,
  };
}

/**
 * Calculates authoritative salary breakdown and final net payable according to confirmed business rules.
 *
 * CONFIRMED BUSINESS RULES:
 * 1. Daily Basic Rate = Monthly Basic / Calendar Days (actual calendar days in that month: 28, 29, 30, or 31)
 * 2. Absent Deduction = Absent Days × Daily Basic Rate
 * 3. Unpaid Leave Deduction = Unpaid Leave Days × Daily Basic Rate
 * 4. Half-Day Deduction = Half Day Days × Daily Basic Rate × 0.5
 * 5. Weekly Offs, Holidays, and Approved Paid Leaves are PAID (0 deduction)
 * 6. Gross Salary = Basic + HRA + Allowances + Approved Incentives
 * 7. Total Deductions = Absent Deduction + Unpaid Leave Deduction + Half-Day Deduction + Existing Deductions (+ Manual Deduction if applicable)
 * 8. Net Salary = Gross Salary - Attendance Deduction - Existing Deductions (± Manual Adjustment)
 */
export function calculateSalaryBreakdown(params: SalaryBreakdownParams): SalaryBreakdownResult {
  const baseSalary = Math.max(0, Number(params.base_salary) || 0);
  const hra = Math.max(0, Number(params.hra) || 0);
  const allowances = Math.max(0, Number(params.allowances) || 0);
  const incentives = Math.max(0, Number(params.approved_incentives_rupees) || 0);
  const existingDeductions = Math.max(0, Number(params.existing_deductions) || 0);

  // Calendar days is the authoritative salary divisor
  const calendarDays = Math.max(1, Number(params.calendar_days || params.working_days) || 30);
  const workingDays = Math.max(0, Number(params.working_days) || 0);

  const absentDays = Math.max(0, Number(params.absent_days) || 0);
  const halfDayDays = Math.max(0, Number(params.half_day_days) || 0);
  const unpaidLeaveDays = Math.max(0, Number(params.unpaid_leave_days) || 0);

  // 1. Daily basic salary based strictly on calendar days of that month
  const dailyBasicRate = roundToTwo(baseSalary / calendarDays);

  // 2. Attendance & Unpaid Leave deductions apply strictly to basic salary
  const absentDeduction = roundToTwo(absentDays * dailyBasicRate);
  const halfDayDeduction = roundToTwo(halfDayDays * dailyBasicRate * 0.5);
  const unpaidLeaveDeduction = roundToTwo(unpaidLeaveDays * dailyBasicRate);
  const attendanceDeduction = roundToTwo(absentDeduction + halfDayDeduction + unpaidLeaveDeduction);

  // 3. Gross Salary = Basic + HRA + Standard Allowances + Approved Incentives
  const grossSalary = roundToTwo(baseSalary + hra + allowances + incentives);

  // 4. Calculated Net = Gross - Attendance/Unpaid Deductions - Existing Deductions
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
    calendar_days: calendarDays,
    working_days: workingDays,
    daily_basic_rate: dailyBasicRate,
    absent_days: absentDays,
    half_day_days: halfDayDays,
    unpaid_leave_days: unpaidLeaveDays,
    absent_deduction: absentDeduction,
    half_day_deduction: halfDayDeduction,
    unpaid_leave_deduction: unpaidLeaveDeduction,
    attendance_deduction: attendanceDeduction,
    gross_salary: grossSalary,
    hra,
    allowances,
    approved_incentives_rupees: incentives,
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
 * (Retained for backwards compatibility).
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

  leaves.forEach((l) => {
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
