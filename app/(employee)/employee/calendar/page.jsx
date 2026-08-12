'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import CalendarWidget from '@/components/shared/CalendarWidget';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export default function EmployeeCalendarPage() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCalendarData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Date range: 1 month before → 2 months ahead (3-month window)
            const now = new Date();
            const rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
            const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split('T')[0];

            // Own attendance — use work_date (canonical IST date), bounded to 3-month window
            const { data: attendanceData } = await supabase
                .from('attendance')
                .select('work_date, date, status, check_in, check_out')
                .eq('employee_id', user.id)
                .gte('work_date', rangeStart)
                .lte('work_date', rangeEnd);

            // Org-wide holidays (date-bounded)
            const { data: holidaysData } = await supabase
                .from('holidays')
                .select('holiday_date, name')
                .gte('holiday_date', rangeStart)
                .lte('holiday_date', rangeEnd);

            // Own approved leaves (date-bounded)
            const { data: leavesData } = await supabase
                .from('leave_requests')
                .select('from_date, to_date, leave_type')
                .eq('employee_id', user.id)
                .eq('status', 'approved')
                .gte('from_date', rangeStart)
                .lte('to_date', rangeEnd);

            const calendarEvents = [];

            if (attendanceData) {
                attendanceData.forEach(record => {
                    if (record.status) {
                        // Use work_date (IST canonical date) falling back to date
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
                    // Use new Date(start) to avoid mutating the iterator variable
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        calendarEvents.push({
                            date: d.toISOString().split('T')[0],
                            type: 'leave',
                            title: l.leave_type?.replace(/_/g, ' ') || 'Leave'
                        });
                    }
                });
            }

            setEvents(calendarEvents);
        } catch (err) {
            console.error('[Employee Calendar] fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchCalendarData();
    }, [fetchCalendarData]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen font-[family-name:var(--font-outfit)] bg-[#F8FAFC] dark:bg-gray-900">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 shadow-sm border border-gray-200 dark:border-gray-700 h-[calc(100vh-140px)] min-h-[600px] flex flex-col overflow-hidden">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">My Calendar</h1>
                {isLoading ? (
                    <div className="animate-pulse flex-1 bg-gray-50/50 dark:bg-gray-900/50 rounded-3xl"></div>
                ) : (
                    <div className="flex-1 overflow-hidden">
                        <CalendarWidget events={events} />
                    </div>
                )}
            </div>
        </div>
    );
}
