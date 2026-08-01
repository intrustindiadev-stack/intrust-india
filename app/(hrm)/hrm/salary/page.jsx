'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Calculator, CheckCircle2, AlertCircle, RefreshCw, TrendingUp, Users, X, Save, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPaiseToINR, INCENTIVE_TYPE_LABELS } from '@/lib/hrm/incentives';

function ProcessModal({ record, approvedIncentives = [], onClose, onSave }) {
  const totalApprovedIncentivesPaise = approvedIncentives.reduce((acc, i) => acc + (i.amount_paise || 0), 0);
  const totalApprovedIncentivesRupees = totalApprovedIncentivesPaise / 100;

  const [form, setForm] = useState({
    base_salary: record?.base_salary || 0,
    hra: record?.hra || 0,
    allowances: record?.allowances || 0,
    deductions: record?.deductions || 0,
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
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const payload = {
        employee_id: record.id,
        month,
        year,
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
            <p className="text-sm text-gray-500">{record?.full_name} · {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</p>
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
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5">
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
  const [employees, setEmployees] = useState([]);
  const [salaryMap, setSalaryMap] = useState({});
  const [approvedIncentiveMap, setApprovedIncentiveMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [empRes, salRes, incRes] = await Promise.all([
        supabase.from('user_profiles').select('id, full_name, role, department, base_salary').in('role', [
          'employee', 'relationship_exec', 'relationship_manager', 'hr_manager',
          'freelancer', 'video_editor', 'social_media_manager',
          'seo_specialist', 'advertiser', 'support_agent'
        ]),
        supabase.from('salary_records').select('*').eq('month', month).eq('year', year),
        supabase.from('incentive_allocations').select(`
          id, batch_id, employee_id, amount_paise, status,
          batch:incentive_batches ( incentive_type, description )
        `).eq('status', 'approved')
      ]);

      const emps = empRes.data || [];
      const sals = salRes.data || [];
      const incs = incRes.data || [];

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
      const toastId = toast.loading('Generating itemized payslip...');
      const doc = new jsPDF();

      doc.setFontSize(22);
      doc.setTextColor(16, 185, 129); // Emerald
      doc.text("Intrust India", 105, 20, { align: "center" });

      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text("Payslip", 105, 30, { align: "center" });

      doc.setFontSize(10);
      doc.text(`Employee Name: ${emp.full_name}`, 14, 45);
      doc.text(`Department: ${emp.department || emp.role}`, 14, 52);
      doc.text(`Month/Year: ${new Date(sal.year, sal.month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`, 14, 59);

      // Fetch Itemized Payroll Line Items if available
      const { data: lineItems } = await supabase
        .from('payroll_line_items')
        .select('*')
        .eq('salary_record_id', sal.id);

      const fmt = (v) => `Rs. ${Number(v || 0).toLocaleString('en-IN')}`;
      const tableData = [
        ["Basic Salary", fmt(sal.base_salary || emp.base_salary)],
        ["HRA", fmt(sal.hra)],
      ];

      if (lineItems && lineItems.length > 0) {
        lineItems.forEach(item => {
          tableData.push([item.label, fmt(item.amount_paise / 100)]);
        });
      } else if (sal.allowances > 0) {
        tableData.push(["Allowances & Bonuses", fmt(sal.allowances)]);
      }

      tableData.push(["Deductions", fmt(sal.deductions)]);

      autoTable(doc, {
        startY: 70,
        head: [['Component', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
      });

      const finalY = doc.lastAutoTable?.finalY || 150;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Net Pay: ${fmt(sal.net_salary)}`, 14, finalY + 15);

      const pdfBlob = doc.output('blob');
      const fileName = `payslip_${emp.id}_${sal.month}_${sal.year}.pdf`;

      if (!sal.payslip_url) {
        const { error: uploadError } = await supabase.storage
          .from('payslips')
          .upload(fileName, pdfBlob, {
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

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslip_${emp.full_name.replace(/\s+/g, '_')}_${sal.month}_${sal.year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

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
            onClose={() => setProcessing(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Payroll Management</h1>
          <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })} · {processed}/{employees.length} processed</p>
        </div>
        <button onClick={fetchData} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50">
          <RefreshCw size={16} className="text-gray-500" />
        </button>
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  {['Employee', 'Basic', 'HRA', 'Allowances & Bonuses', 'Deductions', 'Net Pay', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map(emp => {
                  const sal = salaryMap[emp.id];
                  const appIncs = approvedIncentiveMap[emp.id] || [];
                  const isProcessed = sal?.status === 'processed';
                  const fmt = (v) => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">{(emp.full_name || '?').charAt(0).toUpperCase()}</div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{emp.full_name}</p>
                            <p className="text-xs text-gray-400">{emp.department || emp.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 font-mono">{fmt(sal?.base_salary || emp.base_salary)}</td>
                      <td className="px-5 py-4 text-sm text-gray-600 font-mono">{fmt(sal?.hra)}</td>
                      <td className="px-5 py-4 text-sm text-gray-600 font-mono">
                        <div>{fmt(sal?.allowances)}</div>
                        {appIncs.length > 0 && !isProcessed && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-sans font-medium">
                            +{appIncs.length} bonus pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-rose-600 font-mono">{fmt(sal?.deductions)}</td>
                      <td className="px-5 py-4 text-sm font-bold text-gray-900 font-mono">{fmt(sal?.net_salary)}</td>
                      <td className="px-5 py-4">
                        {isProcessed ? (
                          <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle2 size={14} /> Processed</span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 text-xs font-bold"><AlertCircle size={14} /> Pending</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {isProcessed ? (
                          <button onClick={() => generatePayslip(emp, sal)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100">
                            <Download size={12} /> Payslip
                          </button>
                        ) : (
                          <button onClick={() => setProcessing({ ...emp, salary_id: sal?.id, ...sal })}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100">
                            <Calculator size={12} /> Process
                          </button>
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
