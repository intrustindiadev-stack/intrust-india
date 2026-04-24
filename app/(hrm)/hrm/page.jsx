'use client';

import { Users, Clock, Calendar, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HRMDashboard() {
    const stats = [
        { label: 'Total Employees', value: '45', icon: Users, color: 'bg-emerald-500' },
        { label: 'Present Today', value: '42', icon: Clock, color: 'bg-teal-500' },
        { label: 'On Leave', value: '3', icon: Calendar, color: 'bg-amber-500' },
        { label: 'Pending Approvals', value: '8', icon: ShieldCheck, color: 'bg-rose-500' },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">HR & Admin Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage employees, attendance, and approvals.</p>
                </div>
                <Link 
                    href="/hrm/employees/new" 
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/30 transform hover:-translate-y-0.5"
                >
                    Onboard Employee
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${stat.color} shadow-lg shadow-${stat.color.split('-')[1]}-500/30`}>
                                    <Icon size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                                    <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Actions */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Pending Leave Approvals</h2>
                        <Link href="/hrm/leaves" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                            View Queue <ArrowRight size={16} />
                        </Link>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                        <Calendar className="w-12 h-12 text-gray-300 mb-3" />
                        <h3 className="text-sm font-medium text-gray-900">All caught up!</h3>
                        <p className="text-xs text-gray-500 mt-1">No pending leave requests at the moment.</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-emerald-900 to-teal-800 rounded-3xl p-6 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    
                    <h2 className="text-lg font-bold mb-6 relative z-10">HR Operations</h2>
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <Link href="/hrm/attendance" className="flex flex-col p-4 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-sm transition-all border border-white/5 text-center items-center justify-center gap-3 group">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Clock size={20} className="text-emerald-200" />
                            </div>
                            <span className="text-sm font-medium">Daily Attendance</span>
                        </Link>
                        <Link href="/hrm/salary" className="flex flex-col p-4 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-sm transition-all border border-white/5 text-center items-center justify-center gap-3 group">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Users size={20} className="text-emerald-200" />
                            </div>
                            <span className="text-sm font-medium">Process Salary</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
