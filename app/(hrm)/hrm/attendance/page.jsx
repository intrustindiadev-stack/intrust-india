'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Clock, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AttendancePage() {
    const [attendance, setAttendance] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            setAttendance([
                { id: 1, empId: 'EMP001', name: 'Aditya Verma', date: '2026-04-24', clockIn: '09:05 AM', clockOut: '06:15 PM', status: 'present', location: 'Office GPS' },
                { id: 2, empId: 'EMP002', name: 'Pooja Singh', date: '2026-04-24', clockIn: '09:20 AM', clockOut: '06:30 PM', status: 'late', location: 'Field GPS' },
                { id: 3, empId: 'EMP003', name: 'Rohan Desai', date: '2026-04-24', clockIn: '--', clockOut: '--', status: 'absent', location: '--' },
                { id: 4, empId: 'EMP004', name: 'Neha Sharma', date: '2026-04-24', clockIn: '08:55 AM', clockOut: '06:00 PM', status: 'present', location: 'Office GPS' },
            ]);
            setIsLoading(false);
        }, 500);
    }, []);

    const getStatusStyle = (status) => {
        switch(status) {
            case 'present': return 'bg-emerald-100 text-emerald-700';
            case 'late': return 'bg-amber-100 text-amber-700';
            case 'absent': return 'bg-rose-100 text-rose-700';
            case 'half-day': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Attendance Log</h1>
                    <p className="text-sm text-gray-500 mt-1">Daily attendance tracking and GPS location logs.</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2">
                        <Calendar size={18} /> Today
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search employees..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                </div>
                <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium">
                    <Filter size={18} /> Filters
                </button>
            </div>

            {/* Attendance Table */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Clock In</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Clock Out</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Location</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {attendance.map(record => (
                                    <tr key={record.id} className="hover:bg-emerald-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-semibold text-gray-900">{record.name}</div>
                                                <div className="text-xs text-gray-500">{record.empId}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusStyle(record.status)}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                                                {record.clockIn !== '--' && <Clock size={14} className="text-gray-400" />}
                                                {record.clockIn}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                                                {record.clockOut !== '--' && <Clock size={14} className="text-gray-400" />}
                                                {record.clockOut}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell text-sm text-gray-600">
                                            {record.location}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
