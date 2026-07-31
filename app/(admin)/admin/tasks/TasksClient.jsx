'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';
import TaskCard from '@/components/admin/tasks/TaskCard';
import TaskFormModal from '@/components/admin/tasks/TaskFormModal';
import TaskViewModal from '@/components/admin/tasks/TaskViewModal';
import TaskAnalyticsCharts from '@/components/admin/tasks/TaskAnalyticsCharts';
import {
    ClipboardList,
    Plus,
    Loader2,
    RefreshCw,
    Filter,
    CheckCircle2,
    Clock,
    AlertCircle,
    XCircle,
} from 'lucide-react';

const STATUS_FILTERS = [
    { value: 'all', label: 'All', Icon: ClipboardList },
    { value: 'pending', label: 'Pending', Icon: Clock },
    { value: 'in_progress', label: 'In Progress', Icon: AlertCircle },
    { value: 'done', label: 'Done', Icon: CheckCircle2 },
    { value: 'cancelled', label: 'Cancelled', Icon: XCircle },
];

export default function TasksClient({ currentUserId, currentUserRole }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editTask, setEditTask] = useState(null);
    const [viewTask, setViewTask] = useState(null);

    const isManager = ['super_admin', 'admin', 'relationship_manager'].includes(currentUserRole);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/admin/tasks', {
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

    const handleTaskUpdate = (updatedTask) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
    };

    const handleTaskDelete = (taskId) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    const handleTaskSave = (savedTask) => {
        if (editTask) {
            handleTaskUpdate(savedTask);
        } else {
            setTasks(prev => [savedTask, ...prev]);
        }
        setEditTask(null);
    };

    const openEdit = (task) => {
        setEditTask(task);
        setShowModal(true);
    };

    const openCreate = () => {
        setEditTask(null);
        setShowModal(true);
    };

    const filtered = statusFilter === 'all' ? tasks : tasks.filter(t => t.status === statusFilter);

    // Stats
    const counts = tasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            {/* Page Header Graphic Banner */}
            <div className="relative w-full rounded-[2.5rem] bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-8 sm:p-12 overflow-hidden shadow-2xl shadow-blue-900/30 text-white flex flex-col sm:flex-row justify-between items-start sm:items-end gap-8 mb-8">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl transform -translate-x-1/2 pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-white/10 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5 border border-white/20 backdrop-blur-md shadow-lg">
                            <ClipboardList size={14} fill="currentColor" /> Tasks Hub
                        </span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-md">
                        Tasks & Operations
                    </h1>
                    <p className="text-sm font-medium text-blue-100 mt-3 max-w-xl opacity-90 leading-relaxed">
                        {isManager
                            ? 'Create and manage tasks across your team to keep everything moving smoothly.'
                            : 'View and update tasks assigned to you. Stay on top of your responsibilities.'}
                    </p>
                </div>
                
                <div className="relative z-10 flex items-center gap-3">
                    <button
                        onClick={fetchTasks}
                        disabled={loading}
                        className="p-4 rounded-[1.25rem] bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-blue-900 transition-all shadow-lg hover:-translate-y-1 disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {isManager && (
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-2 px-8 py-4 rounded-[1.25rem] bg-white text-blue-900 font-black text-sm hover:bg-gray-50 transition-all shadow-xl shadow-black/10 hover:-translate-y-1"
                        >
                            <Plus size={18} strokeWidth={3} />
                            Assign Task
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Total', value: tasks.length, color: 'text-slate-900', bg: 'bg-slate-100' },
                    { label: 'Pending', value: counts.pending || 0, color: 'text-amber-700', bg: 'bg-amber-50' },
                    { label: 'In Progress', value: counts.in_progress || 0, color: 'text-blue-700', bg: 'bg-blue-50' },
                    { label: 'Done', value: counts.done || 0, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`${bg} rounded-[2rem] px-8 py-6 flex flex-col gap-1 border-none shadow-xl shadow-gray-200/40 hover:-translate-y-1 transition-transform`}>
                        <div className={`text-4xl font-black ${color}`}>{value}</div>
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{label}</div>
                    </div>
                ))}
            </div>

            {/* Task Analytics */}
            {isManager && tasks.length > 0 && <TaskAnalyticsCharts tasks={tasks} />}

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 flex-wrap mb-6">
                {STATUS_FILTERS.map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => setStatusFilter(value)}
                        className={`px-6 py-3 rounded-full text-sm font-black transition-all border-none uppercase tracking-widest shadow-sm hover:shadow-md ${statusFilter === value
                            ? 'bg-slate-900 text-white shadow-slate-900/20'
                            : 'bg-white text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        {label}
                        {value !== 'all' && counts[value] > 0 && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-black/10 text-[10px]">{counts[value]}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Task List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
                    <Loader2 size={32} className="animate-spin" />
                    <p className="text-sm">Loading tasks…</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <AlertCircle size={32} className="text-red-400" />
                    <p className="text-slate-600 font-semibold">{error}</p>
                    <button onClick={fetchTasks} className="text-sm text-red-600 hover:underline font-medium">Try again</button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
                    <ClipboardList size={40} className="opacity-40" />
                    <p className="text-slate-600 font-semibold text-lg">
                        {statusFilter === 'all' ? 'No tasks yet' : `No ${statusFilter.replace('_', ' ')} tasks`}
                    </p>
                    {isManager && statusFilter === 'all' && (
                        <button
                            onClick={openCreate}
                            className="mt-2 text-sm text-red-600 hover:underline font-medium"
                        >
                            Assign the first task →
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filtered.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            isSuperAdmin={isManager}
                            currentUserId={currentUserId}
                            onUpdate={handleTaskUpdate}
                            onDelete={handleTaskDelete}
                            onEdit={openEdit}
                            onView={setViewTask}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            {isManager && (
                <TaskFormModal
                    isOpen={showModal}
                    onClose={() => { setShowModal(false); setEditTask(null); }}
                    onSave={handleTaskSave}
                    editTask={editTask}
                />
            )}

            <TaskViewModal
                isOpen={!!viewTask}
                onClose={() => setViewTask(null)}
                task={viewTask}
            />
        </div>
    );
}
