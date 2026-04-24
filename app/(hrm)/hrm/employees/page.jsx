'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Building, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

export default function EmployeesPage() {
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            setEmployees([
                { id: 1, name: 'Aditya Verma', code: 'EMP001', dept: 'Engineering', role: 'Senior Developer', email: 'aditya@intrust.in', status: 'active' },
                { id: 2, name: 'Pooja Singh', code: 'EMP002', dept: 'Sales', role: 'Sales Manager', email: 'pooja@intrust.in', status: 'active' },
                { id: 3, name: 'Rohan Desai', code: 'EMP003', dept: 'Marketing', role: 'Content Writer', email: 'rohan@intrust.in', status: 'on_leave' },
            ]);
            setIsLoading(false);
        }, 500);
    }, []);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Employees</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your team and their records.</p>
                </div>
                <Link 
                    href="/hrm/employees/new" 
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/30 transform hover:-translate-y-0.5"
                >
                    <Plus size={18} />
                    <span>Onboard Employee</span>
                </Link>
            </div>

            {/* Filters Bar */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-4 shadow-sm flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search employees..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                </div>
            </div>

            {/* Roster Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {employees.map(emp => (
                    <div key={emp.id} className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg shadow-inner">
                                    {emp.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{emp.name}</h3>
                                    <p className="text-xs font-mono text-gray-500">{emp.code}</p>
                                </div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600">
                                <MoreVertical size={18} />
                            </button>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <Building size={16} className="text-gray-400" />
                                <span>{emp.role} • {emp.dept}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <Mail size={16} className="text-gray-400" />
                                <span>{emp.email}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {emp.status.replace('_', ' ')}
                            </span>
                            <Link href={`/hrm/employees/${emp.id}`} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                                View Profile
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
