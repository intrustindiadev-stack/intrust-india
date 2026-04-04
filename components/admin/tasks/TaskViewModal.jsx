'use client';

import { X, CalendarDays, User, AlertCircle } from 'lucide-react';
import TaskStatusBadge from './TaskStatusBadge';
import { format, isPast, parseISO } from 'date-fns';

const priorityConfig = {
    low: { label: 'Low', classes: 'bg-slate-100 text-slate-500' },
    medium: { label: 'Medium', classes: 'bg-blue-100 text-blue-600' },
    high: { label: 'High', classes: 'bg-orange-100 text-orange-600' },
    urgent: { label: 'Urgent', classes: 'bg-red-100 text-red-600' },
};

export default function TaskViewModal({ isOpen, onClose, task }) {
    if (!isOpen || !task) return null;

    const priority = priorityConfig[task.priority] || priorityConfig.medium;
    const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
    const assignedTo = task.assigned_to_profile;
    const assignedBy = task.assigned_by_profile;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header Actions */}
                <div className="flex justify-end p-4 pb-0">
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-8 pb-8 overflow-y-auto hide-scrollbar">
                    <div className="flex items-center gap-2 flex-wrap mb-4 mt-2">
                        <TaskStatusBadge status={task.status} />
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${priority.classes}`}>
                            {priority.label}
                        </span>
                        {isOverdue && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                                <AlertCircle size={12} /> Overdue
                            </span>
                        )}
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 mb-6 leading-snug break-words">{task.title}</h2>

                    <div className="flex flex-wrap gap-x-6 gap-y-3 p-5 bg-slate-50 border border-slate-100 rounded-xl mb-6 text-sm shadow-inner hidden lg:flex">
                        {task.due_date && (
                            <div className="flex flex-col gap-1.5">
                                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Due Date</span>
                                <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-700 font-semibold'}`}>
                                    <CalendarDays size={15} />
                                    {format(parseISO(task.due_date), 'dd MMM yyyy')}
                                </span>
                            </div>
                        )}
                        {assignedTo && (
                            <div className="flex flex-col gap-1.5 border-l border-slate-200 pl-6">
                                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Assigned To</span>
                                <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                    <User size={15} />
                                    {assignedTo.full_name || assignedTo.email}
                                </span>
                            </div>
                        )}
                        {assignedBy && (
                            <div className="flex flex-col gap-1.5 border-l border-slate-200 pl-6">
                                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Created By</span>
                                <span className="flex items-center gap-1.5 text-slate-700 font-semibold whitespace-nowrap">
                                    {assignedBy.full_name || assignedBy.email}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Mobile meta view fallback */}
                    <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-xl mb-6 lg:hidden">
                        {task.due_date && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-semibold">Due Date</span>
                                <span className={`flex items-center gap-1 font-semibold ${isOverdue ? 'text-red-500' : 'text-slate-700'}`}>
                                    <CalendarDays size={14} />
                                    {format(parseISO(task.due_date), 'dd MMM yyyy')}
                                </span>
                            </div>
                        )}
                        {assignedTo && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-semibold">Assigned To</span>
                                <span className="text-slate-700 font-semibold">
                                    {assignedTo.full_name || assignedTo.email}
                                </span>
                            </div>
                        )}
                        {assignedBy && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-semibold">Created By</span>
                                <span className="text-slate-700 font-semibold">
                                    {assignedBy.full_name || assignedBy.email}
                                </span>
                            </div>
                        )}
                    </div>

                    {task.description && (
                        <div>
                            <h3 className="text-slate-800 font-bold mb-3 text-sm tracking-wide uppercase">Full Description</h3>
                            <div className="whitespace-pre-wrap text-slate-600 bg-blue-50/30 border border-slate-100 overflow-hidden shadow-sm rounded-xl p-5 text-[15px] leading-relaxed break-words">
                                {task.description}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
