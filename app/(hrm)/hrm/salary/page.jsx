'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Calculator, CheckCircle2, AlertCircle, RefreshCw, TrendingUp, Users, X, Save, Gift, Calendar as CalendarIcon, ChevronRight, ArrowRight, CircleDashed } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadPayslip } from '@/lib/payslipGenerator';
import { formatPaiseToINR, INCENTIVE_TYPE_LABELS } from '@/lib/hrm/incentives';
import Link from 'next/link';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function ProcessModal({ record, approvedIncentives = [], attendanceStats = null, onClose, onSave }) {
  const totalApprovedIncentivesPaise = approvedIncentives.reduce((acc, i) => acc + (i.amount_paise || 0), 0);
  const totalApprovedIncentivesRupees = totalApprovedIncentivesPaise / 100;

  // Calculate Auto Deductions based on attendance
  // Assuming daily wage = base_salary / 30
  const dailyWage = record?.base_salary ? record.base_salary / 30 : 0;
  const autoDeductions = attendanceStats ? (
      (attendanceStats.absent * dailyWage) +
      (attendanceStats.half_day * (dailyWage * 0.5))
  ) : 0;

  // If this is a new processing, prepopulate deductions with autoDeductions
  const initialDeductions = record?.salary_id ? (record?.deductions || 0) : Math.round(autoDeductions);

  const [form, setForm] = useState({
    base_salary: record?.base_salary || 0,
    hra: record?.hra || 0,
    allowances: record?.allowances || 0,
    deductions: initialDeductions,
  });

  const [saving, setSaving] = useState(false);
  const up = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const net = Math.max(
    0,
    Number(form.base_salary || 0) +
      Number(form.hra || 0) +
      Number(form.allowances || 0) +
      totalApprovedIncentivesRupees -
      Number(form.deductions || 0)
  );

  const handleProcess = async () => {
    setSaving(true);
    try {
      const payload = {
        employee_id: record.id,
        month: record.month,
        year: record.year,
        base_salary: Number(form.base_salary || 0),
        hra: Number(form.hra || 0),
        allowances: Number(form.allowances || 0) + totalApprovedIncentivesRupees,
        deductions: Number(form.deductions || 0),
        net_salary: net,
        status: 'processed',
        processed_at: new Date().toISOString(),
      };
      if (record?.salary_id) payload.id = record.salary_id;

      const { data: salRec, error: salErr } = await supabase
        .from('salary_records')
        .upsert(payload, { onConflict: 'employee_id,month,year' })
        .select()
        .single();

      if (salErr) throw salErr;

      // Link approved incentives into payroll_line_items and mark them paid
      if (approvedIncentives.length > 0 && salRec) {
        for (const alloc of approvedIncentives) {
          const typeLabel = INCENTIVE_TYPE_LABELS[alloc.batch?.incentive_type] || 'Incentive Award';

          const { data: lineItem, error: lineErr } = await supabase
            .from('payroll_line_items')
            .upsert({
              salary_record_id: salRec.id,
              employee_id: record.id,
              source_type: 'incentive',
              source_id: alloc.id,
              label: `${typeLabel} (${alloc.batch?.description || 'Bonus'})`,
              amount_paise: alloc.amount_paise,
              taxable: true,
            }, { onConflict: 'salary_record_id,source_type,source_id' })
            .select()
            .single();

          if (!lineErr && lineItem) {
            await supabase
              .from('incentive_allocations')
              .update({
                status: 'paid',
                salary_record_id: salRec.id,
                payroll_line_item_id: lineItem.id,
                paid_at: new Date().toISOString(),
              })
              .eq('id', alloc.id);

            // Update parent batch status to paid if all allocations paid
            if (alloc.batch_id) {
              const { data: siblingAllocations } = await supabase
                .from('incentive_allocations')
                .select('status')
                .eq('batch_id', alloc.batch_id);

              const allPaid = (siblingAllocations || []).every(s => s.status === 'paid');
              if (allPaid) {
                const { data: { user } } = await supabase.auth.getUser();
                await supabase
                  .from('incentive_batches')
                  .update({
                    status: 'paid',
                    paid_by: user?.id || null,
                    paid_at: new Date().toISOString(),
                  })
                  .eq('id', alloc.batch_id);
              }
            }
          }
        }
      }

      toast.success(`Salary processed for ${record.full_name}`);

      // Audit Log Insert
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from('audit_logs_hrm').insert({
            actor_id: user.id,
            actor_name: user.user_metadata?.full_name || 'System',
            action: 'Salary processed',
            table_name: 'salary_records',
            record_id: salRec.id,
            old_data: record,
            new_data: payload,
            module: 'Payroll',
            severity: 'high'
          }).then(({ error: auditError }) => {
            if (auditError) console.warn('Audit log failed:', auditError);
          });
        }
      });

      onSave(record.id, { ...form, allowances: payload.allowances, net_salary: net });
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Process Salary</h3>
            <p className="text-sm text-gray-500">{record?.full_name} · {MONTHS[record?.month - 1]} {record?.year}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} className="text-gray-500" /></button>
        </div>

        <div className="space-y-3 mb-5">
          {[
            { label: 'Basic Salary (₹)', key: 'base_salary' },
            { label: 'HRA (₹)', key: 'hra' },
            { label: 'Standard Allowances (₹)', key: 'allowances' },
            { label: 'Deductions (₹)', key: 'deductions' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">{f.label}</label>
              <input type="number" value={form[f.key]} onChange={e => up(f.key, e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono" />
            </div>
          ))}

          {/* Approved Incentives Itemized Section */}
          {approvedIncentives.length > 0 && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5 mb-3">
              <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Gift size={14} /> Approved Incentives & Bonuses ({approvedIncentives.length})
              </p>
              <div className="space-y-1 text-xs text-indigo-800">
                {approvedIncentives.map(alloc => (
                  <div key={alloc.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-indigo-100/50">
                    <span>{INCENTIVE_TYPE_LABELS[alloc.batch?.incentive_type] || 'Bonus'}</span>
                    <span className="font-bold font-mono">{formatPaiseToINR(alloc.amount_paise)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendance Breakdown */}
          {attendanceStats && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CalendarIcon size={14} /> Month Attendance Summary
                </p>
                <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-emerald-100 text-emerald-800 rounded-lg p-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Present</p>
                        <p className="text-sm font-black">{attendanceStats.present}</p>
                    </div>
                    <div className="bg-rose-100 text-rose-800 rounded-lg p-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Absent</p>
                        <p className="text-sm font-black">{attendanceStats.absent}</p>
                    </div>
                    <div className="bg-violet-100 text-violet-800 rounded-lg p-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Half Day</p>
                        <p className="text-sm font-black">{attendanceStats.half_day}</p>
                    </div>
                    <div className="bg-amber-100 text-amber-800 rounded-lg p-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Late</p>
                        <p className="text-sm font-black">{attendanceStats.late}</p>
                    </div>
                </div>
                {autoDeductions > 0 && !record?.salary_id && (
                    <p className="text-[10px] font-semibold text-rose-600 bg-rose-50 p-1.5 rounded-lg border border-rose-100 mt-2">
                        Automatic deduction of ₹{Math.round(autoDeductions).toLocaleString('en-IN')} applied based on absences and half-days.
                    </p>
                )}
              </div>
          )}
        </div>

        <div className="bg-emerald-50 rounded-2xl p-4 mb-5 flex justify-between items-center border border-emerald-100">
          <span className="text-sm font-bold text-emerald-700">Net Payable</span>
          <span className="text-2xl font-black text-emerald-700 font-mono">₹{net.toLocaleString('en-IN')}</span>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm">Cancel</button>
          <button onClick={handleProcess} disabled={saving} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 size={16} /> Process</>}
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
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const [empRes, salRes, incRes, attRes] = await Promise.all([
        supabase.from('user_profiles').select('id, full_name, role, department, base_salary').in('role', [
          'employee', 'relationship_exec', 'relationship_manager', 'hr_manager',
          'freelancer', 'video_editor', 'social_media_manager',
          'seo_specialist', 'advertiser', 'support_agent'
        ]),
        supabase.from('salary_records').select('*').eq('month', month).eq('year', year),
        supabase.from('incentive_allocations').select(`
          id, batch_id, employee_id, amount_paise, status,
          batch:incentive_batches ( incentive_type, description )
        `).eq('status', 'approved'),
        supabase.from('attendance').select('employee_id, status').gte('date', startDate).lte('date', endDate)
      ]);

      const emps = empRes.data || [];
      const sals = salRes.data || [];
      const incs = incRes.data || [];
      const atts = attRes.data || [];

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
      atts.forEach(a => {
          if (!attMap[a.employee_id]) attMap[a.employee_id] = { present: 0, absent: 0, half_day: 0, late: 0, leave: 0 };
          attMap[a.employee_id][a.status] = (attMap[a.employee_id][a.status] || 0) + 1;
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

  const handleSave = (empId, data) => setSalaryMap(prev => ({ ...prev, [empId]: { ...prev[empId], ...data, status: 'processed' } }));

  const generatePayslip = async (emp, sal) => {
    try {
      const toastId = toast.loading('Generating premium payslip...');

      // Fetch Itemized Payroll Line Items if available
      const { data: lineItems } = await supabase
        .from('payroll_line_items')
        .select('*')
        .eq('salary_record_id', sal.id);

      const attStats = attendanceMap[emp.id];
      const { blob, fileName, download } = await downloadPayslip({ employee: emp, salary: sal, lineItems, attendanceStats: attStats });

      if (!sal.payslip_url) {
        const { error: uploadError } = await supabase.storage
          .from('payslips')
          .upload(fileName, blob, {
            contentType: 'application/pdf',
            upsert: true
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
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
            <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 transition-all shadow-sm">
                <CalendarIcon size={16} className="text-gray-400 mr-2" />
                <select value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none outline-none appearance-none cursor-pointer">
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <span className="text-gray-300 mx-2">/</span>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none outline-none appearance-none cursor-pointer">
                    {[year - 2, year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
            <button onClick={fetchData} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 shadow-sm transition-all text-gray-500 hover:text-gray-700 hover:border-gray-300">
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
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Process {MONTHS[month - 1]} Payroll in 3 Steps</h2>
                  <p className="text-sm font-medium text-gray-500 mt-1">Complete these steps sequentially to ensure accurate salary disbursement and avoid compliance issues.</p>
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

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
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
                  const isProcessed = sal?.status === 'processed';
                  const fmt = (v) => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
                  return (
                    <div 
                      key={emp.id} 
                      onClick={() => {
                          const slug = emp.full_name ? emp.full_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'employee';
                          router.push(`/hrm/salary/${emp.id}-${slug}`);
                      }}
                      className="p-5 bg-white hover:bg-gray-50 border border-transparent hover:border-gray-200 hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg shadow-inner">
                              {(emp.full_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-base group-hover:text-emerald-600 transition-colors">{emp.full_name}</p>
                            <p className="text-xs text-gray-400 font-medium tracking-wide mt-0.5">{emp.department || emp.role}</p>
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
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20">
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
