'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';
import {
    ClipboardList,
    Plus,
    Loader2,
    RefreshCw,
    CheckCircle2,
    Clock,
    AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_FILTERS = [
    { value: 'all', label: 'All', Icon: ClipboardList },
    { value: 'pending', label: 'Pending', Icon: Clock },
    { value: 'completed', label: 'Completed', Icon: CheckCircle2 },
];

export default function CRMTasksClient({ currentUserId, currentUserRole }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');

    const isManager = ['sales_manager', 'admin', 'super_admin'].includes(currentUserRole);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/crm/tasks', {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store',
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setTasks(json.tasks || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleTaskToggle = async (taskId, currentStatus) => {
        const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`/api/crm/tasks/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
        } catch (err) {
            console.error(err);
            // Revert on error
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: currentStatus } : t));
        }
    };

    const filtered = statusFilter === 'all' ? tasks : tasks.filter(t => t.status === statusFilter);

    // Stats
    const counts = tasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 font-[family-name:var(--font-outfit)]">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">CRM Tasks</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {isManager
                            ? 'Manage and oversee sales tasks across your team.'
                            : 'View and update your pending follow-ups and tasks.'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchTasks}
                        disabled={loading}
                        className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {isManager && (
                        <button
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                        >
                            <Plus size={16} />
                            Create Task
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Total', value: tasks.length, color: 'text-gray-900', bg: 'bg-white shadow-sm border border-gray-100' },
                    { label: 'Pending', value: counts.pending || 0, color: 'text-amber-600', bg: 'bg-amber-50/50 border border-amber-100' },
                    { label: 'Completed', value: counts.completed || 0, color: 'text-emerald-600', bg: 'bg-emerald-50/50 border border-emerald-100' },
                ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`${bg} rounded-2xl px-6 py-5 flex flex-col gap-1`}>
                        <div className={`text-3xl font-black ${color}`}>{value}</div>
                        <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">{label}</div>
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 flex-wrap mb-6">
                {STATUS_FILTERS.map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => setStatusFilter(value)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors border shadow-sm ${statusFilter === value
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-900'
                            }`}
                    >
                        {label}
                        {value !== 'all' && counts[value] > 0 && (
                            <span className="ml-2 px-2 py-0.5 rounded-md bg-white/20 text-xs">
                                {counts[value]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Task List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
                    <Loader2 size={32} className="animate-spin text-indigo-500" />
                    <p className="text-sm font-medium">Loading your tasks…</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 bg-red-50/50 rounded-3xl border border-red-100">
                    <AlertCircle size={32} className="text-red-400" />
                    <p className="text-red-900 font-semibold">{error}</p>
                    <button onClick={fetchTasks} className="text-sm text-red-600 hover:underline font-medium">Try again</button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4 bg-gray-50/50 rounded-3xl border border-gray-100 border-dashed">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-400">
                        <ClipboardList size={32} />
                    </div>
                    <p className="text-gray-500 font-semibold text-lg">
                        {statusFilter === 'all' ? 'No tasks found' : `No ${statusFilter} tasks`}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filtered.map(task => (
                            <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`group relative bg-white rounded-3xl p-6 border shadow-sm transition-all hover:shadow-md ${task.status === 'completed' ? 'border-emerald-100 opacity-75' : 'border-gray-200'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div 
                                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                            task.status === 'pending' 
                                            ? 'bg-amber-100 text-amber-700' 
                                            : 'bg-emerald-100 text-emerald-700'
                                        }`}
                                    >
                                        {task.status}
                                    </div>
                                    <button 
                                        onClick={() => handleTaskToggle(task.id, task.status)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                            task.status === 'pending' 
                                            ? 'bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 text-gray-400' 
                                            : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                        }`}
                                    >
                                        <CheckCircle2 size={18} />
                                    </button>
                                </div>
                                
                                <h3 className={`text-lg font-bold text-gray-900 mb-2 ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                                    {task.title}
                                </h3>
                                
                                {task.description && (
                                    <p className="text-sm text-gray-500 font-medium mb-4 line-clamp-2">
                                        {task.description}
                                    </p>
                                )}

                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                    {task.lead ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center font-bold text-xs">
                                                {task.lead.full_name?.charAt(0)}
                                            </div>
                                            <div className="text-xs font-semibold text-gray-600 truncate max-w-[120px]">
                                                {task.lead.full_name}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs font-semibold text-gray-400 italic">No Lead</span>
                                    )}

                                    {isManager && task.assigned_to_profile && (
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                                            <span>Assigned to:</span>
                                            <span className="text-indigo-600">{task.assigned_to_profile.full_name.split(' ')[0]}</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
