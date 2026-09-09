import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { calculateMonthWorkingDays, calculateSalaryBreakdown, calculateApprovedLeaveWorkingDays, roundToTwo } from '@/lib/hrm/payroll';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { user, profile, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const callerRole = profile?.role;
    if (!['hr_manager', 'admin', 'super_admin'].includes(callerRole)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to process salary', code: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json();
    const {
      employee_id,
      month,
      year,
      base_salary: inputBaseSalary,
      hra: inputHra = 0,
      allowances: inputAllowances = 0,
      existing_deductions: inputExistingDeductions = 0,
      adjustment_type = 'addition',
      adjustment_amount = 0,
      adjustment_reason = '',
    } = body;

    if (!employee_id || !month || !year) {
      return NextResponse.json({
        error: 'Missing required fields: employee_id, month, and year are required.',
        code: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    const parsedMonth = parseInt(month, 10);
    const parsedYear = parseInt(year, 10);
    if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return NextResponse.json({ error: 'Invalid month. Must be between 1 and 12.', code: 'INVALID_MONTH' }, { status: 400 });
    }
    if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      return NextResponse.json({ error: 'Invalid year.', code: 'INVALID_YEAR' }, { status: 400 });
    }

    const adjAmount = Math.max(0, Number(adjustment_amount) || 0);
    const trimmedReason = (adjustment_reason || '').trim();
    if (adjAmount > 0 && trimmedReason.length < 3) {
      return NextResponse.json({
        error: 'Adjustment reason is required (minimum 3 characters) when adjustment amount is greater than 0.',
        code: 'REASON_REQUIRED',
      }, { status: 400 });
    }

    // 1. Fetch employee profile
    const { data: employee, error: empErr } = await admin
      .from('user_profiles')
      .select('id, full_name, email, role, department, base_salary, joining_date, is_suspended')
      .eq('id', employee_id)
      .single();

    if (empErr || !employee) {
      return NextResponse.json({ error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 });
    }

    if (employee.is_suspended) {
      return NextResponse.json({ error: 'Cannot process salary for a suspended employee.', code: 'EMPLOYEE_SUSPENDED' }, { status: 400 });
    }

    // 2. Fetch organization policy
    const { data: policy } = await admin
      .from('organization_policy')
      .select('weekend_days, timezone')
      .limit(1)
      .maybeSingle();

    const weeklyOffs = policy?.weekend_days || [0];

    // 3. Month date range
    const startDate = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(parsedYear, parsedMonth, 0).getDate();
    const endDate = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // 4. Fetch holidays in month
    const { data: holidaysData } = await admin
      .from('holidays')
      .select('holiday_date')
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate)
      .eq('is_optional', false);

    const holidays = (holidaysData || []).map(h => h.holiday_date);

    // 5. Authoritatively compute month working days
    const workingDaysResult = calculateMonthWorkingDays(
      parsedYear,
      parsedMonth,
      employee.joining_date,
      weeklyOffs,
      holidays
    );

    // 5b. Reconcile all completed chargeable working days in the month into attendance records
    try {
      await admin.rpc('auto_mark_absent_attendance', {
        p_start_date: startDate,
        p_end_date: endDate,
      });
    } catch (rpcErr) {
      console.warn('[API] Auto-absent reconciliation notice:', rpcErr?.message || rpcErr);
    }

    // 6. Fetch actual attendance records for this employee in month
    const { data: attData } = await admin
      .from('attendance')
      .select('status, date, work_date')
      .eq('employee_id', employee_id)
      .or(`work_date.gte.${startDate},date.gte.${startDate}`)
      .or(`work_date.lte.${endDate},date.lte.${endDate}`);

    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let lateCount = 0;

    (attData || []).forEach(a => {
      // Ensure the record actually falls inside the month window
      const d = a.work_date || a.date;
      if (d >= startDate && d <= endDate) {
        if (a.status === 'present' || a.status === 'wfh') presentCount++;
        else if (a.status === 'absent') absentCount++;
        else if (a.status === 'half_day') halfDayCount++;
        else if (a.status === 'late') {
          lateCount++;
          presentCount++; // Late counts as present with a late flag
        }
      }
    });

    // 6b. Fetch approved leaves for this employee in month and compute chargeable working days on leave
    const { data: approvedLeavesData } = await admin
      .from('leave_requests')
      .select('from_date, to_date')
      .eq('employee_id', employee_id)
      .eq('status', 'approved')
      .lte('from_date', endDate)
      .gte('to_date', startDate);

    const approvedLeaveWorkingDays = calculateApprovedLeaveWorkingDays(
      approvedLeavesData || [],
      startDate,
      endDate,
      weeklyOffs,
      holidays
    );

    // 7. Fetch approved incentives for this employee in this month
    const { data: approvedIncs } = await admin
      .from('incentive_allocations')
      .select(`
        id, batch_id, employee_id, amount_paise, status,
        batch:incentive_batches ( incentive_type, description, payroll_month, payroll_year )
      `)
      .eq('employee_id', employee_id)
      .eq('status', 'approved');

    const relevantIncentives = (approvedIncs || []).filter(alloc => {
      // If allocation has specific payroll month/year, match it; otherwise apply to active processing
      const batchMonth = alloc.batch?.payroll_month;
      const batchYear = alloc.batch?.payroll_year;
      if (batchMonth && batchYear) {
        return batchMonth === parsedMonth && batchYear === parsedYear;
      }
      return true;
    });

    const totalIncentivesPaise = relevantIncentives.reduce((sum, i) => sum + (i.amount_paise || 0), 0);
    const totalIncentivesRupees = roundToTwo(totalIncentivesPaise / 100);

    // 8. Check existing salary record for locking status
    const { data: existingSalRec } = await admin
      .from('salary_records')
      .select('*')
      .eq('employee_id', employee_id)
      .eq('month', parsedMonth)
      .eq('year', parsedYear)
      .maybeSingle();

    if (existingSalRec?.status === 'finalized') {
      return NextResponse.json({
        error: 'Salary record is already finalized and cannot be modified.',
        code: 'RECORD_FINALIZED',
      }, { status: 400 });
    }

    // 9. Authoritative salary breakdown calculation
    const authoritativeBaseSalary = inputBaseSalary !== undefined ? Number(inputBaseSalary) : (employee.base_salary || 0);

    const breakdown = calculateSalaryBreakdown({
      base_salary: authoritativeBaseSalary,
      hra: Number(inputHra) || 0,
      allowances: Number(inputAllowances) || 0,
      approved_incentives_rupees: totalIncentivesRupees,
      existing_deductions: Number(inputExistingDeductions) || 0,
      working_days: workingDaysResult.workingDays,
      absent_days: absentCount,
      half_day_days: halfDayCount,
      adjustment_type: adjustment_type === 'deduction' ? 'deduction' : 'addition',
      adjustment_amount: adjAmount,
      adjustment_reason: trimmedReason,
    });

    // 10. Upsert into salary_records
    const payload = {
      employee_id,
      month: parsedMonth,
      year: parsedYear,
      base_salary: Math.round(breakdown.base_salary),
      hra: Math.round(breakdown.hra),
      allowances: Math.round(
        breakdown.allowances +
        breakdown.approved_incentives_rupees +
        (breakdown.adjustment_type === 'addition' ? breakdown.adjustment_amount : 0)
      ),
      deductions: Math.round(breakdown.total_deductions),
      net_salary: Math.round(breakdown.final_payable),
      status: 'processed',
      processed_at: new Date().toISOString(),
    };

    if (existingSalRec?.id) {
      payload.id = existingSalRec.id;
    }

    const { data: salRec, error: salErr } = await admin
      .from('salary_records')
      .upsert(payload, { onConflict: 'employee_id,month,year' })
      .select()
      .single();

    if (salErr) {
      console.error('[API] Salary Process DB Error:', salErr);
      return NextResponse.json({ error: salErr.message || 'Failed to save salary record', code: 'DB_ERROR' }, { status: 500 });
    }

    // 11. Manage payroll_line_items
    // Delete non-incentive line items previously created for this record
    await admin
      .from('payroll_line_items')
      .delete()
      .eq('salary_record_id', salRec.id)
      .neq('source_type', 'incentive');

    // Attendance Deduction Line Item
    if (breakdown.attendance_deduction > 0) {
      await admin.from('payroll_line_items').insert({
        salary_record_id: salRec.id,
        employee_id,
        source_type: 'deduction',
        source_id: crypto.randomUUID(),
        label: `Attendance Deduction (${breakdown.absent_days} absent, ${breakdown.half_day_days} half-day)`,
        amount_paise: Math.round(breakdown.attendance_deduction * 100),
        taxable: false,
      });
    }

    // Other / Existing Deductions Line Item
    if (breakdown.existing_deductions > 0) {
      await admin.from('payroll_line_items').insert({
        salary_record_id: salRec.id,
        employee_id,
        source_type: 'deduction',
        source_id: crypto.randomUUID(),
        label: 'Other Deductions',
        amount_paise: Math.round(breakdown.existing_deductions * 100),
        taxable: false,
      });
    }

    // Manual Adjustment Line Item
    if (breakdown.adjustment_amount > 0) {
      const signLabel = breakdown.adjustment_type === 'addition' ? '+' : '-';
      await admin.from('payroll_line_items').insert({
        salary_record_id: salRec.id,
        employee_id,
        source_type: 'adjustment',
        source_id: crypto.randomUUID(),
        label: `Adjustment (${signLabel}): ${breakdown.adjustment_reason}`,
        amount_paise: Math.round(breakdown.adjustment_amount * 100),
        taxable: breakdown.adjustment_type === 'addition',
      });
    }

    // Incentive Line Items and mark allocations paid
    if (relevantIncentives.length > 0) {
      for (const alloc of relevantIncentives) {
        const typeLabel = alloc.batch?.incentive_type
          ? alloc.batch.incentive_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          : 'Incentive Award';

        const { data: lineItem, error: lineErr } = await admin
          .from('payroll_line_items')
          .upsert({
            salary_record_id: salRec.id,
            employee_id,
            source_type: 'incentive',
            source_id: alloc.id,
            label: `${typeLabel} (${alloc.batch?.description || 'Bonus'})`,
            amount_paise: alloc.amount_paise,
            taxable: true,
          }, { onConflict: 'salary_record_id,source_type,source_id' })
          .select()
          .single();

        if (!lineErr && lineItem) {
          await admin
            .from('incentive_allocations')
            .update({
              status: 'paid',
              salary_record_id: salRec.id,
              payroll_line_item_id: lineItem.id,
              paid_at: new Date().toISOString(),
            })
            .eq('id', alloc.id);

          // Mark batch as paid if all allocations paid
          if (alloc.batch_id) {
            const { data: siblings } = await admin
              .from('incentive_allocations')
              .select('status')
              .eq('batch_id', alloc.batch_id);

            const allPaid = (siblings || []).every(s => s.status === 'paid');
            if (allPaid) {
              await admin
                .from('incentive_batches')
                .update({
                  status: 'paid',
                  paid_by: user.id,
                  paid_at: new Date().toISOString(),
                })
                .eq('id', alloc.batch_id);
            }
          }
        }
      }
    }

    // 12. Audit Log
    await admin.from('audit_logs_hrm').insert({
      actor_id: user.id,
      actor_name: profile?.full_name || 'HR Manager',
      action: 'Salary processed',
      table_name: 'salary_records',
      record_id: salRec.id,
      old_data: existingSalRec || null,
      new_data: {
        payload,
        breakdown,
        workingDaysResult,
        attendanceCounts: {
          present: presentCount,
          absent: absentCount,
          half_day: halfDayCount,
          late: lateCount,
          approved_leave: approvedLeaveWorkingDays,
        },
      },
      module: 'Payroll',
      severity: 'high',
    });

    return NextResponse.json({
      success: true,
      message: `Salary processed successfully for ${employee.full_name}`,
      salary_record: salRec,
      breakdown,
      attendance: {
        ...workingDaysResult,
        present: presentCount,
        absent: absentCount,
        half_day: halfDayCount,
        late: lateCount,
        approved_leave: approvedLeaveWorkingDays,
      },
    }, { status: 200 });
  } catch (err) {
    console.error('[API] Process Salary Fatal Error:', err);
    return NextResponse.json({
      error: err.message || 'Internal Server Error',
      code: 'SERVER_ERROR',
    }, { status: 500 });
  }
}
