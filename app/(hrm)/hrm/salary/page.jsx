'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Calculator, CheckCircle2, AlertCircle, RefreshCw, TrendingUp, Users, X, Save, Gift, Calendar as CalendarIcon, ChevronRight, ArrowRight, CircleDashed, Plus, Minus, Info } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadPayslip } from '@/lib/payslipGenerator';
import { formatPaiseToINR, INCENTIVE_TYPE_LABELS } from '@/lib/hrm/incentives';
import { calculateMonthWorkingDays, calculateSalaryBreakdown, calculateApprovedLeaveWorkingDays, roundToTwo } from '@/lib/hrm/payroll';
import Link from 'next/link';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function ProcessModal({ record, approvedIncentives = [], attendanceStats = null, onClose, onSave }) {
  const totalApprovedIncentivesPaise = approvedIncentives.reduce((acc, i) => acc + (i.amount_paise || 0), 0);
  const totalApprovedIncentivesRupees = roundToTwo(totalApprovedIncentivesPaise / 100);

  const workingDays = attendanceStats?.workingDays || 26;
  const calendarDays = attendanceStats?.calendarDays || 30;
  const weeklyOffs = attendanceStats?.weeklyOffs || 4;
  const holidays = attendanceStats?.holidays || 0;
  const presentDays = attendanceStats?.present || 0;
  const absentDays = attendanceStats?.absent || 0;
  const halfDayDays = attendanceStats?.half_day || 0;
  const lateDays = attendanceStats?.late || 0;
  const approvedLeaveDays = attendanceStats?.approved_leave || 0;

  const [form, setForm] = useState({
    base_salary: record?.base_salary || 0,
    hra: record?.hra || 0,
    allowances: record?.allowances || 0,
    existing_deductions: record?.other_deductions !== undefined ? record.other_deductions : (record?.salary_id ? record?.deductions || 0 : 0),
    adjustment_type: 'addition',
    adjustment_amount: 0,
    adjustment_reason: '',
  });

  const [saving, setSaving] = useState(false);
  const up = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Real-time calculation preview matching authoritative formula
  const previewBreakdown = calculateSalaryBreakdown({
    base_salary: Number(form.base_salary) || 0,
    hra: Number(form.hra) || 0,
    allowances: Number(form.allowances) || 0,
    approved_incentives_rupees: totalApprovedIncentivesRupees,
    existing_deductions: Number(form.existing_deductions) || 0,
    working_days: workingDays,
    absent_days: absentDays,
    half_day_days: halfDayDays,
    adjustment_type: form.adjustment_type,
    adjustment_amount: Number(form.adjustment_amount) || 0,
    adjustment_reason: form.adjustment_reason,
  });

  const handleProcess = async () => {
    if (previewBreakdown.adjustment_amount > 0 && previewBreakdown.adjustment_reason.trim().length < 3) {
      toast.error('Adjustment reason is required (min 3 chars).');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/hrm/salary/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: record.id,
          month: record.month,
          year: record.year,
          base_salary: Number(form.base_salary || 0),
          hra: Number(form.hra || 0),
          allowances: Number(form.allowances || 0),
          existing_deductions: Number(form.existing_deductions || 0),
          adjustment_type: form.adjustment_type,
          adjustment_amount: Number(form.adjustment_amount || 0),
          adjustment_reason: form.adjustment_reason,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to process salary');
      }

      toast.success(`Salary processed for ${record.full_name}`);
      onSave(record.id, {
        ...result.salary_record,
        other_deductions: Number(form.existing_deductions || 0),
        breakdown: result.breakdown,
      });
      onClose();
    } catch (err) {
      toast.error(err.message || 'Processing failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 font-[family-name:var(--font-outfit)]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Process Salary</h3>
            <p className="text-xs text-gray-500 font-medium">{record?.full_name} · {record?.department || record?.role} · {MONTHS[record?.month - 1]} {record?.year}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={18} className="text-gray-500" /></button>
        </div>

        {/* Modal Body - Fully Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 pb-28 sm:pb-6">
          
          {/* Section 1: Salary Details */}
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span>1.</span> Salary Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Basic Salary (₹)</label>
                <input
                  type="number"
                  value={form.base_salary}
                  onChange={e => up('base_salary', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">HRA (₹)</label>
                <input
                  type="number"
                  value={form.hra}
                  onChange={e => up('hra', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Standard Allowances (₹)</label>
                <input
                  type="number"
                  value={form.allowances}
                  onChange={e => up('allowances', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Existing Deductions (₹)</label>
                <input
                  type="number"
                  value={form.existing_deductions}
                  onChange={e => up('existing_deductions', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Approved Incentives (if any) */}
          {approvedIncentives.length > 0 && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-indigo-950">
                <span className="flex items-center gap-1.5"><Gift size={14} className="text-indigo-600" /> Approved Incentives ({approvedIncentives.length})</span>
                <span className="font-mono text-indigo-700 font-black">+₹{totalApprovedIncentivesRupees.toLocaleString('en-IN')}</span>
              </div>
              <div className="space-y-1">
                {approvedIncentives.map(alloc => (
                  <div key={alloc.id} className="flex justify-between items-center bg-white px-2.5 py-1.5 rounded-lg border border-indigo-100 text-xs">
                    <span className="text-indigo-900">{INCENTIVE_TYPE_LABELS[alloc.batch?.incentive_type] || 'Bonus'}</span>
                    <span className="font-bold font-mono text-indigo-800">{formatPaiseToINR(alloc.amount_paise)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Attendance Summary */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex justify-between items-center">
              <p className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarIcon size={14} className="text-slate-500" /> Attendance Summary
              </p>
              <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {calendarDays} Calendar Days
              </span>
            </div>

            {/* Attendance Stat Grid */}
            <div className="grid grid-cols-2 min-[360px]:grid-cols-4 gap-2 text-center">
              <div className="bg-emerald-100/70 text-emerald-900 rounded-xl p-2 border border-emerald-200/60">
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Present</p>
                <p className="text-base font-black font-mono">{presentDays}</p>
              </div>
              <div className="bg-rose-100/70 text-rose-900 rounded-xl p-2 border border-rose-200/60">
                <p className="text-[9px] font-bold uppercase tracking-wider text-rose-700">Absent</p>
                <p className="text-base font-black font-mono">{absentDays}</p>
              </div>
              <div className="bg-violet-100/70 text-violet-900 rounded-xl p-2 border border-violet-200/60">
                <p className="text-[9px] font-bold uppercase tracking-wider text-violet-700">Half Day</p>
                <p className="text-base font-black font-mono">{halfDayDays}</p>
              </div>
              <div className="bg-amber-100/70 text-amber-900 rounded-xl p-2 border border-amber-200/60">
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700">Late</p>
                <p className="text-base font-black font-mono">{lateDays}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-slate-200/70">
              <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                <p className="text-[9px] text-gray-500 font-semibold uppercase">Working Days</p>
                <p className="font-bold text-gray-900 font-mono">{workingDays}</p>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                <p className="text-[9px] text-gray-500 font-semibold uppercase">Weekly Offs</p>
                <p className="font-bold text-gray-900 font-mono">{weeklyOffs}</p>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                <p className="text-[9px] text-gray-500 font-semibold uppercase">Holidays</p>
                <p className="font-bold text-gray-900 font-mono">{holidays}</p>
              </div>
            </div>

            {approvedLeaveDays > 0 && (
              <p className="text-[10px] font-bold text-indigo-700 bg-indigo-50 p-1.5 rounded-lg border border-indigo-100">
                Approved Leave: {approvedLeaveDays} day(s) covered by policy.
              </p>
            )}
          </div>

          {/* Section 4: Calculation Breakdown */}
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Salary Calculation</p>
            <div className="space-y-1.5 text-xs text-gray-700">
              <div className="flex justify-between items-center">
                <span>Daily Basic Rate:</span>
                <span className="font-mono font-bold">₹{previewBreakdown.daily_basic_rate.toFixed(2)} <span className="text-[10px] text-gray-400 font-normal">({previewBreakdown.base_salary} / {workingDays})</span></span>
              </div>
              <div className="flex justify-between items-center text-rose-600">
                <span>Attendance Deduction:</span>
                <span className="font-mono font-bold">-₹{previewBreakdown.attendance_deduction.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500 text-[11px] pl-2 border-l-2 border-rose-200">
                <span>{absentDays} absent × ₹{previewBreakdown.daily_basic_rate.toFixed(2)} + {halfDayDays} half-day × ₹{(previewBreakdown.daily_basic_rate * 0.5).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-200 font-semibold">
                <span>Calculated Net Payable:</span>
                <span className="font-mono font-bold text-gray-900">₹{previewBreakdown.calculated_net_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Section 5: Manual Adjustment */}
          <div className="p-3.5 bg-amber-50/60 border border-amber-200/70 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-[11px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>5.</span> Manual Adjustment
              </p>
              <div className="flex gap-1 bg-white p-1 rounded-xl border border-amber-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => up('adjustment_type', 'addition')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${form.adjustment_type === 'addition' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Plus size={12} /> Addition
                </button>
                <button
                  type="button"
                  onClick={() => up('adjustment_type', 'deduction')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${form.adjustment_type === 'deduction' ? 'bg-rose-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Minus size={12} /> Deduction
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">Adjustment Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={form.adjustment_amount}
                  onChange={e => up('adjustment_amount', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">Reason (Required if amount &gt; 0)</label>
                <input
                  type="text"
                  value={form.adjustment_reason}
                  onChange={e => up('adjustment_reason', e.target.value)}
                  placeholder="e.g., Performance award, advance recovery"
                  className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Final Net Payable */}
          <div className="bg-emerald-50 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border border-emerald-200 shadow-xs">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Final Net Payable</span>
              <p className="text-[10px] text-emerald-600 mt-0.5">Authoritative amount to be credited</p>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
              ₹{Math.round(previewBreakdown.final_payable).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleProcess}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-md shadow-emerald-600/20"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 size={16} /> Confirm &amp; Process</>}
          </button>
        </div>

      </motion.div>
    </motion.div>
  );
}

export default function SalaryPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [salaryMap, setSalaryMap] = useState({});
  const [approvedIncentiveMap, setApprovedIncentiveMap] = useState({});
  const [attendanceMap, setAttendanceMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

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

      const [empRes, salRes, incRes, attRes, holRes, polRes, leaveRes] = await Promise.all([
        supabase.from('user_profiles').select('id, full_name, role, department, base_salary, joining_date').in('role', [
          'employee', 'relationship_exec', 'relationship_manager', 'hr_manager',
          'freelancer', 'video_editor', 'social_media_manager',
          'seo_specialist', 'advertiser', 'support_agent'
        ]),
        supabase.from('salary_records').select('*').eq('month', month).eq('year', year),
        supabase.from('incentive_allocations').select(`
          id, batch_id, employee_id, amount_paise, status,
          batch:incentive_batches ( incentive_type, description, payroll_month, payroll_year )
        `).eq('status', 'approved'),
        supabase.from('attendance').select('employee_id, status, date, work_date').gte('date', startDate).lte('date', endDate),
        supabase.from('holidays').select('holiday_date, name').gte('holiday_date', startDate).lte('holiday_date', endDate).eq('is_optional', false),
        supabase.from('organization_policy').select('weekend_days').limit(1).maybeSingle(),
        supabase.from('leave_requests').select('employee_id, from_date, to_date, status').eq('status', 'approved').lte('from_date', endDate).gte('to_date', startDate)
      ]);

      const emps = empRes.data || [];
      const sals = salRes.data || [];
      const incs = incRes.data || [];
      const atts = attRes.data || [];
      const hols = (holRes.data || []).map(h => h.holiday_date);
      const weeklyOffs = polRes.data?.weekend_days || [0];
      const leaves = leaveRes.data || [];

      setEmployees(emps);
      const sMap = {};
      sals.forEach(s => { sMap[s.employee_id] = s; });
      setSalaryMap(sMap);

      const iMap = {};
      incs.forEach(i => {
        if (!iMap[i.employee_id]) iMap[i.employee_id] = [];
        iMap[i.employee_id].push(i);
      });
      setApprovedIncentiveMap(iMap);

      const attMap = {};
      emps.forEach(emp => {
        const workingDaysData = calculateMonthWorkingDays(year, month, emp.joining_date, weeklyOffs, hols);
        const empAtts = atts.filter(a => a.employee_id === emp.id);

        let present = 0;
        let absent = 0;
        let half_day = 0;
        let late = 0;

        empAtts.forEach(a => {
          if (a.status === 'present' || a.status === 'wfh') present++;
          else if (a.status === 'absent') absent++;
          else if (a.status === 'half_day') half_day++;
          else if (a.status === 'late') {
            late++;
            present++;
          }
        });

        // Count approved leaves in this month (chargeable working days only)
        const empLeaves = leaves.filter(l => l.employee_id === emp.id);
        const approvedLeaveCount = calculateApprovedLeaveWorkingDays(
          empLeaves,
          startDate,
          endDate,
          weeklyOffs,
          hols
        );

        attMap[emp.id] = {
          ...workingDaysData,
          present,
          absent,
          half_day,
          late,
          approved_leave: approvedLeaveCount,
        };
      });
      setAttendanceMap(attMap);

    } catch (err) {
      console.error(err);
      toast.error('Failed to load payroll data');
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = (empId, data) => {
    setSalaryMap(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        ...data,
        status: 'processed',
      },
    }));
  };

  const generatePayslip = async (emp, sal) => {
    try {
      const toastId = toast.loading('Generating premium payslip...');

      // Fetch Itemized Payroll Line Items
      const { data: lineItems } = await supabase
        .from('payroll_line_items')
        .select('*')
        .eq('salary_record_id', sal.id);

      const attStats = attendanceMap[emp.id];
      const { blob, fileName, download } = await downloadPayslip({
        employee: emp,
        salary: sal,
        lineItems: lineItems || [],
        attendanceStats: attStats,
      });

      if (!sal.payslip_url) {
        const { error: uploadError } = await supabase.storage
          .from('payslips')
          .upload(fileName, blob, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (!uploadError) {
          await supabase
            .from('salary_records')
            .update({ payslip_url: fileName })
            .eq('id', sal.id);
          handleSave(emp.id, { payslip_url: fileName });
        }
      }

      download();
      toast.success('Payslip generated successfully', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate payslip: ' + err.message);
    }
  };

  const totalPayroll = Object.values(salaryMap).reduce((a, s) => a + (s.net_salary || 0), 0);
  const processed = Object.values(salaryMap).filter(s => s.status === 'processed').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-[family-name:var(--font-outfit)]">
      <AnimatePresence>
        {processing && (
          <ProcessModal
            record={processing}
            approvedIncentives={approvedIncentiveMap[processing.id] || []}
            attendanceStats={attendanceMap[processing.id]}
            onClose={() => setProcessing(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Payroll Management</h1>
          <p className="text-sm text-gray-500 mt-1">{MONTHS[month - 1]} {year} · {processed}/{employees.length} processed</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 transition-all shadow-xs">
            <CalendarIcon size={16} className="text-gray-400 mr-2" />
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none outline-none appearance-none cursor-pointer">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <span className="text-gray-300 mx-2">/</span>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none outline-none appearance-none cursor-pointer">
              {[year - 2, year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={fetchData} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 shadow-xs transition-all text-gray-500 hover:text-gray-700 hover:border-gray-300">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Guiding UI Wizard */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-indigo-100 shadow-xl shadow-indigo-50/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-widest mb-3 border border-indigo-100">
              Monthly Payroll Flow
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Process {MONTHS[month - 1]} Payroll</h2>
            <p className="text-sm font-medium text-gray-500 mt-1">Attendance-aware salary calculation automatically computes absent and half-day deductions based on actual chargeable working days.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex items-center w-full sm:w-auto">
              <Link href="/hrm/attendance" className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 rounded-xl text-sm font-bold transition-colors border border-gray-200 hover:border-indigo-200 group relative">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 group-hover:bg-indigo-200 text-[10px] text-gray-600 group-hover:text-indigo-700">1</span>
                Review Attendance
              </Link>
              <ArrowRight size={14} className="text-gray-300 mx-2 hidden sm:block" />
            </div>
            <div className="flex items-center w-full sm:w-auto">
              <Link href="/hrm/incentives" className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 rounded-xl text-sm font-bold transition-colors border border-gray-200 hover:border-indigo-200 group relative">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 group-hover:bg-indigo-200 text-[10px] text-gray-600 group-hover:text-indigo-700">2</span>
                Approve Incentives
              </Link>
              <ArrowRight size={14} className="text-gray-300 mx-2 hidden sm:block" />
            </div>
            <div className="w-full sm:w-auto">
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 cursor-default">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-[10px]">3</span>
                Process Below
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Payroll Cost', value: `₹${totalPayroll.toLocaleString('en-IN')}`, color: 'from-emerald-500 to-teal-600', icon: TrendingUp },
          { label: 'Processed', value: `${processed} / ${employees.length}`, color: 'from-sky-500 to-blue-600', icon: CheckCircle2 },
          { label: 'Pending', value: employees.length - processed, color: 'from-amber-500 to-orange-500', icon: AlertCircle },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-3xl p-5 text-white shadow-lg`}>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3"><s.icon size={20} /></div>
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest">{s.label}</p>
            <p className="text-3xl font-black mt-1 font-mono">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400">Loading payroll entries...</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {employees.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No employees found.</div>
            ) : (
              employees.map(emp => {
                const sal = salaryMap[emp.id];
                const appIncs = approvedIncentiveMap[emp.id] || [];
                const att = attendanceMap[emp.id];
                const isProcessed = sal?.status === 'processed';
                const fmt = (v) => v !== undefined && v !== null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
                
                return (
                  <div 
                    key={emp.id} 
                    onClick={() => {
                      const slug = emp.full_name ? emp.full_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'employee';
                      router.push(`/hrm/salary/${emp.id}-${slug}`);
                    }}
                    className="p-5 bg-white hover:bg-gray-50 border border-transparent hover:border-gray-200 hover:shadow-xs transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg shadow-inner">
                        {(emp.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-base group-hover:text-emerald-600 transition-colors">{emp.full_name}</p>
                        <p className="text-xs text-gray-400 font-medium tracking-wide mt-0.5">{emp.department || emp.role}</p>
                        {att && (
                          <p className="text-[11px] text-gray-500 mt-1 font-mono">
                            {att.workingDays} working days · {att.present} present · {att.absent} absent{att.half_day > 0 ? ` · ${att.half_day} half-day` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 sm:gap-10 w-full sm:w-auto overflow-x-auto hide-scrollbar">
                      <div className="shrink-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Basic</p>
                        <p className="text-sm font-semibold text-gray-700 font-mono">{fmt(sal?.base_salary || emp.base_salary)}</p>
                      </div>
                      <div className="shrink-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Allowances</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700 font-mono">{fmt(sal?.allowances)}</span>
                          {appIncs.length > 0 && !isProcessed && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-sans font-bold">
                              +{appIncs.length} bonus
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Deductions</p>
                        <p className="text-sm font-semibold text-rose-600 font-mono">{fmt(sal?.deductions)}</p>
                      </div>
                      <div className="shrink-0 pr-4 sm:pr-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Net Pay</p>
                        <p className="text-lg font-black text-gray-900 font-mono">{fmt(sal?.net_salary)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-4 sm:pt-0 border-t border-gray-100 sm:border-0 mt-2 sm:mt-0">
                      {isProcessed ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-full"><CheckCircle2 size={14} /> Processed</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-600 text-xs font-bold bg-amber-50 px-2.5 py-1 rounded-full"><AlertCircle size={14} /> Pending</span>
                      )}

                      <div className="flex items-center gap-2">
                        {isProcessed ? (
                          <button onClick={(e) => { e.stopPropagation(); generatePayslip(emp, sal); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100">
                            <Download size={14} /> Payslip
                          </button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setProcessing({ ...emp, salary_id: sal?.id, ...sal, month, year }); }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs shadow-emerald-600/20">
                            <Calculator size={14} /> Process
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
