'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Check, X, Clock, Calendar } from 'lucide-react';

export default function LeaveQueuePage() {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            setRequests([
                { id: 1, empName: 'Rohan Desai', empId: 'EMP003', type: 'Sick Leave', from: '2026-04-26', to: '2026-04-27', days: 2, status: 'pending', reason: 'Fever and cold' },
                { id: 2, empName: 'Neha Sharma', empId: 'EMP004', type: 'Casual Leave', from: '2026-05-01', to: '2026-05-05', days: 5, status: 'approved', reason: 'Family vacation' },
                { id: 3, empName: 'Aditya Verma', empId: 'EMP001', type: 'Sick Leave', from: '2026-04-20', to: '2026-04-20', days: 1, status: 'rejected', reason: 'Migraine' },
            ]);
            setIsLoading(false);
        }, 600);
    }, []);

    const getStatusStyle = (status) => {
        switch(status) {
            case 'approved': return 'bg-emerald-100 text-emerald-700';
            case 'pending': return 'bg-amber-100 text-amber-700 border border-amber-200';
            case 'rejected': return 'bg-rose-100 text-rose-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Leave Approvals</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage employee leave requests.</p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by employee name..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                </div>
                <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium">
                    <Filter size={18} /> Filters
                </button>
            </div>

            {/* Leave Requests Grid */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="p-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    requests.map(req => (
                        <div key={req.id} className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                                        {req.empName.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-bold text-gray-900">{req.empName}</h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(req.status)}`}>
                                                {req.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-2">
                                            <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{req.type}</span>
                                            <span className="flex items-center gap-1"><Calendar size={14}/> {req.from} to {req.to}</span>
                                            <span className="flex items-center gap-1"><Clock size={14}/> {req.days} Day{req.days > 1 ? 's' : ''}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 italic">"{req.reason}"</p>
                                    </div>
                                </div>
                                
                                {req.status === 'pending' && (
                                    <div className="flex items-center gap-3 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100 w-full md:w-auto">
                                        <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-medium transition-colors border border-rose-100">
                                            <X size={18} /> Reject
                                        </button>
                                        <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all shadow-md shadow-emerald-500/20">
                                            <Check size={18} /> Approve
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
