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
    present: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    absent: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
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
            const isSunday = new Date(year, month, i).getDay() === 0;
            grid.push({ date: i, fullDate: dateStr, events: dayEvents, isSunday, key: `day-${i}` });
        }
        return grid;
    }, [year, month, daysInMonth, firstDay, events]);

    const isToday = (d) => {
        const today = new Date();
        return d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    return (
        <div className="bg-white flex flex-col h-full">
            {/* Header */}
            <div className="px-2 py-4 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                        {currentDate.toLocaleString('default', { month: 'long' })} {year}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-all">
                        <ChevronLeft size={20} strokeWidth={2.5} />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">
                        Today
                    </button>
                    <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-all">
                        <ChevronRight size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-y-auto hide-scrollbar">
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                        <div key={day} className={`text-center text-[10px] font-bold uppercase tracking-wider pb-2 ${i === 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                            {day}
                        </div>
                    ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                    {days.map((cell) => {
                        if (cell.empty) {
                            return <div key={cell.key} className="min-h-[90px] bg-transparent" />;
                        }

                        const hasEvents = cell.events.length > 0;
                        const active = isToday(cell.date);

                        return (
                            <motion.div
                                key={cell.key}
                                whileHover={{ scale: 0.97 }}
                                onClick={() => {
                                    setSelectedDate(cell.fullDate);
                                    onDateClick?.(cell.fullDate);
                                }}
                                className={`min-h-[90px] p-2 rounded-2xl transition-colors cursor-pointer flex flex-col ${
                                    active 
                                        ? 'bg-gray-50' 
                                        : cell.isSunday 
                                            ? 'hover:bg-rose-50/30' 
                                            : 'hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold ${
                                        active ? 'bg-black text-white' : 
                                        cell.isSunday ? 'text-rose-500' : 'text-gray-700'
                                    }`}>
                                        {cell.date}
                                    </span>
                                    {hasEvents && !active && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 mr-1" />
                                    )}
                                </div>
                                
                                <div className="space-y-1 overflow-y-auto flex-1 hide-scrollbar">
                                    {cell.events.map((evt, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`text-[10px] font-medium px-2 py-1 rounded-md truncate ${EVENT_COLORS[evt.type] || EVENT_COLORS.meeting}`}
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
