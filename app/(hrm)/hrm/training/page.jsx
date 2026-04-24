'use client';

import { useState } from 'react';
import { Plus, Video, FileText, Search, MoreVertical, Edit, Users } from 'lucide-react';
import Link from 'next/link';

export default function HRMTrainingPage() {
    const [modules, setModules] = useState([
        { id: 1, title: 'Company Security Policies', type: 'Video', duration: '15 mins', assigned: 45, completed: 42, status: 'active' },
        { id: 2, title: 'Sales Pitch Guidelines', type: 'Document', duration: '30 mins', assigned: 12, completed: 8, status: 'active' },
        { id: 3, title: 'Anti-Harassment Training 2026', type: 'Interactive', duration: '45 mins', assigned: 45, completed: 15, status: 'active' },
    ]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Training Materials</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and assign training modules to employees.</p>
                </div>
                <button className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/30">
                    <Plus size={18} /> Add Module
                </button>
            </div>

            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search training materials..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map(mod => (
                    <div key={mod.id} className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
                                {mod.type === 'Video' ? <Video size={24} /> : <FileText size={24} />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors leading-tight mb-1">{mod.title}</h3>
                                    <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={16} /></button>
                                </div>
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">{mod.duration} • {mod.type}</span>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between bg-gray-50/30">
                            <div className="mb-4">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-medium text-gray-600 flex items-center gap-1"><Users size={16}/> Completion Rate</span>
                                    <span className="text-sm font-bold text-gray-900">{Math.round((mod.completed/mod.assigned)*100)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${(mod.completed/mod.assigned)*100}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">{mod.completed} of {mod.assigned} employees completed</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="flex-1 flex items-center justify-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
                                    <Edit size={16} /> Edit
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2 rounded-xl text-sm font-medium transition-colors border border-emerald-100">
                                    Assign
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
