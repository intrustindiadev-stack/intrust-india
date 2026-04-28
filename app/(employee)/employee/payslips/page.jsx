'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, FileText, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { motion } from 'framer-motion';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function EmployeePayslipsPage() {
    const { user } = useAuth();
    const [payslips, setPayslips] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPayslips = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('salary_records')
                .select('*')
                .eq('employee_id', user.id)
                .order('year', { ascending: false })
                .order('month', { ascending: false });
            if (error) throw error;
            setPayslips(data || []);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    }, [user]);

    useEffect(() => { fetchPayslips(); }, [fetchPayslips]);

    const latestPaid = payslips.find(p => p.status === 'paid' || p.status === 'processed');
    const totalEarned = payslips.filter(p => p.status === 'paid').reduce((a, p) => a + (p.net_salary || 0), 0);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Payslips</h1>
                    <p className="text-sm text-gray-500 mt-1">View and download your monthly salary slips.</p>
                </div>
                <button onClick={fetchPayslips} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50">
                    <RefreshCw size={16} className="text-gray-500" />
                </button>
            </div>

            {/* Stats */}
            {latestPaid && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-5 text-white shadow-lg">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3"><TrendingUp size={20} /></div>
                        <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Last Salary</p>
                        <p className="text-3xl font-black mt-1">₹{latestPaid.net_salary?.toLocaleString('en-IN')}</p>
                        <p className="text-white/60 text-sm mt-1">{MONTHS[latestPaid.month - 1]} {latestPaid.year}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-white shadow-lg">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3"><FileText size={20} /></div>
                        <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Total Earned (YTD)</p>
                        <p className="text-3xl font-black mt-1">₹{totalEarned.toLocaleString('en-IN')}</p>
                        <p className="text-white/60 text-sm mt-1">{new Date().getFullYear()}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Payslip List */}
                <div className="lg:col-span-2 space-y-3">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white border border-gray-100 rounded-3xl animate-pulse" />)
                    ) : payslips.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center">
                            <div className="w-14 h-14 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-4"><FileText size={24} className="text-amber-500" /></div>
                            <p className="font-semibold text-gray-700">No payslips yet</p>
                            <p className="text-sm text-gray-400 mt-1">Your salary records will appear here once processed by HR</p>
                        </div>
                    ) : payslips.map((slip, i) => (
                        <motion.div key={slip.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4 group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform flex-shrink-0">
                                    <FileText size={22} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{MONTHS[slip.month - 1]} {slip.year}</h3>
                                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                                        <span>Basic ₹{slip.base_salary?.toLocaleString('en-IN')}</span>
                                        {slip.hra > 0 && <span>HRA ₹{slip.hra?.toLocaleString('en-IN')}</span>}
                                        {slip.deductions > 0 && <span className="text-rose-500">-₹{slip.deductions?.toLocaleString('en-IN')}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-0 border-gray-100 pt-3 sm:pt-0">
                                <div className="text-right">
                                    <p className="text-lg font-bold text-gray-900">₹{slip.net_salary?.toLocaleString('en-IN')}</p>
                                    <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${slip.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : slip.status === 'processed' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {slip.status}
                                    </span>
                                </div>
                                {slip.payslip_url ? (
                                    <a href={slip.payslip_url} download target="_blank" rel="noreferrer"
                                        className="p-2.5 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors border border-amber-100">
                                        <Download size={18} />
                                    </a>
                                ) : (
                                    <div className="p-2.5 text-gray-300 rounded-xl border border-gray-100 cursor-not-allowed" title="No payslip PDF yet">
                                        <Download size={18} />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Info Card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden h-max">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl -mr-10 -mt-10" />
                    <AlertCircle size={28} className="text-amber-400 mb-3" />
                    <h3 className="font-bold mb-2">Tax & Deductions</h3>
                    <p className="text-sm text-gray-300 leading-relaxed mb-4">
                        For queries on TDS, PF deductions, or Form 16, contact the HR department directly.
                    </p>
                    <p className="text-xs text-gray-500 mt-3">Payslips are processed monthly by HR and become downloadable once marked as Paid.</p>
                </div>
            </div>
        </div>
    );
}
