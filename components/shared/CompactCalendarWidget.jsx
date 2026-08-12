'use client';

import { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronRight, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

// Helpers
const getDayLabel = (date) => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[date.getDay()];
};

const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export default function CompactCalendarWidget({ events = [] }) {
    const [currentDate] = useState(new Date());
    
    // Generate week days (Start from 2 days ago to show past and future)
    const weekDays = useMemo(() => {
        const days = [];
        const start = new Date(currentDate);
        start.setDate(start.getDate() - 2);
        
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            
            const dayEvents = events.filter(e => e.date === dateStr);
            
            days.push({
                date: d,
                dateStr,
                dayLabel: getDayLabel(d),
                dayNum: d.getDate(),
                isToday: d.toDateString() === currentDate.toDateString(),
                events: dayEvents
            });
        }
        return days;
    }, [currentDate, events]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 shadow-xl shadow-gray-200/50 dark:shadow-none w-full font-[family-name:var(--font-outfit)] border border-slate-100 dark:border-gray-700 h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                        <CalendarIcon size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">This Week</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-gray-700/50 rounded-xl border border-slate-100 dark:border-gray-700">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-sm font-black text-slate-700 dark:text-gray-200">{formatTime(currentDate)}</span>
                    </div>
                    <Link href="/employee/calendar" className="text-sm font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-xl flex items-center gap-1 hover:bg-indigo-100 transition-colors">
                        Full Calendar <ChevronRight size={16} strokeWidth={3} />
                    </Link>
                </div>

                <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4 -mx-2 px-2 snap-x">
                    {weekDays.map((day, idx) => {
                        const isAbsent = day.events.some(e => e.type === 'absent');
                        const hasLeave = day.events.some(e => e.type === 'leave');
                        const hasSalary = day.events.some(e => e.type === 'salary');
                        
                        return (
                            <div 
                                key={idx} 
                                className={`min-w-[75px] flex flex-col items-center justify-between py-4 rounded-[1.5rem] border-2 snap-center transition-all ${
                                    day.isToday 
                                    ? 'border-indigo-500 shadow-md shadow-indigo-500/20' 
                                    : 'border-transparent bg-slate-50 dark:bg-gray-700/30 hover:bg-slate-100'
                                }`}
                                style={{ height: '130px' }}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${day.isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {day.dayLabel}
                                    </span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                                        {day.dayNum}
                                    </span>
                                </div>
                                
                                <div className="h-6 flex items-end justify-center w-full">
                                    {isAbsent && (
                                        <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">ABS</span>
                                    )}
                                    {!isAbsent && hasLeave && (
                                        <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                                            <Briefcase size={12} strokeWidth={3} />
                                        </span>
                                    )}
                                    {!isAbsent && !hasLeave && hasSalary && (
                                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Scroll Indicator */}
            <div className="w-full h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full mt-4 overflow-hidden">
                <div className="w-1/3 h-full bg-indigo-400 rounded-full" />
            </div>
        </div>
    );
}
