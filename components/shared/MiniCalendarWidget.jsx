'use client';

import { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronRight, Briefcase, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// Helpers
const getDayLabel = (date) => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[date.getDay()];
};

const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const EVENT_COLORS = {
    present: 'bg-emerald-500',
    absent: 'bg-rose-500',
    late: 'bg-amber-500',
    half_day: 'bg-violet-500',
    leave: 'bg-sky-500',
    holiday: 'bg-indigo-500',
    salary: 'bg-teal-500',
    default: 'bg-slate-400',
};

export default function MiniCalendarWidget({ events = [] }) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    
    // Generate week days (Start from 2 days ago to show past and future)
    const weekDays = useMemo(() => {
        const days = [];
        const start = new Date(currentTime);
        start.setDate(start.getDate() - 2);
        
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            
            let dayEvents = events.filter(e => e.date === dateStr);
            const isPast = d < new Date(new Date().setHours(0,0,0,0));
            const dayOfWeek = d.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            // Auto Absent for past weekdays
            if (isPast && !isWeekend && dayEvents.length === 0) {
                dayEvents = [{ date: dateStr, title: 'Absent', type: 'absent' }];
            }
            
            days.push({
                date: d,
                dateStr,
                dayLabel: getDayLabel(d),
                dayNum: d.getDate(),
                isToday: d.toDateString() === currentTime.toDateString(),
                events: dayEvents
            });
        }
        return days;
    }, [currentTime, events]);

    const selectedDayData = selectedDate ? weekDays.find(d => d.dateStr === selectedDate) : null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-6 sm:p-8 shadow-xl shadow-gray-200/50 dark:shadow-none w-full max-w-sm mx-auto font-[family-name:var(--font-outfit)] border border-slate-100 dark:border-gray-700 h-full flex flex-col justify-between relative overflow-hidden">
            <div>
                <div className="flex items-center gap-5 mb-8">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500 flex items-center justify-center text-white shadow-[0_8px_20px_rgb(99,102,241,0.4)] flex-shrink-0">
                        <CalendarIcon size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-[1.7rem] font-black text-slate-900 dark:text-white tracking-tight leading-tight">This Week</h2>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{currentTime.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-8 gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-gray-700/50 rounded-2xl border border-slate-100 dark:border-gray-700 flex-shrink-0">
                        <Clock size={16} className="text-indigo-400" />
                        <span className="text-sm font-black text-slate-700 dark:text-gray-200">{formatTime(currentTime)}</span>
                    </div>
                    <Link href="/employee/calendar" className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-5 py-2.5 rounded-2xl flex items-center gap-1 hover:bg-indigo-100 transition-colors whitespace-nowrap">
                        Full Calendar <ChevronRight size={14} strokeWidth={3} className="mt-0.5" />
                    </Link>
                </div>

                <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4 -mx-2 px-2 snap-x">
                    {weekDays.map((day, idx) => {
                        const isAbsent = day.events.some(e => e.type === 'absent');
                        const hasLeave = day.events.some(e => e.type === 'leave');
                        const hasSalary = day.events.some(e => e.type === 'salary');
                        const leaveCount = day.events.filter(e => e.type === 'leave').length;
                        
                        return (
                            <div 
                                key={idx} 
                                onClick={() => setSelectedDate(day.dateStr)}
                                className={`min-w-[80px] flex flex-col items-center justify-between py-5 rounded-[1.8rem] border-2 snap-center cursor-pointer transition-all ${
                                    day.isToday 
                                    ? 'border-indigo-500 shadow-md shadow-indigo-500/20 bg-white dark:bg-gray-800 ring-2 ring-indigo-500/30' 
                                    : 'border-transparent bg-slate-50 dark:bg-gray-700/30 hover:bg-slate-100 dark:hover:bg-gray-700/50'
                                }`}
                                style={{ height: '140px' }}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${day.isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {day.dayLabel}
                                    </span>
                                    <span className="text-[1.7rem] font-black text-slate-900 dark:text-white leading-none mt-1">
                                        {day.dayNum}
                                    </span>
                                </div>
                                
                                <div className="h-7 flex items-end justify-center w-full">
                                    {isAbsent && (
                                        <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest shadow-sm">ABS</span>
                                    )}
                                    {!isAbsent && hasLeave && (
                                        <span className="bg-purple-100 text-purple-600 px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-sm font-black text-[10px]">
                                            <Briefcase size={10} strokeWidth={3} /> {leaveCount > 1 ? leaveCount : ''}
                                        </span>
                                    )}
                                    {!isAbsent && !hasLeave && hasSalary && (
                                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-sm" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Scroll Indicator */}
            <div className="w-full h-2 bg-slate-100 dark:bg-gray-700 rounded-full mt-4 overflow-hidden shadow-inner">
                <div className="w-1/3 h-full bg-indigo-400/80 rounded-full" />
            </div>

            {/* Selected Date Bottom Sheet Modal */}
            <AnimatePresence>
                {selectedDate && selectedDayData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-40 bg-black/20 backdrop-blur-[2px] flex flex-col justify-end"
                        onClick={() => setSelectedDate(null)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white dark:bg-gray-800 w-full rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col h-[70%]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-12 h-1.5 bg-slate-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-4" />
                            
                            <div className="px-6 flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {selectedDayData.date.getDate()} {selectedDayData.date.toLocaleString('default', { month: 'long' })}
                                    </h3>
                                    <p className="text-slate-500 text-sm font-medium">
                                        {selectedDayData.date.toLocaleString('default', { weekday: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setSelectedDate(null)}
                                    className="w-8 h-8 bg-slate-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            
                            <div className="px-6 pb-6 overflow-y-auto hide-scrollbar flex-1 space-y-4">
                                {selectedDayData.events.length === 0 ? (
                                    <div className="text-center py-8 bg-slate-50 dark:bg-gray-700/30 rounded-2xl border border-slate-100 dark:border-gray-700">
                                        <p className="text-slate-400 font-medium">No events for this day</p>
                                    </div>
                                ) : (
                                    selectedDayData.events.map((evt, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-gray-700/30 border border-slate-100 dark:border-gray-700">
                                            <div className={`w-2.5 h-10 rounded-full ${EVENT_COLORS[evt.type] || EVENT_COLORS.default}`} />
                                            <div className="flex-1">
                                                <h4 className="text-base font-semibold text-slate-900 dark:text-white capitalize">{evt.title || evt.type}</h4>
                                                {(evt.check_in || evt.check_out) && (
                                                    <p className="text-slate-500 text-xs mt-1 flex items-center gap-2">
                                                        {evt.check_in && <span>In: {new Date(evt.check_in).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>}
                                                        {evt.check_out && <span>Out: {new Date(evt.check_out).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            <div className="p-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 rounded-b-3xl">
                                <Link href="/employee/calendar" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-indigo-700 transition-colors">
                                    View Full Calendar <ChevronRight size={16} />
                                </Link>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
