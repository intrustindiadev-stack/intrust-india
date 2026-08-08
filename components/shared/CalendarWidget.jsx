'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { motion } from 'framer-motion';

// Helper to get days in month
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// Helper to get day of week of 1st day (0 = Sunday, 1 = Monday, etc.)
function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

const EVENT_COLORS = {
    present: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    absent: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    late: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    half_day: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
    leave: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
    holiday: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
    meeting: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
    default: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
};

const LEGEND = [
    { type: 'present', label: 'Present', color: 'bg-emerald-500' },
    { type: 'absent', label: 'Absent', color: 'bg-rose-500' },
    { type: 'late', label: 'Late', color: 'bg-amber-500' },
    { type: 'half_day', label: 'Half Day', color: 'bg-violet-500' },
    { type: 'leave', label: 'Leave', color: 'bg-sky-500' },
];

export default function CalendarWidget({ events = [], onDateClick }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    // Generate grid cells
    const days = useMemo(() => {
        const grid = [];
        for (let i = 0; i < firstDay; i++) {
            grid.push({ empty: true, key: `empty-${i}` });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const cellDate = new Date(year, month, i);
            const isSunday = cellDate.getDay() === 0;
            const isPast = cellDate < new Date(new Date().setHours(0,0,0,0));
            
            let dayEvents = events.filter(e => e.date === dateStr);
            
            // Auto-Absent Engine: If past day, not Sunday, and no attendance/leave/holiday events
            if (isPast && !isSunday && dayEvents.length === 0) {
                dayEvents = [{ date: dateStr, title: 'Absent', type: 'absent' }];
            }
            
            grid.push({ date: i, fullDate: dateStr, events: dayEvents, isSunday, isPast, key: `day-${i}` });
        }
        return grid;
    }, [year, month, daysInMonth, firstDay, events]);

    const isToday = (d) => {
        const today = new Date();
        return d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    return (
        <div className="bg-transparent flex flex-col h-full w-full font-[family-name:var(--font-outfit)]">
            {/* Header */}
            <div className="px-4 py-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <CalendarIcon size={20} className="text-indigo-500" />
                        {currentDate.toLocaleString('default', { month: 'long' })} {year}
                    </h2>
                    <div className="flex items-center gap-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-1 rounded-2xl border border-white/50 dark:border-slate-700/50">
                        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm">
                            <ChevronLeft size={18} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                            Today
                        </button>
                        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm">
                            <ChevronRight size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3">
                    {LEGEND.map(item => (
                        <div key={item.type} className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${item.color}`} />
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-y-auto hide-scrollbar px-2 pb-2">
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                        <div key={day} className={`text-center text-[10px] font-black uppercase tracking-widest pb-2 ${i === 0 ? 'text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {day}
                        </div>
                    ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                    {days.map((cell) => {
                        if (cell.empty) {
                            return <div key={cell.key} className="min-h-[80px] bg-transparent" />;
                        }

                        const hasEvents = cell.events.length > 0;
                        const active = isToday(cell.date);

                        return (
                            <motion.div
                                key={cell.key}
                                whileHover={{ scale: 0.95 }}
                                onClick={() => {
                                    setSelectedDate(cell.fullDate);
                                    onDateClick?.(cell.fullDate);
                                }}
                                className={`min-h-[80px] p-2 rounded-2xl transition-all cursor-pointer flex flex-col border border-transparent ${
                                    active 
                                        ? 'bg-white/80 dark:bg-slate-800/80 shadow-md border-white/50 dark:border-slate-700/50' 
                                        : cell.isSunday 
                                            ? 'hover:bg-rose-500/5' 
                                            : 'hover:bg-white/50 dark:hover:bg-slate-800/50 hover:border-white/50 dark:hover:border-slate-700/50 hover:shadow-sm'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-black ${
                                        active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 
                                        cell.isSunday ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'
                                    }`}>
                                        {cell.date}
                                    </span>
                                </div>
                                
                                <div className="space-y-1 overflow-y-auto flex-1 hide-scrollbar">
                                    {cell.events.map((evt, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md truncate border ${EVENT_COLORS[evt.type] || EVENT_COLORS.default}`}
                                            title={evt.title}
                                        >
                                            {evt.title}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
