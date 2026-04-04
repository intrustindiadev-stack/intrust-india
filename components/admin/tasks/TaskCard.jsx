'use client';

import { useState } from 'react';
import {
    CalendarDays,
    AlertCircle,
    CheckCircle2,
    Clock,
    Loader2,
    Trash2,
    Edit3,
    User,
} from 'lucide-react';
import TaskStatusBadge from './TaskStatusBadge';
import { createClient } from '@/lib/supabaseClient';
import { format, isPast, parseISO } from 'date-fns';

const priorityConfig = {
    low:    { label: 'Low',    classes: 'bg-slate-100 text-slate-500' },
    medium: { label: 'Medium', classes: 'bg-blue-100 text-blue-600' },
    high:   { label: 'High',   classes: 'bg-orange-100 text-orange-600' },
    urgent: { label: 'Urgent', classes: 'bg-red-100 text-red-600' },
};

export default function TaskCard({ task, isSuperAdmin, currentUserId, onUpdate, onDelete, onEdit, onView }) {
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const isAssignedToMe = task.assigned_to === currentUserId;
    const priority = priorityConfig[task.priority] || priorityConfig.medium;
    const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';

    const statusOptions = ['pending', 'in_progress', 'done', 'cancelled'];

    const getSession = async () => {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    };

    const handleStatusChange = async (newStatus) => {
        if (!isAssignedToMe && !isSuperAdmin) return;
        setLoading(true);
        try {
            const token = await getSession();
            const res = await fetch(`/api/admin/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            onUpdate?.(json.task);
        } catch (err) {
            console.error('Error updating task status:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete task "${task.title}"? This can't be undone.`)) return;
        setDeleting(true);
        try {
            const token = await getSession();
            const res = await fetch(`/api/admin/tasks/${task.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error);
            }
            onDelete?.(task.id);
        } catch (err) {
            console.error('Error deleting task:', err);
        } finally {
            setDeleting(false);
        }
    };

    const assignedTo = task.assigned_to_profile;
    const assignedBy = task.assigned_by_profile;

    return (
        <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow ${isOverdue ? 'border-red-200' : 'border-slate-200'}`}>
            {/* Header */}
            <div 
                className="flex items-start justify-between gap-3 cursor-pointer group"
                onClick={() => onView?.(task)}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <TaskStatusBadge status={task.status} />
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${priority.classes}`}>
                            {priority.label}
                        </span>
                        {isOverdue && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                                <AlertCircle size={10} /> Overdue
                            </span>
                        )}
                    </div>
                    <h3 className="text-slate-900 font-bold text-base leading-tight group-hover:text-blue-600 transition-colors">{task.title}</h3>
                    {task.description && (
                        <p className="text-slate-500 text-sm mt-1 line-clamp-2">
                            {task.description}
                        </p>
                    )}
                </div>

                {/* Super admin actions */}
                {isSuperAdmin && (
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => onEdit?.(task)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit task"
                        >
                            <Edit3 size={15} />
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Delete task"
                        >
                            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                    </div>
                )}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                {task.due_date && (
                    <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                        <CalendarDays size={12} />
                        Due {format(parseISO(task.due_date), 'dd MMM yyyy')}
                    </span>
                )}
                {assignedTo && (
                    <span className="flex items-center gap-1">
                        <User size={12} />
                        {assignedTo.full_name || assignedTo.email}
                    </span>
                )}
                {assignedBy && isSuperAdmin && (
                    <span className="flex items-center gap-1 text-slate-400">
                        by {assignedBy.full_name || assignedBy.email}
                    </span>
                )}
            </div>

            {/* Status Switcher (visible to assignee and super admin) */}
            {(isAssignedToMe || isSuperAdmin) && task.status !== 'done' && task.status !== 'cancelled' && (
                <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-2">
                    {statusOptions.filter(s => s !== task.status).map((s) => (
                        <button
                            key={s}
                            onClick={() => handleStatusChange(s)}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors disabled:opacity-60"
                        >
                            {loading ? <Loader2 size={12} className="animate-spin" /> : null}
                            {s === 'in_progress' ? 'Start' : s === 'done' ? 'Mark Done' : s === 'cancelled' ? 'Cancel' : s === 'pending' ? 'Reset' : s}
                        </button>
                    ))}
                </div>
            )}

            {task.status === 'done' && (
                <div className="border-t border-emerald-100 pt-3 flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                    <CheckCircle2 size={14} /> Completed
                </div>
            )}
        </div>
    );
}
