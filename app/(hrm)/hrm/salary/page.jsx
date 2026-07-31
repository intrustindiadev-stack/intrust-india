'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Calculator, CheckCircle2, AlertCircle, RefreshCw, TrendingUp, Users, X, Save, DollarSign, Building, ChevronRight, Loader2, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Process Salary Modal ─────────────────────────────────────────────────────
function ProcessModal({ record, onClose, onSave }) {
    const [form, setForm] = useState({
        base_salary: record?.base_salary || 0,
        hra: record?.hra || 0,
        allowances: record?.allowances || 0,
        deductions: record?.deductions || 0,
    });
    const [saving, setSaving] = useState(false);
    const up = (k, v) => setForm(p => ({ ...p, [k]: parseFloat(v) || 0 }));
    const net = Math.max(0,
        Number(form.base_salary || 0) +
        Number(form.hra || 0) +
        Number(form.allowances || 0) -
        Number(form.deductions || 0)
    );
    const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

    const handleProcess = async () => {
        setSaving(true);
        try {
            const payload = {
                employee_id: record.id,
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                ...form,
                net_salary: net,
                status: 'processed',
                processed_at: new Date().toISOString(),
            };
            if (record?.salary_id) payload.id = record.salary_id;

            const { error } = await supabase.from('salary_records').upsert(payload, { onConflict: 'employee_id,month,year' });
            if (error) throw error;

            toast.success(`Salary processed for ${record.full_name}`);

            supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) {
                    supabase.from('audit_logs_hrm').insert({
                        actor_id: user.id,
                        actor_name: user.user_metadata?.full_name || 'System',
                        action: 'Salary processed',
                        table_name: 'salary_records',
                        record_id: record.salary_id || record.id,
                        old_data: record,
                        new_data: payload,
                        module: 'Payroll',
                        severity: 'high'
                    });
                }
            });

            onSave(record.id, { ...form, net_salary: net });
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const fields = [
        { label: 'Basic Salary', key: 'base_salary', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'HRA', key: 'hra', color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Allowances', key: 'allowances', color: 'text-violet-600', bg: 'bg-violet-50' },
        { label: 'Deductions', key: 'deductions', color: 'text-rose-600', bg: 'bg-rose-50' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">
                                {(record?.full_name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-base font-black">{record?.full_name}</h3>
                                <p className="text-xs text-emerald-100 font-medium mt-0.5">
                                    {record?.department || record?.role} · {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {/* Salary Fields */}
                    <div className="grid grid-cols-2 gap-3">
                        {fields.map(f => (
                            <div key={f.key} className={`${f.bg} rounded-2xl p-3.5 border border-transparent`}>
                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${f.color}`}>{f.label}</label>
                                <div className="flex items-center gap-1">
                                    <span className={`text-sm font-bold ${f.color}`}>₹</span>
                                    <input
                                        type="number"
                                        value={form[f.key] || ''}
                                        onChange={e => up(f.key, e.target.value)}
                                        className={`w-full bg-transparent text-sm font-black ${f.color} outline-none placeholder-gray-300`}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Breakdown Summary */}
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Gross Pay</span>
                            <span className="font-bold text-gray-700">{fmt(Number(form.base_salary) + Number(form.hra) + Number(form.allowances))}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-rose-500">Deductions</span>
                            <span className="font-bold text-rose-600">- {fmt(form.deductions)}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                            <span className="font-black text-gray-900">Net Pay</span>
                            <span className="text-2xl font-black text-emerald-700">{fmt(net)}</span>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleProcess}
                            disabled={saving}
                            className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-60 shadow-lg shadow-emerald-600/25 transition-all"
                        >
                            {saving
                                ? <><Loader2 size={16} className="animate-spin" /> Processing…</>
                                : <><CheckCircle2 size={16} /> Process Salary</>
                            }
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SalaryPage() {
    const [employees, setEmployees] = useState([]);
    const [salaryMap, setSalaryMap] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [generatingId, setGeneratingId] = useState(null);
    const [search, setSearch] = useState('');
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const monthLabel = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [empRes, salRes] = await Promise.all([
                supabase.from('user_profiles').select('id, full_name, role, department, avatar_url, base_salary').in('role', ['employee', 'sales_exec', 'sales_manager', 'hr_manager']),
                supabase.from('salary_records').select('*').eq('month', month).eq('year', year),
            ]);
            const emps = empRes.data || [];
            const sals = salRes.data || [];
            setEmployees(emps);
            const map = {};
            sals.forEach(s => { map[s.employee_id] = s; });
            setSalaryMap(map);
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
        setGeneratingId(emp.id);
        try {
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            const W = 210, margin = 18;
            const fmt = (v) => `Rs. ${Number(v || 0).toLocaleString('en-IN')}`;

            // ── Header band ──────────────────────────────────────────────────
            doc.setFillColor(16, 115, 80); // deep emerald
            doc.rect(0, 0, W, 38, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('INTRUST INDIA', margin, 15);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('intrustindiadev@gmail.com  |  www.intrustindia.com', margin, 23);

            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('SALARY SLIP', W - margin, 15, { align: 'right' });

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(monthLabel, W - margin, 23, { align: 'right' });

            // ── Employee info ─────────────────────────────────────────────────
            doc.setTextColor(30, 30, 30);
            doc.setFillColor(247, 250, 248);
            doc.roundedRect(margin, 44, W - margin * 2, 28, 3, 3, 'F');

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(emp.full_name || 'N/A', margin + 5, 54);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(`Department: ${emp.department || emp.role || 'N/A'}`, margin + 5, 62);
            doc.text(`Employee ID: ${emp.id.substring(0, 8).toUpperCase()}`, W - margin - 5, 54, { align: 'right' });
            doc.text(`Pay Period: ${monthLabel}`, W - margin - 5, 62, { align: 'right' });

            // ── Salary breakdown table ────────────────────────────────────────
            autoTable(doc, {
                startY: 80,
                margin: { left: margin, right: margin },
                head: [['Component', 'Amount']],
                body: [
                    ['Basic Salary', fmt(sal.base_salary || emp.base_salary)],
                    ['HRA (House Rent Allowance)', fmt(sal.hra)],
                    ['Other Allowances', fmt(sal.allowances)],
                    ['Deductions', `- ${fmt(sal.deductions)}`],
                ],
                theme: 'striped',
                headStyles: {
                    fillColor: [16, 115, 80],
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 10,
                    cellPadding: 5,
                },
                bodyStyles: {
                    fontSize: 10,
                    cellPadding: 5,
                    textColor: [40, 40, 40],
                },
                alternateRowStyles: { fillColor: [240, 250, 245] },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
            });

            // ── Net Pay block ─────────────────────────────────────────────────
            const finalY = doc.lastAutoTable?.finalY || 150;
            doc.setFillColor(16, 115, 80);
            doc.roundedRect(margin, finalY + 8, W - margin * 2, 18, 3, 3, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('NET PAY', margin + 6, finalY + 20);
            doc.text(fmt(sal.net_salary), W - margin - 6, finalY + 20, { align: 'right' });

            // ── Footer ────────────────────────────────────────────────────────
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('This is a computer-generated payslip. No signature required.', W / 2, finalY + 42, { align: 'center' });
            doc.text('For queries: intrustindiadev@gmail.com', W / 2, finalY + 48, { align: 'center' });

            // ── Upload + Download ─────────────────────────────────────────────
            const pdfBlob = doc.output('blob');
            const fileName = `payslip_${emp.id}_${sal.month}_${sal.year}.pdf`;

            if (!sal.payslip_url) {
                const { error: uploadError } = await supabase.storage
                    .from('payslips')
                    .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true });
                if (uploadError) console.warn('Storage upload failed:', uploadError.message);
                else {
                    await supabase.from('salary_records').update({ payslip_url: fileName }).eq('id', sal.id);
                    handleSave(emp.id, { payslip_url: fileName });
                }
            }

            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Payslip_${emp.full_name?.replace(/\s+/g, '_')}_${sal.month}_${sal.year}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Payslip downloaded!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate payslip: ' + err.message);
        } finally {
            setGeneratingId(null);
        }
    };

    const totalPayroll = Object.values(salaryMap).reduce((a, s) => a + (s.net_salary || 0), 0);
    const processed = Object.values(salaryMap).filter(s => s.status === 'processed').length;
    const pending = employees.length - processed;

    const filtered = employees.filter(e =>
        !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.department?.toLowerCase().includes(search.toLowerCase())
    );

    const SKELETON_ROWS = 5;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen bg-[#F8FAFC] font-[family-name:var(--font-outfit)]">
            <AnimatePresence>
                {processing && (
                    <ProcessModal
                        record={processing}
                        onClose={() => setProcessing(null)}
                        onSave={handleSave}
                    />
                )}
            </AnimatePresence>

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-widest mb-2">
                        <DollarSign size={12} /> Payroll
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Payroll Management</h1>
                    <p className="text-gray-500 font-medium mt-1 text-sm">{monthLabel} · {processed} of {employees.length} salaries processed</p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-bold text-gray-600 transition-colors shadow-sm"
                >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </motion.div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Total Payroll Cost', value: `₹${totalPayroll.toLocaleString('en-IN')}`, from: 'from-emerald-500', to: 'to-teal-600', icon: TrendingUp, shadow: 'shadow-emerald-500/20' },
                    { label: 'Processed', value: `${processed} / ${employees.length}`, from: 'from-sky-500', to: 'to-blue-600', icon: CheckCircle2, shadow: 'shadow-sky-500/20' },
                    { label: 'Pending', value: pending, from: 'from-amber-500', to: 'to-orange-500', icon: AlertCircle, shadow: 'shadow-amber-500/20' },
                ].map((s, i) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className={`bg-gradient-to-br ${s.from} ${s.to} rounded-2xl p-5 text-white shadow-lg ${s.shadow}`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-white/70 text-xs font-black uppercase tracking-widest">{s.label}</p>
                                <p className="text-3xl font-black mt-2 tracking-tight">{s.value}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                                <s.icon size={20} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Table Card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Table toolbar */}
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest">Employee Payroll — {monthLabel}</h2>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search employee…"
                        className="px-4 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 w-full sm:w-64 font-medium text-gray-700"
                    />
                </div>

                {isLoading ? (
                    // Skeleton rows
                    <div className="divide-y divide-gray-50">
                        {[...Array(SKELETON_ROWS)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3.5 bg-gray-200 rounded w-32" />
                                    <div className="h-2.5 bg-gray-100 rounded w-20" />
                                </div>
                                {[...Array(4)].map((_, j) => <div key={j} className="h-3 bg-gray-100 rounded w-16" />)}
                                <div className="h-7 bg-gray-100 rounded-lg w-20" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Users size={40} className="mb-3 opacity-30" />
                        <p className="text-sm font-bold">{search ? 'No employees match your search' : 'No employees found'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-gray-50/70 border-b border-gray-100">
                                    {['Employee', 'Basic', 'HRA', 'Allowances', 'Deductions', 'Net Pay', 'Status', 'Action'].map(h => (
                                        <th key={h} className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((emp, idx) => {
                                    const sal = salaryMap[emp.id];
                                    const isProcessed = sal?.status === 'processed';
                                    const fmt = (v) => v ? `₹${Number(v).toLocaleString('en-IN')}` : <span className="text-gray-300">—</span>;

                                    return (
                                        <motion.tr
                                            key={emp.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="hover:bg-emerald-50/30 transition-colors"
                                        >
                                            {/* Employee */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-700 font-black text-sm shrink-0 overflow-hidden">
                                                        {emp.avatar_url
                                                            ? <img src={emp.avatar_url} alt={emp.full_name} className="w-full h-full object-cover" />
                                                            : (emp.full_name || '?').charAt(0).toUpperCase()
                                                        }
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm leading-tight">{emp.full_name}</p>
                                                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">{emp.department || emp.role}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-gray-600 font-medium">{fmt(sal?.base_salary || emp.base_salary)}</td>
                                            <td className="px-5 py-4 text-sm text-gray-600 font-medium">{fmt(sal?.hra)}</td>
                                            <td className="px-5 py-4 text-sm text-gray-600 font-medium">{fmt(sal?.allowances)}</td>
                                            <td className="px-5 py-4 text-sm text-rose-500 font-medium">{sal?.deductions ? `- ₹${Number(sal.deductions).toLocaleString('en-IN')}` : <span className="text-gray-300">—</span>}</td>
                                            <td className="px-5 py-4 text-sm font-black text-gray-900">{fmt(sal?.net_salary)}</td>
                                            {/* Status */}
                                            <td className="px-5 py-4">
                                                {isProcessed ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                        <CheckCircle2 size={11} /> Processed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-100">
                                                        <AlertCircle size={11} /> Pending
                                                    </span>
                                                )}
                                            </td>
                                            {/* Action */}
                                            <td className="px-5 py-4">
                                                {isProcessed ? (
                                                    <button
                                                        onClick={() => generatePayslip(emp, sal)}
                                                        disabled={generatingId === emp.id}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-all disabled:opacity-50"
                                                    >
                                                        {generatingId === emp.id
                                                            ? <Loader2 size={12} className="animate-spin" />
                                                            : <Download size={12} />
                                                        }
                                                        Payslip
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setProcessing({ ...emp, salary_id: sal?.id, ...sal })}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-all"
                                                    >
                                                        <Calculator size={12} /> Process
                                                    </button>
                                                )}
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Table footer */}
                {!isLoading && filtered.length > 0 && (
                    <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/40">
                        <p className="text-xs text-gray-400 font-medium">{filtered.length} employee{filtered.length !== 1 ? 's' : ''} shown</p>
                        <p className="text-xs font-bold text-emerald-700">
                            Total Payroll: ₹{totalPayroll.toLocaleString('en-IN')}
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
