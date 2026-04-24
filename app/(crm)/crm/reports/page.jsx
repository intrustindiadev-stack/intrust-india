'use client';

import { BarChart2, TrendingUp, Users } from 'lucide-react';

export default function CRMReportsPage() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Reports</h1>
                <p className="text-sm text-gray-500 mt-0.5">Sales analytics and performance insights.</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-900 to-violet-900 rounded-3xl p-8 text-white text-center shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/5 pointer-events-none" />
                <BarChart2 size={48} className="mx-auto mb-4 opacity-50" />
                <h2 className="text-xl font-bold mb-2">Analytics Coming Soon</h2>
                <p className="text-indigo-200 text-sm max-w-sm mx-auto">
                    Detailed revenue charts, conversion funnels, and team leaderboards are being built. Check back shortly.
                </p>
            </div>

            {/* Placeholder metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Revenue Pipeline', icon: TrendingUp, value: '₹—', sub: 'Live data coming soon' },
                    { label: 'Team Conversion', icon: BarChart2, value: '—%', sub: 'Aggregated results' },
                    { label: 'Active Reps', icon: Users, value: '—', sub: 'Logged-in this week' },
                ].map(c => (
                    <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <c.icon size={18} className="text-indigo-600" />
                            </div>
                            <p className="text-sm font-bold text-gray-700">{c.label}</p>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{c.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
