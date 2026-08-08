'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, FileText, RefreshCw, AlertCircle, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { downloadPayslip } from '@/lib/payslipGenerator';
import { formatPaiseToINR } from '@/lib/hrm/incentives';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function EmployeePayslipsPage() {
    const { user, profile } = useAuth();
    const [payslips, setPayslips] = useState([]);
    const [lineItemMap, setLineItemMap] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const fetchPayslips = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data: salaryRecords, error } = await supabase
                .from('salary_records')
                .select('*')
                .eq('employee_id', user.id)
                .order('year', { ascending: false })
                .order('month', { ascending: false });

            if (error) throw error;
            setPayslips(salaryRecords || []);

            // Fetch line items for these salary records
            if (salaryRecords && salaryRecords.length > 0) {
                const recordIds = salaryRecords.map(r => r.id);
                const { data: items } = await supabase
                    .from('payroll_line_items')
                    .select('*')
                    .in('salary_record_id', recordIds);

                const itemMap = {};
                (items || []).forEach(item => {
                    if (!itemMap[item.salary_record_id]) itemMap[item.salary_record_id] = [];
                    itemMap[item.salary_record_id].push(item);
                });
                setLineItemMap(itemMap);
            }
        } catch (err) {
            console.error('Fetch payslips error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchPayslips(); }, [fetchPayslips]);

    const latestPaid = payslips.find(p => p.status === 'paid' || p.status === 'processed');
    const totalEarned = payslips.filter(p => p.status === 'paid' || p.status === 'processed').reduce((a, p) => a + (p.net_salary || 0), 0);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50 dark:bg-[#0a0a0a] font-[family-name:var(--font-outfit)]">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Payslips & Compensation</h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">View and download itemized monthly salary slips with bonuses.</p>
                </div>
                <button onClick={fetchPayslips} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-sm">
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Restrained Compensation Summary Cards */}
            {latestPaid && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-slate-200/20 dark:shadow-black/20 backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                        <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                            <FileText size={18} className="text-emerald-500" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Latest Net Salary</span>
                        </div>
                        <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono">₹{latestPaid.net_salary?.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1 uppercase tracking-widest">{MONTHS[latestPaid.month - 1]} {latestPaid.year}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-slate-200/20 dark:shadow-black/20 backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                        <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                            <Gift size={18} className="text-indigo-500" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Total Earned (YTD)</span>
                        </div>
                        <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono">₹{totalEarned.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1 uppercase tracking-widest">{new Date().getFullYear()} Calendar Year</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Payslip List */}
                <div className="lg:col-span-2 space-y-4">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => <div key={i} className="h-28 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl animate-pulse" />)
                    ) : payslips.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center backdrop-blur-xl">
                            <FileText size={28} className="text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No payslips available yet</p>
                            <p className="text-xs text-slate-400 mt-1">Monthly salary slips will appear here once processed by HR</p>
                        </div>
                    ) : payslips.map((slip, i) => {
                        const items = lineItemMap[slip.id] || [];
                        const incentiveItems = items.filter(it => it.source_type === 'incentive');

                        return (
                            <motion.div key={slip.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl dark:shadow-none transition-all duration-300 space-y-4 group">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 font-bold text-sm shadow-inner group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 transition-colors">
                                            {MONTHS[slip.month - 1].substring(0, 3)}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 dark:text-white text-base">{MONTHS[slip.month - 1]} {slip.year}</h3>
                                            <span className={`inline-flex items-center gap-1.5 mt-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                                slip.status === 'paid' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                            }`}>
                                                {slip.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-5 border-t border-slate-100 dark:border-slate-800 sm:border-0 pt-4 sm:pt-0 mt-2 sm:mt-0">
                                        <div className="text-left sm:text-right">
                                            <p className="text-lg font-black text-slate-900 dark:text-white font-mono">₹{slip.net_salary?.toLocaleString('en-IN')}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Net Pay</p>
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                const toastId = toast.loading('Generating premium payslip...');
                                                try {
                                                    const { download } = await downloadPayslip({ employee: profile, salary: slip, lineItems: items });
                                                    download();
                                                    toast.success('Payslip generated successfully', { id: toastId });
                                                } catch (err) {
                                                    console.error(err);
                                                    toast.error('Failed to generate payslip', { id: toastId });
                                                }
                                            }}
                                            disabled={slip.status !== 'paid' && slip.status !== 'processed'}
                                            className={`p-3 rounded-xl transition-all border shadow-sm ${
                                                (slip.status === 'paid' || slip.status === 'processed')
                                                    ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700/50 hover:shadow-indigo-500/10 cursor-pointer'
                                                    : 'text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 cursor-not-allowed'
                                            }`}
                                            title={(slip.status === 'paid' || slip.status === 'processed') ? "Download Payslip PDF" : "Payslip not available yet"}
                                        >
                                            <Download size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Itemized Line Items Breakdown */}
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 text-xs space-y-2">
                                    <div className="flex justify-between text-slate-500 dark:text-slate-400 font-medium">
                                        <span>Basic Salary</span>
                                        <span className="font-mono text-slate-700 dark:text-slate-300">₹{slip.base_salary?.toLocaleString('en-IN')}</span>
                                    </div>
                                    {slip.hra > 0 && (
                                        <div className="flex justify-between text-slate-500 dark:text-slate-400 font-medium">
                                            <span>HRA</span>
                                            <span className="font-mono text-slate-700 dark:text-slate-300">₹{slip.hra?.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}

                                    {/* Explicit Incentives & Bonuses Line Items */}
                                    {incentiveItems.map(inc => (
                                        <div key={inc.id} className="flex justify-between text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-50/50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                                            <span className="flex items-center gap-1.5">
                                                <Gift size={14} /> {inc.label}
                                            </span>
                                            <span className="font-mono">+{formatPaiseToINR(inc.amount_paise)}</span>
                                        </div>
                                    ))}

                                    {slip.deductions > 0 && (
                                        <div className="flex justify-between text-rose-600 dark:text-rose-400 font-medium pt-1">
                                            <span>Deductions</span>
                                            <span className="font-mono">-₹{slip.deductions?.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Info Card */}
                <div className="bg-white dark:bg-slate-900/50 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none backdrop-blur-xl relative overflow-hidden h-max space-y-4">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2 border border-amber-100 dark:border-amber-500/20">
                        <AlertCircle size={24} />
                    </div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">Payslip & Incentive Notes</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                        Itemized financial awards and bonuses are included directly into monthly payslips upon approval. For queries regarding Tax Deductions (TDS), PF, or bonus calculations, contact the HR team.
                    </p>
                </div>
            </div>
        </div>
    );
}
