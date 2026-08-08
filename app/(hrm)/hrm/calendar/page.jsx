'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import CalendarWidget from '@/components/shared/CalendarWidget';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export default function HRMCalendarPage() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCalendarData = useCallback(async () => {
        if (!user) return;
        try {
            // Fetch attendance for current user
            const { data: attendanceData } = await supabase
                .from('attendance')
                .select('date, status')
                .eq('employee_id', user.id);
            
            // Fetch holidays
            const { data: holidaysData } = await supabase
                .from('holidays')
                .select('holiday_date, name');

            // Fetch approved leaves
            const { data: leavesData } = await supabase
                .from('leave_requests')
                .select('from_date, to_date, leave_type')
                .eq('employee_id', user.id)
                .eq('status', 'approved');

            const calendarEvents = [];

            if (attendanceData) {
                attendanceData.forEach(record => {
                    if (record.status) {
                        calendarEvents.push({
                            date: record.date,
                            type: record.status.toLowerCase() === 'present' ? 'present' : 'absent',
                            title: record.status
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
                    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
                        calendarEvents.push({
                            date: d.toISOString().split('T')[0],
                            type: 'leave',
                            title: l.leave_type || 'Leave'
                        });
                    }
                });
            }

            setEvents(calendarEvents);
        } catch (err) {
            console.error('Calendar fetch error:', err);
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
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">HRM Calendar</h1>
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
