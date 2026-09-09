'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Download, Calendar as CalendarIcon, RefreshCw, Search, CheckCircle2, AlertCircle, TrendingUp, Users, DollarSign, ArrowLeft, Filter, ShieldCheck, Gift } from 'lucide-react';
import { downloadPayslip } from '@/lib/payslipGenerator';
import { calculateMonthWorkingDays, calculateApprovedLeaveWorkingDays } from '@/lib/hrm/payroll';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function AdminSalaryOverviewPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [employees, setEmployees] = useState([]);
  const [salaryMap, setSalaryMap] = useState({});
  const [lineItemsMap, setLineItemsMap] = useState({});
  const [attendanceMap, setAttendanceMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | processed | pending
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Reconcile unclocked working days for this month into attendance records
      try {
        await supabase.rpc('auto_mark_absent_attendance', {
          p_start_date: startDate,
          p_end_date: endDate,
        });
      } catch (e) {
        console.warn('Auto-absent reconciliation notice:', e?.message || e);
      }

      const [empRes, salRes, linesRes, attRes, holRes, polRes, leaveRes] = await Promise.all([
        supabase.from('user_profiles')
          .select('id, full_name, email, role, department, base_salary, joining_date')
          .in('role', [
            'employee', 'relationship_exec', 'relationship_manager', 'hr_manager',
            'freelancer', 'video_editor', 'social_media_manager',
            'seo_specialist', 'advertiser', 'support_agent'
          ])
          .order('full_name', { ascending: true }),
        supabase.from('salary_records')
          .select('*')
          .eq('month', month)
          .eq('year', year),
        supabase.from('payroll_line_items')
          .select('*'),
        supabase.from('attendance')
          .select('employee_id, status, date, work_date')
          .gte('date', startDate)
          .lte('date', endDate),
        supabase.from('holidays')
          .select('holiday_date')
          .gte('holiday_date', startDate)
          .lte('holiday_date', endDate)
          .eq('is_optional', false),
        supabase.from('organization_policy')
          .select('weekend_days')
          .limit(1)
          .maybeSingle(),
        supabase.from('leave_requests')
          .select('employee_id, from_date, to_date, status')
          .eq('status', 'approved')
          .lte('from_date', endDate)
          .gte('to_date', startDate),
      ]);

      const emps = empRes.data || [];
      const sals = salRes.data || [];
      const lines = linesRes.data || [];
      const atts = attRes.data || [];
      const holidays = (holRes.data || []).map(h => h.holiday_date);
      const weeklyOffs = polRes.data?.weekend_days || [0];
      const leaves = leaveRes.data || [];

      setEmployees(emps);

      const sMap = {};
      sals.forEach(s => { sMap[s.employee_id] = s; });
      setSalaryMap(sMap);

      // Group line items by salary_record_id
      const lMap = {};
      lines.forEach(item => {
        if (!lMap[item.salary_record_id]) lMap[item.salary_record_id] = [];
        lMap[item.salary_record_id].push(item);
      });
      setLineItemsMap(lMap);

      // Attendance statistics
      const aMap = {};
      emps.forEach(emp => {
        const workingData = calculateMonthWorkingDays(year, month, emp.joining_date, weeklyOffs, holidays);
        const empAtts = atts.filter(a => a.employee_id === emp.id);

        let pres = 0;
        let abs = 0;
        let hd = 0;

        empAtts.forEach(a => {
          if (a.status === 'present' || a.status === 'wfh') pres++;
          else if (a.status === 'absent') abs++;
          else if (a.status === 'half_day') hd++;
          else if (a.status === 'late') pres++;
        });

        const empLeaves = leaves.filter(l => l.employee_id === emp.id);
        const approvedLeaveCount = calculateApprovedLeaveWorkingDays(
          empLeaves,
          startDate,
          endDate,
          weeklyOffs,
          holidays
        );

        aMap[emp.id] = {
          ...workingData,
          present: pres,
          absent: abs,
          half_day: hd,
          approved_leave: approvedLeaveCount,
        };
      });
      setAttendanceMap(aMap);

    } catch (err) {
      console.error(err);
      toast.error('Failed to load payroll overview');
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived metrics and sums
  const metrics = useMemo(() => {
    let totalEmployees = employees.length;
    let processedCount = 0;
    let totalBasic = 0;
    let totalAttendanceDeductions = 0;
    let totalOtherDeductions = 0;
    let totalAdjustments = 0;
    let totalIncentives = 0;
    let totalNetPayable = 0;

    employees.forEach(emp => {
      const sal = salaryMap[emp.id];
      const att = attendanceMap[emp.id];
      const isProcessed = sal?.status === 'processed';

      const baseSalary = Number(sal?.base_salary || emp.base_salary || 0);
      totalBasic += baseSalary;

      if (isProcessed) {
        processedCount++;
        totalNetPayable += Number(sal.net_salary || 0);

        const recLines = sal?.id ? (lineItemsMap[sal.id] || []) : [];
        recLines.forEach(item => {
          const amtRupees = (item.amount_paise || 0) / 100;
          if (item.source_type === 'incentive') {
            totalIncentives += amtRupees;
          } else if (item.source_type === 'adjustment') {
            if (item.label.includes('+')) totalAdjustments += amtRupees;
            else totalAdjustments -= amtRupees;
          } else if (item.source_type === 'deduction') {
            if (item.label.toLowerCase().includes('attendance')) {
              totalAttendanceDeductions += amtRupees;
            } else {
              totalOtherDeductions += amtRupees;
            }
          }
        });
      } else if (att) {
        // Estimate expected attendance deduction for preview
        const dailyRate = att.workingDays > 0 ? (baseSalary / att.workingDays) : 0;
        const estDeduction = (att.absent * dailyRate) + (att.half_day * dailyRate * 0.5);
        totalAttendanceDeductions += estDeduction;
      }
    });

    return {
      totalEmployees,
      processedCount,
      pendingCount: totalEmployees - processedCount,
      totalBasic,
      totalAttendanceDeductions: Math.round(totalAttendanceDeductions),
      totalOtherDeductions: Math.round(totalOtherDeductions),
      totalAdjustments: Math.round(totalAdjustments),
      totalIncentives: Math.round(totalIncentives),
      totalNetPayable: Math.round(totalNetPayable),
    };
  }, [employees, salaryMap, lineItemsMap, attendanceMap]);

  // Filtering
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const sal = salaryMap[emp.id];
      const isProcessed = sal?.status === 'processed';

      if (statusFilter === 'processed' && !isProcessed) return false;
      if (statusFilter === 'pending' && isProcessed) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const nameMatch = (emp.full_name || '').toLowerCase().includes(q);
        const deptMatch = (emp.department || emp.role || '').toLowerCase().includes(q);
        return nameMatch || deptMatch;
      }

      return true;
    });
  }, [employees, salaryMap, statusFilter, searchTerm]);

  // Read-only payslip generation for Admin
  const handleDownloadPayslip = async (emp, sal) => {
    try {
      const toastId = toast.loading('Generating payslip PDF...');
      const recLines = sal?.id ? (lineItemsMap[sal.id] || []) : [];
      const attStats = attendanceMap[emp.id];

      const { download } = await downloadPayslip({
        employee: emp,
        salary: sal,
        lineItems: recLines,
        attendanceStats: attStats,
      });

      download();
      toast.success('Payslip downloaded successfully', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to download payslip: ' + err.message);
    }
  };

  const fmt = (v) => v !== undefined && v !== null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen bg-[#F8FAFC] font-[family-name:var(--font-outfit)]">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/hrm" className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Admin Salary &amp; Payroll Command</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 ml-7">
            Monthly workforce compensation breakdown, working days, attendance deductions, and payslips.
          </p>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto ml-7 sm:ml-0">
          <div className="flex items-center bg-white border border-gray-200 rounded-2xl px-3.5 py-2 shadow-2xs">
            <CalendarIcon size={16} className="text-gray-400 mr-2" />
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-gray-800 focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <span className="text-gray-300 mx-2">/</span>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-gray-800 focus:outline-none cursor-pointer"
            >
              {[year - 2, year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button
            onClick={fetchData}
            title="Refresh Payroll Data"
            className="p-2.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-800 shadow-2xs transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Read-Only Notice Badge */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-xs font-semibold text-blue-900">
        <ShieldCheck size={16} className="text-blue-600 shrink-0" />
        <span>
          <strong>Read-Only Administrative Overview:</strong> Operational salary processing and adjustments are handled by HR managers. Viewing this overview does not mutate payroll status.
        </span>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Workforce</p>
          <p className="text-2xl font-black text-gray-900 font-mono">{metrics.totalEmployees}</p>
          <p className="text-[11px] text-gray-500 mt-1">{metrics.processedCount} processed · {metrics.pendingCount} pending</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Basic Salary</p>
          <p className="text-2xl font-black text-gray-900 font-mono">₹{metrics.totalBasic.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-gray-500 mt-1">Contracted monthly baseline</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs">
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Attendance Deductions</p>
          <p className="text-2xl font-black text-rose-600 font-mono">-₹{metrics.totalAttendanceDeductions.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-gray-500 mt-1">Absences &amp; half-days</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-md">
          <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mb-1">Total Net Payable</p>
          <p className="text-2xl sm:text-3xl font-black font-mono">₹{metrics.totalNetPayable.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-emerald-100 mt-1">Processed disbursement</p>
        </div>
      </div>

      {/* Secondary Aggregations */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-3xl border border-slate-200/70 shadow-xs text-xs">
        <div>
          <span className="text-gray-400 block font-medium">Other Deductions</span>
          <span className="font-bold text-gray-800 font-mono text-sm">-₹{metrics.totalOtherDeductions.toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="text-gray-400 block font-medium">Net Adjustments</span>
          <span className={`font-bold font-mono text-sm ${metrics.totalAdjustments >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {metrics.totalAdjustments >= 0 ? '+' : ''}₹{metrics.totalAdjustments.toLocaleString('en-IN')}
          </span>
        </div>
        <div>
          <span className="text-gray-400 block font-medium">Total Incentives</span>
          <span className="font-bold text-indigo-600 font-mono text-sm">+₹{metrics.totalIncentives.toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="text-gray-400 block font-medium">Disbursement Status</span>
          <span className="font-bold text-gray-800 font-mono text-sm">
            {metrics.processedCount === metrics.totalEmployees && metrics.totalEmployees > 0 ? '100% Completed' : `${metrics.processedCount} / ${metrics.totalEmployees} Ready`}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search employee name or department..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-gray-200 shadow-2xs self-end sm:self-auto">
          {['all', 'processed', 'pending'].map(filter => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${statusFilter === filter ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-gray-400">Loading payroll overview data...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-16 text-center text-gray-400 text-sm">No payroll records match your criteria.</div>
        ) : (
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Employee</th>
                  <th className="py-3.5 px-3">Basic Salary</th>
                  <th className="py-3.5 px-3">Work Days</th>
                  <th className="py-3.5 px-3">Attendance</th>
                  <th className="py-3.5 px-3">Att. Deduction</th>
                  <th className="py-3.5 px-3">Other Ded.</th>
                  <th className="py-3.5 px-3">Adjustments</th>
                  <th className="py-3.5 px-3">Net Payable</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredEmployees.map(emp => {
                  const sal = salaryMap[emp.id];
                  const att = attendanceMap[emp.id];
                  const isProcessed = sal?.status === 'processed';
                  const recLines = sal?.id ? (lineItemsMap[sal.id] || []) : [];

                  // Calculate line item breakdowns
                  let attDeductionAmt = 0;
                  let otherDeductionAmt = 0;
                  let adjAmt = 0;

                  recLines.forEach(item => {
                    const val = (item.amount_paise || 0) / 100;
                    if (item.source_type === 'deduction') {
                      if (item.label.toLowerCase().includes('attendance')) attDeductionAmt += val;
                      else otherDeductionAmt += val;
                    } else if (item.source_type === 'adjustment') {
                      if (item.label.includes('+')) adjAmt += val;
                      else adjAmt -= val;
                    }
                  });

                  if (!isProcessed && att) {
                    const daily = att.workingDays > 0 ? ((sal?.base_salary || emp.base_salary || 0) / att.workingDays) : 0;
                    attDeductionAmt = (att.absent * daily) + (att.half_day * daily * 0.5);
                  }

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Employee Info */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {(emp.full_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-xs sm:text-sm">{emp.full_name}</p>
                            <p className="text-[10px] text-gray-400 capitalize">{emp.department || emp.role?.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                      </td>

                      {/* Basic */}
                      <td className="py-3.5 px-3 font-mono font-bold text-gray-800">
                        {fmt(sal?.base_salary || emp.base_salary)}
                      </td>

                      {/* Working Days */}
                      <td className="py-3.5 px-3 font-mono text-gray-600">
                        {att?.workingDays || '—'}
                      </td>

                      {/* Attendance Breakdown */}
                      <td className="py-3.5 px-3 font-mono">
                        {att ? (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-emerald-600 font-bold" title="Present">{att.present}P</span>
                            <span className="text-gray-300">/</span>
                            <span className="text-rose-600 font-bold" title="Absent">{att.absent}A</span>
                            {att.half_day > 0 && (
                              <>
                                <span className="text-gray-300">/</span>
                                <span className="text-violet-600 font-bold" title="Half-Day">{att.half_day}HD</span>
                              </>
                            )}
                          </div>
                        ) : '—'}
                      </td>

                      {/* Attendance Deduction */}
                      <td className="py-3.5 px-3 font-mono text-rose-600">
                        {attDeductionAmt > 0 ? `-₹${Math.round(attDeductionAmt).toLocaleString('en-IN')}` : '₹0'}
                      </td>

                      {/* Other Deductions */}
                      <td className="py-3.5 px-3 font-mono text-gray-500">
                        {otherDeductionAmt > 0 ? `-₹${Math.round(otherDeductionAmt).toLocaleString('en-IN')}` : '₹0'}
                      </td>

                      {/* Adjustments */}
                      <td className="py-3.5 px-3 font-mono">
                        {adjAmt !== 0 ? (
                          <span className={adjAmt > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                            {adjAmt > 0 ? '+' : ''}₹{Math.round(adjAmt).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-gray-400">₹0</span>
                        )}
                      </td>

                      {/* Net Payable */}
                      <td className="py-3.5 px-3 font-mono font-black text-gray-900 text-sm">
                        {isProcessed ? fmt(sal?.net_salary) : '—'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        {isProcessed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 size={12} /> Processed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <AlertCircle size={12} /> Pending
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        {isProcessed ? (
                          <button
                            onClick={() => handleDownloadPayslip(emp, sal)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-100"
                          >
                            <Download size={13} /> Payslip
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
