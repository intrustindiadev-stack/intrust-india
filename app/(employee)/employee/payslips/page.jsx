'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, FileText, RefreshCw, AlertCircle, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { motion } from 'framer-motion';
import { formatPaiseToINR } from '@/lib/hrm/incentives';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function EmployeePayslipsPage() {
    const { user } = useAuth();
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
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50 font-[family-name:var(--font-outfit)]">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Payslips & Compensation</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">View and download itemized monthly salary slips with bonuses.</p>
                </div>
                <button onClick={fetchPayslips} className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs">
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Restrained Compensation Summary Cards */}
            {latestPaid && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                        <div className="flex items-center gap-2 mb-2 text-slate-500">
                            <FileText size={18} />
                            <span className="text-xs font-semibold uppercase tracking-wider">Latest Net Salary</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-900 font-mono">₹{latestPaid.net_salary?.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">{MONTHS[latestPaid.month - 1]} {latestPaid.year}</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                        <div className="flex items-center gap-2 mb-2 text-slate-500">
                            <Gift size={18} className="text-indigo-600" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Total Earned (YTD)</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-900 font-mono">₹{totalEarned.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">{new Date().getFullYear()} Calendar Year</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Payslip List */}
                <div className="lg:col-span-2 space-y-3">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />)
                    ) : payslips.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <FileText size={28} className="text-slate-400 mx-auto mb-3" />
                            <p className="font-semibold text-slate-700 text-sm">No payslips available yet</p>
                            <p className="text-xs text-slate-400 mt-1">Monthly salary slips will appear here once processed by HR</p>
                        </div>
                    ) : payslips.map((slip, i) => {
                        const items = lineItemMap[slip.id] || [];
                        const incentiveItems = items.filter(it => it.source_type === 'incentive');

                        return (
                            <motion.div key={slip.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-3">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 font-bold text-sm">
                                            {MONTHS[slip.month - 1].substring(0, 3)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-sm">{MONTHS[slip.month - 1]} {slip.year}</h3>
                                            <span className={`inline-block mt-0.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                                                slip.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {slip.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-4">
                                        <div className="text-right">
                                            <p className="text-base font-bold text-slate-900 font-mono">₹{slip.net_salary?.toLocaleString('en-IN')}</p>
                                            <p className="text-[11px] text-slate-400">Net Pay</p>
                                        </div>
                                        {slip.payslip_url ? (
                                            <a href={slip.payslip_url} download target="_blank" rel="noreferrer"
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100">
                                                <Download size={16} />
                                            </a>
                                        ) : (
                                            <div className="p-2 text-slate-300 rounded-lg border border-slate-100 cursor-not-allowed" title="No payslip PDF yet">
                                                <Download size={16} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Itemized Line Items Breakdown */}
                                <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Basic Salary</span>
                                        <span className="font-mono">₹{slip.base_salary?.toLocaleString('en-IN')}</span>
                                    </div>
                                    {slip.hra > 0 && (
                                        <div className="flex justify-between text-slate-500">
                                            <span>HRA</span>
                                            <span className="font-mono">₹{slip.hra?.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}

                                    {/* Explicit Incentives & Bonuses Line Items */}
                                    {incentiveItems.map(inc => (
                                        <div key={inc.id} className="flex justify-between text-indigo-700 font-medium bg-indigo-50/50 px-2 py-0.5 rounded">
                                            <span className="flex items-center gap-1">
                                                <Gift size={12} /> {inc.label}
                                            </span>
                                            <span className="font-mono font-bold">{formatPaiseToINR(inc.amount_paise)}</span>
                                        </div>
                                    ))}

                                    {slip.deductions > 0 && (
                                        <div className="flex justify-between text-rose-600">
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
                <div className="bg-white rounded-xl p-6 border border-slate-200 text-slate-800 shadow-xs relative overflow-hidden h-max space-y-3">
                    <AlertCircle size={24} className="text-slate-600" />
                    <h3 className="font-bold text-sm text-slate-900">Payslip & Incentive Notes</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Itemized financial awards and bonuses are included directly into monthly payslips upon approval. For queries regarding Tax Deductions (TDS), PF, or bonus calculations, contact the HR team.
                    </p>
                </div>
            </div>
        </div>
    );
}
