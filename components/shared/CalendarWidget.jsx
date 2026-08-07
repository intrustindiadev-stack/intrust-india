'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to get days in month
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// Helper to get day of week of 1st day (0 = Sunday, 1 = Monday, etc.)
function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

const EVENT_COLORS = {
    leave: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    meeting: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    follow_up: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    holiday: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
};

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
        // Empty cells before start of month
        for (let i = 0; i < firstDay; i++) {
            grid.push({ empty: true, key: `empty-${i}` });
        }
        // Actual days
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            grid.push({ date: i, fullDate: dateStr, events: dayEvents, key: `day-${i}` });
        }
        return grid;
    }, [year, month, daysInMonth, firstDay, events]);

    const isToday = (d) => {
        const today = new Date();
        return d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    return (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/30 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">
                            {currentDate.toLocaleString('default', { month: 'long' })} {year}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">Schedule & Activities</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
                        Today
                    </button>
                    <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-5 flex-1 overflow-y-auto">
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-2">
                            {day}
                        </div>
                    ))}
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                    {days.map((cell) => {
                        if (cell.empty) {
                            return <div key={cell.key} className="min-h-[100px] rounded-2xl bg-slate-50/50 border border-transparent" />;
                        }

                        const hasEvents = cell.events.length > 0;
                        const active = isToday(cell.date);

                        return (
                            <motion.div
                                key={cell.key}
                                whileHover={{ scale: 0.98 }}
                                onClick={() => {
                                    setSelectedDate(cell.fullDate);
                                    onDateClick?.(cell.fullDate);
                                }}
                                className={`min-h-[100px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col ${
                                    active 
                                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10 shadow-sm' 
                                        : 'border-slate-100 hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/50 bg-white'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`w-7 h-7 flex items-center justify-center rounded-xl text-xs font-bold ${
                                        active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-700'
                                    }`}>
                                        {cell.date}
                                    </span>
                                    {hasEvents && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2.5 mr-1" />
                                    )}
                                </div>
                                
                                <div className="space-y-1 overflow-y-auto flex-1 hide-scrollbar">
                                    {cell.events.map((evt, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`text-[9px] font-bold px-1.5 py-1 rounded-lg border truncate ${EVENT_COLORS[evt.type] || EVENT_COLORS.meeting}`}
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
