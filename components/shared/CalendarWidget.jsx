'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Briefcase, Banknote, CheckCircle, Clock, XCircle, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// Helper to get days in month
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// Helper to get day of week of 1st day (0 = Sunday, 1 = Monday, etc.)
function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

const EVENT_COLORS = {
    present: 'bg-emerald-500',
    absent: 'bg-rose-500',
    late: 'bg-amber-500',
    half_day: 'bg-violet-500',
    leave: 'bg-sky-500',
    holiday: 'bg-indigo-500',
    salary: 'bg-teal-500',
    payslip: 'bg-green-700',
    default: 'bg-slate-400',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarWidget({ events = [], onDateClick, currentDate: externalDate, onDateChange }) {
    const [internalDate, setInternalDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    // Use externally-controlled date if provided (enables parent to re-fetch on month change),
    // otherwise fall back to internal state for standalone usage.
    const currentDate = externalDate ?? internalDate;
    const setCurrentDate = (date) => {
        if (onDateChange) onDateChange(date);
        else setInternalDate(date);
    };

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
            const dayOfWeek = cellDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; 
            const isPast = cellDate < new Date(new Date().setHours(0,0,0,0));
            
            let dayEvents = events.filter(e => e.date === dateStr);
            dayEvents = dayEvents.map(e => ({ ...e, title: e.title || e.label || 'Event' }));

            if (isPast && !isWeekend && dayEvents.length === 0) {
                dayEvents = [{ date: dateStr, title: 'Absent', type: 'absent' }];
            }
            
            grid.push({ date: i, fullDate: dateStr, events: dayEvents, isWeekend, isPast, key: `day-${i}` });
        }
        return grid;
    }, [year, month, daysInMonth, firstDay, events]);

    const isToday = (d) => {
        const today = new Date();
        return d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };
    
    const selectedEvents = selectedDate ? (days.find(d => !d.empty && d.fullDate === selectedDate)?.events || []) : [];

    return (
        <div className="bg-white dark:bg-[#1A1F26] rounded-3xl overflow-hidden font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif] w-full max-w-md mx-auto relative shadow-sm border border-slate-100 dark:border-white/5">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5">
                <button onClick={prevMonth} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-2 rounded-full transition-colors">
                    <ChevronLeft size={24} strokeWidth={2} />
                </button>
                
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
                    {currentDate.toLocaleString('default', { month: 'long' })} {year}
                </h2>
                
                <button onClick={nextMonth} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-2 rounded-full transition-colors">
                    <ChevronRight size={24} strokeWidth={2} />
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="px-4 pb-6">
                <div className="grid grid-cols-7 mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className={`text-center text-[11px] font-semibold tracking-widest ${i === 0 || i === 6 ? 'text-slate-400' : 'text-slate-800 dark:text-slate-300'}`}>
                            {day}
                        </div>
                    ))}
                </div>
                
                <div className="grid grid-cols-7 gap-y-2">
                    {days.map((cell) => {
                        if (cell.empty) {
                            return <div key={cell.key} className="h-12" />;
                        }

                        const active = isToday(cell.date);
                        const isSelected = selectedDate === cell.fullDate;
                        const hasEvents = cell.events.length > 0;

                        return (
                            <div
                                key={cell.key}
                                onClick={() => {
                                    setSelectedDate(cell.fullDate);
                                    onDateClick?.(cell.fullDate);
                                }}
                                className="h-12 flex flex-col items-center justify-start pt-1 cursor-pointer group"
                            >
                                <div className={`w-9 h-9 flex items-center justify-center rounded-full text-[19px] transition-colors relative ${
                                    active 
                                        ? 'bg-rose-500 text-white font-semibold shadow-md' 
                                        : isSelected
                                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold'
                                            : cell.isWeekend
                                                ? 'text-slate-400 font-normal hover:bg-slate-100 dark:hover:bg-white/5'
                                                : 'text-slate-800 dark:text-slate-100 font-normal hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}>
                                    {cell.date}
                                </div>
                                
                                {/* Event Dots */}
                                <div className="flex gap-[2px] mt-[2px] h-1.5">
                                    {cell.events.slice(0, 3).map((evt, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`w-1.5 h-1.5 rounded-full ${EVENT_COLORS[evt.type] || EVENT_COLORS.default} ${evt.type === 'payslip' ? 'animate-pulse shadow-[0_0_6px_rgba(21,128,61,0.8)] ring-[0.5px] ring-green-400' : ''}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Selected Date Bottom Sheet Modal */}
            <AnimatePresence>
                {selectedDate && (
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
                            className="bg-white dark:bg-[#252A34] w-full rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col max-h-[80%]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-4" />
                            
                            <div className="px-6 flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {new Date(selectedDate).getDate()} {new Date(selectedDate).toLocaleString('default', { month: 'long' })}
                                    </h3>
                                    <p className="text-slate-500 text-sm font-medium">
                                        {new Date(selectedDate).toLocaleString('default', { weekday: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setSelectedDate(null)}
                                    className="w-8 h-8 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            
                            <div className="px-6 pb-8 overflow-y-auto hide-scrollbar space-y-4">
                                {selectedEvents.length === 0 ? (
                                    <div className="text-center py-10 bg-slate-50 dark:bg-white/5 rounded-2xl">
                                        <p className="text-slate-400 font-medium">No events for this day</p>
                                    </div>
                                ) : (
                                    selectedEvents.map((evt, idx) => {
                                        // Determine specific icon and secondary color for the event
                                        let EventIcon = CheckCircle;
                                        let badgeColor = 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';
                                        
                                        if (evt.type === 'salary' || evt.type === 'payslip') {
                                            EventIcon = evt.type === 'payslip' ? Receipt : Banknote;
                                            badgeColor = 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300';
                                        } else if (evt.type === 'leave') {
                                            EventIcon = Briefcase;
                                            badgeColor = 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300';
                                        } else if (evt.type === 'absent') {
                                            EventIcon = XCircle;
                                            badgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300';
                                        } else if (evt.type === 'present' || evt.type === 'late' || evt.type === 'half_day') {
                                            EventIcon = Clock;
                                            badgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
                                        }
                                        
                                        return (
                                            <div key={idx} className="flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 shadow-sm">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${EVENT_COLORS[evt.type] || EVENT_COLORS.default} text-white shadow-md`}>
                                                    <EventIcon size={24} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="text-lg font-black text-slate-900 dark:text-white capitalize tracking-tight">{evt.title || evt.type}</h4>
                                                        <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-lg ${badgeColor}`}>
                                                            {evt.type}
                                                        </span>
                                                    </div>

                                                    {/* Payslip-specific detail */}
                                                    {evt.type === 'payslip' && evt.metadata ? (
                                                        <div className="mt-2 space-y-2">
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                                                {MONTHS[(evt.metadata.month ?? 1) - 1]} {evt.metadata.year} Salary
                                                            </p>
                                                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                                                Status: <span className="capitalize font-semibold text-teal-600 dark:text-teal-400">{evt.metadata.status || 'Processed'}</span>
                                                            </p>
                                                            <Link
                                                                href="/employee/payslips"
                                                                onClick={() => setSelectedDate(null)}
                                                                className="inline-flex items-center gap-1.5 mt-1 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-lg transition-colors"
                                                            >
                                                                <Receipt size={13} />
                                                                View Payslip
                                                            </Link>
                                                        </div>
                                                    ) : (evt.check_in || evt.check_out) ? (
                                                        <div className="flex items-center gap-4 mt-3">
                                                            {evt.check_in && (
                                                                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-xl">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                    In: {new Date(evt.check_in).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}
                                                                </div>
                                                            )}
                                                            {evt.check_out && (
                                                                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-xl">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                    Out: {new Date(evt.check_out).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-slate-500 text-sm mt-1 font-medium">Recorded at 09:00 AM</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
