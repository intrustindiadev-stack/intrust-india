'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

export default function TaskFormModal({ isOpen, onClose, onSave, editTask = null }) {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        assigned_to: '',
        priority: 'medium',
        due_date: '',
    });

    useEffect(() => {
        if (isOpen) fetchAdmins();
    }, [isOpen]);

    useEffect(() => {
        if (editTask) {
            setForm({
                title: editTask.title || '',
                description: editTask.description || '',
                assigned_to: editTask.assigned_to || '',
                priority: editTask.priority || 'medium',
                due_date: editTask.due_date ? editTask.due_date.split('T')[0] : '',
            });
        } else {
            setForm({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
        }
    }, [editTask, isOpen]);

    const fetchAdmins = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/admin/admins', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to fetch admins');
            }

            const json = await res.json();
            setAdmins(json.admins || []);
        } catch (err) {
            console.error('Error fetching admins:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.assigned_to) return;

        setSubmitting(true);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const url = editTask ? `/api/admin/tasks/${editTask.id}` : '/api/admin/tasks';
            const method = editTask ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    ...form,
                    due_date: form.due_date || null,
                }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error);

            onSave?.(json.task);
            onClose?.();
        } catch (err) {
            console.error('Task submit error:', err);
            alert(err.message || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900 text-lg">
                        {editTask ? 'Edit Task' : 'Assign New Task'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Task Title *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="e.g. Review merchant KYC documents"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none text-sm text-slate-900 placeholder-slate-400 transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Optional — provide additional context or steps"
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none text-sm text-slate-900 placeholder-slate-400 transition-all resize-none"
                        />
                    </div>

                    {/* Assign To */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assign To *</label>
                        {loading ? (
                            <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                                <Loader2 size={14} className="animate-spin" /> Loading admins…
                            </div>
                        ) : (
                            <select
                                value={form.assigned_to}
                                onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none text-sm text-slate-900 transition-all"
                            >
                                <option value="">Select an admin…</option>
                                {admins.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.full_name || a.email} ({a.role === 'super_admin' ? 'Super Admin' : 'Admin'})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Priority + Due Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Priority</label>
                            <select
                                value={form.priority}
                                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none text-sm text-slate-900 transition-all capitalize"
                            >
                                {PRIORITY_OPTIONS.map(p => (
                                    <option key={p} value={p} className="capitalize">{p}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Due Date</label>
                            <input
                                type="date"
                                value={form.due_date}
                                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none text-sm text-slate-900 transition-all"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !form.title || !form.assigned_to}
                            className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {submitting && <Loader2 size={16} className="animate-spin" />}
                            {editTask ? 'Save Changes' : 'Assign Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
