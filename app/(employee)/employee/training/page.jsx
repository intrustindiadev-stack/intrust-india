'use client';

import { PlayCircle, FileText, CheckCircle2 } from 'lucide-react';

export default function EmployeeTrainingPage() {
    const modules = [
        { id: 1, title: 'Company Security Policies', type: 'Video', duration: '15 mins', status: 'completed' },
        { id: 2, title: 'Sales Pitch Guidelines', type: 'Document', duration: '30 mins', status: 'pending' },
        { id: 3, title: 'Anti-Harassment Training 2026', type: 'Interactive', duration: '45 mins', status: 'pending' },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Training Hub</h1>
                    <p className="text-sm text-gray-500 mt-1">Complete your assigned training modules.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map(mod => (
                    <div key={mod.id} className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
                        <div className={`h-32 flex items-center justify-center ${mod.status === 'completed' ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-amber-400 to-orange-500'} relative`}>
                            <div className="absolute inset-0 bg-black/10"></div>
                            {mod.type === 'Video' ? <PlayCircle size={48} className="text-white/80 z-10" /> : <FileText size={48} className="text-white/80 z-10" />}
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{mod.type}</span>
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">{mod.duration}</span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">{mod.title}</h3>
                            </div>
                            
                            {mod.status === 'completed' ? (
                                <div className="flex items-center gap-2 text-emerald-600 font-medium bg-emerald-50 px-4 py-2.5 rounded-xl justify-center">
                                    <CheckCircle2 size={18} /> Completed
                                </div>
                            ) : (
                                <button className="w-full bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-md">
                                    Start Module
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
