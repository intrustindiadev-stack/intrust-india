'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, TrendingUp, DollarSign, Download, Calendar as CalendarIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'react-hot-toast';
import { downloadPayslip } from '@/lib/payslipGenerator';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EmployeeSalaryDashboard() {
    const params = useParams();
    const router = useRouter();
    const idParam = params.id || '';
    const id = idParam.slice(0, 36);

    const [employee, setEmployee] = useState(null);
    const [salaryRecords, setSalaryRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!id) return;
        try {
            const [empRes, salRes] = await Promise.all([
                supabase.from('user_profiles').select('*').eq('id', id).single(),
                supabase.from('salary_records').select('*').eq('employee_id', id).order('year', { ascending: false }).order('month', { ascending: false })
            ]);

            if (empRes.error) throw empRes.error;
            setEmployee(empRes.data);
            setSalaryRecords(salRes.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load employee data');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDownload = async (sal) => {
        try {
            const toastId = toast.loading('Generating premium payslip...');
            const { data: lineItems } = await supabase
                .from('payroll_line_items')
                .select('*')
                .eq('salary_record_id', sal.id);

            const { blob, fileName, download } = await downloadPayslip({ employee, salary: sal, lineItems });

            if (!sal.payslip_url) {
                const { error: uploadError } = await supabase.storage
                    .from('payslips')
                    .upload(fileName, blob, { contentType: 'application/pdf', upsert: true });

                if (!uploadError) {
                    await supabase.from('salary_records').update({ payslip_url: fileName }).eq('id', sal.id);
                }
            }

            download();
            toast.success('Payslip generated successfully', { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate payslip');
        }
    };

    const chartData = useMemo(() => {
        // Reverse to show chronological order
        return [...salaryRecords].reverse().map(s => ({
            name: `${MONTHS[s.month - 1]} ${s.year}`,
            net_salary: s.net_salary || 0,
            base_salary: s.base_salary || 0,
        }));
    }, [salaryRecords]);

    const ytdEarnings = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return salaryRecords
            .filter(s => s.year === currentYear && s.status === 'processed')
            .reduce((sum, s) => sum + (s.net_salary || 0), 0);
    }, [salaryRecords]);

    if (isLoading) {
        return (
            <div className="p-8 max-w-6xl mx-auto min-h-screen">
                <div className="animate-pulse flex flex-col gap-8">
                    <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-[2.5rem]"></div>
                    <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-[2.5rem]"></div>
                    <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-[2.5rem]"></div>
                </div>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="p-8 text-center text-gray-500 min-h-screen flex items-center justify-center">
                Employee not found.
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 min-h-screen font-[family-name:var(--font-outfit)]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button 
                    onClick={() => router.back()}
                    className="flex w-fit items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white font-bold text-sm bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Payroll
                </button>
            </div>

            {/* Profile Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700/50 shadow-xl shadow-gray-200/20 dark:shadow-black/20 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shrink-0">
                        {employee.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">{employee.full_name}</h1>
                        <p className="text-gray-500 font-medium">{employee.department || employee.role}</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 min-w-[140px]">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Base Salary</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white font-mono">₹{(employee.base_salary || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 min-w-[140px]">
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">YTD Earnings</p>
                        <p className="text-xl font-black text-emerald-700 dark:text-emerald-500 font-mono">₹{ytdEarnings.toLocaleString('en-IN')}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700/50 shadow-xl shadow-gray-200/20 dark:shadow-black/20 p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Earnings Trend</h2>
                        <TrendingUp size={20} className="text-emerald-500" />
                    </div>
                    <div className="h-72 w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.2} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} tickFormatter={(val) => `₹${val/1000}k`} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', backgroundColor: 'var(--tw-colors-gray-900)', color: 'white' }}
                                        itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                                        formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Net Pay']}
                                    />
                                    <Area type="monotone" dataKey="net_salary" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 font-medium">No payroll history available</div>
                        )}
                    </div>
                </div>

                {/* History List */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700/50 shadow-xl shadow-gray-200/20 dark:shadow-black/20 p-6 sm:p-8 flex flex-col">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white mb-6">Payroll History</h2>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 hide-scrollbar">
                        {salaryRecords.length === 0 ? (
                            <div className="text-center text-gray-400 py-10">No records found</div>
                        ) : (
                            salaryRecords.map(sal => (
                                <div key={sal.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors group">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold">
                                            <CalendarIcon size={16} className="text-indigo-500" />
                                            {MONTHS[sal.month - 1]} {sal.year}
                                        </div>
                                        {sal.status === 'processed' ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md"><CheckCircle2 size={12} /> Paid</span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-md"><AlertCircle size={12} /> Pending</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-end mt-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Net Pay</p>
                                            <p className="font-black text-gray-900 dark:text-white font-mono text-lg">₹{(sal.net_salary || 0).toLocaleString('en-IN')}</p>
                                        </div>
                                        {sal.status === 'processed' && (
                                            <button 
                                                onClick={() => handleDownload(sal)}
                                                className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                                            >
                                                <Download size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
