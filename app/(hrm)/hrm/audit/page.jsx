'use client';

import { useState } from 'react';
import { ShieldAlert, Search, Clock, Filter, User } from 'lucide-react';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState([
        { id: 1, action: 'Modified Salary Structure', module: 'Payroll', user: 'Admin System', target: 'Pooja Singh', timestamp: '2026-04-24 10:15 AM', severity: 'high' },
        { id: 2, action: 'Approved Leave Request', module: 'Leaves', user: 'HR Admin (Aditya)', target: 'Rohan Desai', timestamp: '2026-04-24 09:30 AM', severity: 'low' },
        { id: 3, action: 'Onboarded New Employee', module: 'Core HR', user: 'HR Admin (Aditya)', target: 'Neha Sharma', timestamp: '2026-04-23 04:45 PM', severity: 'medium' },
        { id: 4, action: 'Changed Role to Manager', module: 'Access Control', user: 'SuperAdmin', target: 'Pooja Singh', timestamp: '2026-04-22 11:20 AM', severity: 'high' },
    ]);

    const getSeverityColor = (severity) => {
        switch(severity) {
            case 'high': return 'bg-rose-100 text-rose-700';
            case 'medium': return 'bg-amber-100 text-amber-700';
            case 'low': return 'bg-emerald-100 text-emerald-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Audit Logs</h1>
                    <p className="text-sm text-gray-500 mt-1">Track all system changes and administrative actions.</p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search logs by action, user, or module..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                </div>
                <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium">
                    <Filter size={18} /> Filters
                </button>
            </div>

            {/* Logs List */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action Details</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Module</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Performed By</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5"><ShieldAlert size={16} className="text-gray-400" /></div>
                                            <div>
                                                <div className="font-semibold text-gray-900">{log.action}</div>
                                                <div className="text-xs text-gray-500">Target: {log.target}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">{log.module}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <User size={14} className="text-gray-400" /> {log.user}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Clock size={14} className="text-gray-400" /> {log.timestamp}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getSeverityColor(log.severity)}`}>
                                            {log.severity}
                                        </span>
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
