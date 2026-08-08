'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, ChevronRight } from 'lucide-react';

const EVENT_COLORS = {
    present: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
    absent: 'bg-rose-500/20 text-rose-700 border-rose-500/30',
    late: 'bg-amber-500/20 text-amber-700 border-amber-500/30',
    half_day: 'bg-violet-500/20 text-violet-700 border-violet-500/30',
    leave: 'bg-sky-500/20 text-sky-700 border-sky-500/30',
    holiday: 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30',
    default: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
};

export default function MiniCalendarWidget({ events = [] }) {
    const today = new Date();
    
    // Generate the current week (Sun to Sat)
    const weekDays = useMemo(() => {
        const days = [];
        const currentDay = today.getDay(); // 0-6
        
        // Go back to Sunday
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - currentDay);
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            
            let dayEvents = events.filter(e => e.date === dateStr);
            const isPast = date < new Date(new Date().setHours(0,0,0,0));
            const isSunday = date.getDay() === 0;
            
            // Auto-Absent Engine for the mini widget
            if (isPast && !isSunday && dayEvents.length === 0) {
                dayEvents = [{ date: dateStr, title: 'Absent', type: 'absent' }];
            }

            days.push({
                dateObj: date,
                dateStr,
                dayEvents,
                isToday: date.toDateString() === today.toDateString(),
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNumber: date.getDate()
            });
        }
        return days;
    }, [events, today]);

    return (
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-[2rem] p-6 shadow-xl shadow-slate-200/20 flex flex-col font-[family-name:var(--font-outfit)]">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">This Week</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{today.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>
                <Link href="/employee/calendar" className="group flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors bg-indigo-50/50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full">
                    Full Calendar <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>

            <div className="flex justify-between items-stretch gap-2">
                {weekDays.map((day, idx) => {
                    const primaryEvent = day.dayEvents[0];
                    const colorClass = primaryEvent ? (EVENT_COLORS[primaryEvent.type] || EVENT_COLORS.default) : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200/50';
                    
                    return (
                        <div key={idx} className={`flex-1 flex flex-col items-center justify-between p-2 rounded-2xl border ${day.isToday ? 'border-indigo-300 ring-2 ring-indigo-500/20 shadow-md bg-white' : colorClass} transition-all`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${day.isToday ? 'text-indigo-600' : ''}`}>
                                {day.dayName}
                            </span>
                            <span className={`text-lg font-black ${day.isToday ? 'text-indigo-700' : ''}`}>
                                {day.dayNumber}
                            </span>
                            {primaryEvent && (
                                <span className="text-[8px] font-black uppercase tracking-wider truncate w-full text-center mt-1 opacity-80" title={primaryEvent.title}>
                                    {primaryEvent.type === 'absent' ? 'ABS' : primaryEvent.type === 'present' ? 'PRS' : primaryEvent.type.substring(0,3)}
                                </span>
                            )}
                            {!primaryEvent && <span className="text-[8px] font-black uppercase tracking-wider text-transparent mt-1">-</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
