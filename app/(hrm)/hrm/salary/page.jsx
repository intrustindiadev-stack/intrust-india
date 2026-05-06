'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Calculator, CheckCircle2, AlertCircle, RefreshCw, TrendingUp, Users, X, Save } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

function ProcessModal({ record, onClose, onSave }) {
    const [form, setForm] = useState({
        base_salary: record?.base_salary || 0,
        hra: record?.hra || 0,
        allowances: record?.allowances || 0,
        deductions: record?.deductions || 0,
    });
    const [saving, setSaving] = useState(false);
    const up = (k, v) => setForm(p => ({ ...p, [k]: v }));
    const net = Number(form.base_salary) + Number(form.hra) + Number(form.allowances) - Number(form.deductions);

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
            onSave(record.id, { ...form, net_salary: net });
            onClose();
        } catch (err) { toast.error(err.message); }
        finally { setSaving(false); }
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
                        { label: 'Allowances (₹)', key: 'allowances' },
                        { label: 'Deductions (₹)', key: 'deductions' },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">{f.label}</label>
                            <input type="number" value={form[f.key]} onChange={e => up(f.key, e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                    ))}
                </div>
                <div className="bg-emerald-50 rounded-2xl p-4 mb-5 flex justify-between items-center border border-emerald-100">
                    <span className="text-sm font-bold text-emerald-700">Net Payable</span>
                    <span className="text-2xl font-black text-emerald-700">₹{net.toLocaleString('en-IN')}</span>
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
    const [isLoading, setIsLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [empRes, salRes] = await Promise.all([
                supabase.from('user_profiles').select('id, full_name, role, department, base_salary').in('role', ['employee', 'sales_exec', 'sales_manager', 'hr_manager', 'crm_user']),
                supabase.from('salary_records').select('*').eq('month', month).eq('year', year),
            ]);
            const emps = empRes.data || [];
            const sals = salRes.data || [];
            setEmployees(emps);
            const map = {};
            sals.forEach(s => { map[s.employee_id] = s; });
            setSalaryMap(map);
        } catch (err) { console.error(err); toast.error('Failed to load payroll data'); }
        finally { setIsLoading(false); }
    }, [month, year]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSave = (empId, data) => setSalaryMap(prev => ({ ...prev, [empId]: { ...prev[empId], ...data, status: 'processed' } }));

    const totalPayroll = Object.values(salaryMap).reduce((a, s) => a + (s.net_salary || 0), 0);
    const processed = Object.values(salaryMap).filter(s => s.status === 'processed').length;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            <AnimatePresence>
                {processing && <ProcessModal record={processing} onClose={() => setProcessing(null)} onSave={handleSave} />}
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
                        <p className="text-3xl font-black mt-1">{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    {['Employee', 'Basic', 'HRA', 'Allowances', 'Deductions', 'Net Pay', 'Status', 'Action'].map(h => (
                                        <th key={h} className="px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {employees.map(emp => {
                                    const sal = salaryMap[emp.id];
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
                                            <td className="px-5 py-4 text-sm text-gray-600">{fmt(sal?.base_salary || emp.base_salary)}</td>
                                            <td className="px-5 py-4 text-sm text-gray-600">{fmt(sal?.hra)}</td>
                                            <td className="px-5 py-4 text-sm text-gray-600">{fmt(sal?.allowances)}</td>
                                            <td className="px-5 py-4 text-sm text-rose-600">{fmt(sal?.deductions)}</td>
                                            <td className="px-5 py-4 text-sm font-bold text-gray-900">{fmt(sal?.net_salary)}</td>
                                            <td className="px-5 py-4">
                                                {isProcessed ? (
                                                    <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle2 size={14} /> Processed</span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-amber-600 text-xs font-bold"><AlertCircle size={14} /> Pending</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <button onClick={() => setProcessing({ ...emp, salary_id: sal?.id, ...sal })}
                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isProcessed ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100'}`}>
                                                    {isProcessed ? <><Download size={12} /> Payslip</> : <><Calculator size={12} /> Process</>}
                                                </button>
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
