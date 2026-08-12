'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import CalendarWidget from '@/components/shared/CalendarWidget';
import { motion } from 'framer-motion';

export default function EmployeeCalendarPage() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    const fetchCalendarData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            const rangeStart = new Date(year, month - 1, 1).toISOString().split('T')[0];
            const rangeEnd = new Date(year, month + 2, 0).toISOString().split('T')[0];

            const { data: attendanceData } = await supabase
                .from('attendance')
                .select('work_date, date, status, check_in, check_out')
                .eq('employee_id', user.id)
                .gte('work_date', rangeStart)
                .lte('work_date', rangeEnd);

            const { data: holidaysData } = await supabase
                .from('holidays')
                .select('holiday_date, name')
                .gte('holiday_date', rangeStart)
                .lte('holiday_date', rangeEnd);

            const { data: leavesData } = await supabase
                .from('leave_requests')
                .select('from_date, to_date, leave_type')
                .eq('employee_id', user.id)
                .eq('status', 'approved')
                .gte('from_date', rangeStart)
                .lte('to_date', rangeEnd);

            const { data: salaryData } = await supabase
                .from('salary_records')
                .select('id, year, month, status, net_salary, processed_at')
                .eq('employee_id', user.id)
                .eq('status', 'processed')
                .gte('processed_at', rangeStart)
                .lte('processed_at', rangeEnd);

            const calendarEvents = [];

            if (attendanceData) {
                attendanceData.forEach(record => {
                    if (record.status) {
                        const dateStr = record.work_date || record.date;
                        calendarEvents.push({
                            date: dateStr,
                            type: record.status.toLowerCase() === 'present' ? 'present' : 'absent',
                            title: record.status,
                            check_in: record.check_in,
                            check_out: record.check_out,
                        });
                    }
                });
            }

            if (holidaysData) {
                holidaysData.forEach(h => {
                    calendarEvents.push({
                        date: h.holiday_date,
                        type: 'holiday',
                        title: h.name || 'Holiday'
                    });
                });
            }

            if (leavesData) {
                leavesData.forEach(l => {
                    const start = new Date(l.from_date);
                    const end = new Date(l.to_date);
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        calendarEvents.push({
                            date: d.toISOString().split('T')[0],
                            type: 'leave',
                            title: l.leave_type?.replace(/_/g, ' ') || 'Leave'
                        });
                    }
                });
            }

            if (salaryData) {
                salaryData.forEach(sal => {
                    if (!sal.processed_at) return;
                    calendarEvents.push({
                        date: sal.processed_at.split('T')[0],
                        type: 'payslip',
                        title: 'Payslip Processed',
                        metadata: { id: sal.id, month: sal.month, year: sal.year, status: sal.status }
                    });
                });
            }

            setEvents(calendarEvents);
        } catch (err) {
            console.error('[Employee Calendar] fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user, currentDate]);

    useEffect(() => {
        fetchCalendarData();
    }, [fetchCalendarData]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen font-[family-name:var(--font-outfit)] bg-[#F8FAFC] dark:bg-gray-900 relative">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-[3rem] p-2 sm:p-4 shadow-xl shadow-indigo-100/20 dark:shadow-none border border-white/60 dark:border-gray-700/60 h-[calc(100vh-80px)] min-h-[700px] flex flex-col overflow-hidden w-full max-w-5xl mx-auto"
            >
                {isLoading ? (
                    <div className="flex-1 w-full h-full flex flex-col p-4 sm:p-8 animate-pulse">
                        <div className="flex justify-between items-center mb-8">
                            <div className="h-8 w-48 bg-slate-200 dark:bg-gray-700 rounded-xl"></div>
                            <div className="h-10 w-32 bg-slate-200 dark:bg-gray-700 rounded-2xl"></div>
                        </div>
                        <div className="grid grid-cols-7 gap-2 mb-4">
                            {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className="h-6 bg-slate-200 dark:bg-gray-700 rounded-md"></div>)}
                        </div>
                        <div className="flex-1 grid grid-cols-7 gap-2">
                            {Array.from({length: 35}).map((_, i) => (
                                <div key={i} className="bg-slate-100 dark:bg-gray-800/50 rounded-2xl border border-slate-200/50 dark:border-gray-700/50"></div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden bg-transparent rounded-[2.5rem]">
                        <CalendarWidget 
                            events={events} 
                            currentDate={currentDate} 
                            onDateChange={setCurrentDate} 
                        />
                    </div>
                )}
            </motion.div>
        </div>
    );
}
