'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';
import TaskCard from '@/components/admin/tasks/TaskCard';
import TaskFormModal from '@/components/admin/tasks/TaskFormModal';
import TaskViewModal from '@/components/admin/tasks/TaskViewModal';
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

    const isSuperAdmin = currentUserRole === 'super_admin';

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            {/* Page Header */}
            <div className="flex items-start justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tasks</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {isSuperAdmin
                            ? 'Create and manage admin tasks across your team.'
                            : 'View and update tasks assigned to you.'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchTasks}
                        disabled={loading}
                        className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {isSuperAdmin && (
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                        >
                            <Plus size={16} />
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
                    <div key={label} className={`${bg} rounded-2xl px-5 py-4 flex flex-col gap-1`}>
                        <div className={`text-2xl font-black ${color}`}>{value}</div>
                        <div className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{label}</div>
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 flex-wrap mb-6">
                {STATUS_FILTERS.map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => setStatusFilter(value)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${statusFilter === value
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                            }`}
                    >
                        {label}
                        {value !== 'all' && counts[value] > 0 && (
                            <span className="ml-1.5 text-xs opacity-70">{counts[value]}</span>
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
                    {isSuperAdmin && statusFilter === 'all' && (
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
                            isSuperAdmin={isSuperAdmin}
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
            {isSuperAdmin && (
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
