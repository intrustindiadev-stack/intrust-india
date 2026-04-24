'use client';

import { Clock, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock attendance log for demo — will be real data when attendance tracking is wired
const MOCK_LOG = [
    { date: 'Thu, Apr 24', clockIn: '09:12 AM', clockOut: '06:34 PM', hours: '9h 22m', status: 'present' },
    { date: 'Wed, Apr 23', clockIn: '09:05 AM', clockOut: '06:15 PM', hours: '9h 10m', status: 'present' },
    { date: 'Tue, Apr 22', clockIn: '—', clockOut: '—', hours: '—', status: 'absent' },
    { date: 'Mon, Apr 21', clockIn: '09:30 AM', clockOut: '05:45 PM', hours: '8h 15m', status: 'present' },
    { date: 'Sat, Apr 19', clockIn: '10:00 AM', clockOut: '02:00 PM', hours: '4h 00m', status: 'half' },
];

const STATUS_META = {
    present: { label: 'Present', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
    absent: { label: 'Absent', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
    half: { label: 'Half Day', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: MinusCircle },
};

export default function AttendancePage() {
    const presentDays = MOCK_LOG.filter(d => d.status === 'present').length;
    const absentDays = MOCK_LOG.filter(d => d.status === 'absent').length;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Attendance</h1>
                <p className="text-sm text-gray-500 mt-0.5">Your clock-in/out log for this month.</p>
            </div>

            {/* Monthly summary */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Present', value: presentDays, color: 'from-emerald-500 to-teal-500' },
                    { label: 'Absent', value: absentDays, color: 'from-rose-500 to-pink-500' },
                    { label: 'Total Days', value: MOCK_LOG.length, color: 'from-indigo-500 to-violet-500' },
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={`rounded-2xl p-4 text-white bg-gradient-to-br ${s.color} shadow-lg text-center`}>
                        <p className="text-3xl font-black">{s.value}</p>
                        <p className="text-white/70 text-xs font-bold uppercase tracking-wider mt-1">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Log table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900 text-base">Recent Log</h2>
                </div>
                <div className="divide-y divide-gray-50">
                    {MOCK_LOG.map((row, i) => {
                        const meta = STATUS_META[row.status];
                        const Icon = meta.icon;
                        return (
                            <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                                        <Clock size={16} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{row.date}</p>
                                        {row.clockIn !== '—' && (
                                            <p className="text-xs text-gray-400 mt-0.5">{row.clockIn} → {row.clockOut} · {row.hours}</p>
                                        )}
                                    </div>
                                </div>
                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${meta.cls}`}>
                                    <Icon size={11} /> {meta.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <p className="text-center text-xs text-gray-400">Biometric sync will populate live data once GPS attendance is activated.</p>
        </div>
    );
}
