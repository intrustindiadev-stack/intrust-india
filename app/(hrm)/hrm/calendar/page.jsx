'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import CalendarWidget from '@/components/shared/CalendarWidget';
import { Users, CalendarDays } from 'lucide-react';

export default function HRMCalendarPage() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [leaveCount, setLeaveCount] = useState(0);

    const fetchCalendarData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Date range: 1 month before → 2 months ahead (3-month window)
            const now = new Date();
            const rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
            const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split('T')[0];

            // Org-wide holidays (date-bounded)
            const { data: holidaysData } = await supabase
                .from('holidays')
                .select('holiday_date, name')
                .gte('holiday_date', rangeStart)
                .lte('holiday_date', rangeEnd);

            // Org-wide approved leaves with employee names
            // HR role can see all leave_requests via RLS policy
            const { data: leavesData } = await supabase
                .from('leave_requests')
                .select('from_date, to_date, leave_type, user_profiles!employee_id(full_name)')
                .eq('status', 'approved')
                .gte('from_date', rangeStart)
                .lte('to_date', rangeEnd)
                .order('from_date', { ascending: true });

            // Pending leaves awaiting HR review (visible to HR for awareness)
            const { data: pendingLeavesData } = await supabase
                .from('leave_requests')
                .select('from_date, to_date, leave_type, user_profiles!employee_id(full_name)')
                .eq('status', 'pending_hr_review')
                .gte('from_date', rangeStart)
                .lte('to_date', rangeEnd)
                .order('from_date', { ascending: true });

            const calendarEvents = [];

            // Holidays
            if (holidaysData) {
                holidaysData.forEach(h => {
                    calendarEvents.push({ date: h.holiday_date, type: 'holiday', title: h.name || 'Holiday' });
                });
            }

            // Expand approved leaves into daily events
            let approvedCount = 0;
            if (leavesData) {
                leavesData.forEach(l => {
                    const name = l.user_profiles?.full_name || 'Employee';
                    const leaveLabel = l.leave_type?.replace(/_/g, ' ') || 'Leave';
                    const start = new Date(l.from_date);
                    const end = new Date(l.to_date);
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        calendarEvents.push({
                            date: d.toISOString().split('T')[0],
                            type: 'leave',
                            title: `${name} — ${leaveLabel}`
                        });
                    }
                    approvedCount++;
                });
            }

            // Expand pending leaves into daily events (distinct type)
            if (pendingLeavesData) {
                pendingLeavesData.forEach(l => {
                    const name = l.user_profiles?.full_name || 'Employee';
                    const leaveLabel = l.leave_type?.replace(/_/g, ' ') || 'Leave';
                    const start = new Date(l.from_date);
                    const end = new Date(l.to_date);
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        calendarEvents.push({
                            date: d.toISOString().split('T')[0],
                            type: 'pending',
                            title: `${name} — Pending ${leaveLabel}`
                        });
                    }
                });
            }

            setLeaveCount(approvedCount);
            setEvents(calendarEvents);
        } catch (err) {
            console.error('[HRM Calendar] fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchCalendarData();
    }, [fetchCalendarData]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-[family-name:var(--font-outfit)] bg-[#F8FAFC] dark:bg-gray-900">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-5">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <CalendarDays size={28} className="text-indigo-500" /> Workforce Calendar
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Company-wide holidays and approved employee leaves.
                    </p>
                </div>
                {leaveCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-2xl border border-indigo-200/50 dark:border-indigo-700/30 text-sm font-bold">
                        <Users size={16} /> {leaveCount} approved {leaveCount === 1 ? 'leave' : 'leaves'} this period
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 shadow-sm border border-gray-200 dark:border-gray-700 h-[calc(100vh-200px)] min-h-[550px] flex flex-col overflow-hidden">
                {isLoading ? (
                    <div className="animate-pulse flex-1 bg-gray-50/50 dark:bg-gray-900/50 rounded-3xl" />
                ) : (
                    <div className="flex-1 overflow-hidden">
                        <CalendarWidget events={events} />
                    </div>
                )}
            </div>
        </div>
    );
}
