'use client';

import { useState } from 'react';
import { Download, Calculator, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SalaryPage() {
    const [salaries, setSalaries] = useState([
        { id: 1, name: 'Aditya Verma', role: 'Senior Developer', basic: '₹60,000', hra: '₹24,000', deductions: '₹4,500', net: '₹79,500', status: 'processed' },
        { id: 2, name: 'Pooja Singh', role: 'Sales Manager', basic: '₹45,000', hra: '₹18,000', deductions: '₹3,000', net: '₹60,000', status: 'pending' },
        { id: 3, name: 'Rohan Desai', role: 'Content Writer', basic: '₹30,000', hra: '₹12,000', deductions: '₹2,500', net: '₹39,500', status: 'pending' },
    ]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Payroll Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Process salaries and generate payslips for April 2026.</p>
                </div>
                <button className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/30">
                    <Calculator size={18} /> Run Payroll
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Total Payroll Cost</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">₹1,79,000</h3>
                </div>
                <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Processed</p>
                    <h3 className="text-2xl font-bold text-emerald-600 mt-1">1 / 3</h3>
                </div>
                <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Upcoming Deductions</p>
                    <h3 className="text-2xl font-bold text-rose-600 mt-1">₹10,000</h3>
                </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Basic Pay</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">HRA & Allowances</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-rose-600">Deductions</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Net Payable</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {salaries.map(sal => (
                                <tr key={sal.id} className="hover:bg-emerald-50/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-900">{sal.name}</div>
                                        <div className="text-xs text-gray-500">{sal.role}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{sal.basic}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{sal.hra}</td>
                                    <td className="px-6 py-4 text-sm text-rose-600">{sal.deductions}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{sal.net}</td>
                                    <td className="px-6 py-4">
                                        {sal.status === 'processed' ? (
                                            <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium"><CheckCircle2 size={16}/> Paid</span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-amber-600 text-sm font-medium"><AlertCircle size={16}/> Pending</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {sal.status === 'processed' ? (
                                            <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1 justify-end w-full">
                                                <Download size={16}/> Slip
                                            </button>
                                        ) : (
                                            <button className="text-emerald-600 hover:text-emerald-800 text-sm font-medium">
                                                Process
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
