'use client';

import { Download, FileText, ChevronRight } from 'lucide-react';

export default function EmployeePayslipsPage() {
    const payslips = [
        { id: 1, month: 'March 2026', date: '01 Apr 2026', netPay: '₹79,500', status: 'paid' },
        { id: 2, month: 'February 2026', date: '01 Mar 2026', netPay: '₹79,500', status: 'paid' },
        { id: 3, month: 'January 2026', date: '01 Feb 2026', netPay: '₹79,500', status: 'paid' },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Payslips</h1>
                    <p className="text-sm text-gray-500 mt-1">View and download your monthly salary slips.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main List */}
                <div className="lg:col-span-2 space-y-4">
                    {payslips.map(slip => (
                        <div key={slip.id} className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4 group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner group-hover:scale-110 transition-transform">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{slip.month}</h3>
                                    <p className="text-sm text-gray-500">Credited on {slip.date}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t border-gray-100 sm:border-0 pt-4 sm:pt-0">
                                <div className="text-left sm:text-right">
                                    <p className="text-lg font-bold text-gray-900">{slip.netPay}</p>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Paid</span>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors" title="Download PDF">
                                        <Download size={20} />
                                    </button>
                                    <button className="p-2 text-gray-400 hover:text-amber-600 transition-colors">
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Info Card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden h-max">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <h3 className="font-bold mb-2">Tax & Deductions</h3>
                    <p className="text-sm text-gray-300 leading-relaxed mb-4">
                        For questions regarding your TDS, PF deductions, or form 16, please contact the HR department.
                    </p>
                    <button className="text-sm font-medium bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors backdrop-blur-sm">
                        Contact HR
                    </button>
                </div>
            </div>
        </div>
    );
}
