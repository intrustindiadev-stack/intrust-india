'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { fetchAllUsersWithRoles, updateUserRole } from '@/app/actions/admin-crm';
import {
    Search, Loader2, CheckCircle, AlertCircle, Shield, ShieldAlert,
    Users, ChevronLeft, ChevronRight, RefreshCw, Lock, Info
} from 'lucide-react';

const ROLE_OPTIONS = [
    { value: 'customer', label: 'Customer', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    { value: 'merchant', label: 'Merchant', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { value: 'employee', label: 'Employee', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    { value: 'sales_exec', label: 'Sales Exec', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { value: 'sales_manager', label: 'Sales Manager', color: 'bg-violet-50 text-violet-700 border-violet-200' },
    { value: 'hr_manager', label: 'HR Manager', color: 'bg-pink-50 text-pink-700 border-pink-200' },
    { value: 'admin', label: 'Admin', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { value: 'super_admin', label: 'Super Admin', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const getRoleBadge = (role) => {
    const opt = ROLE_OPTIONS.find(r => r.value === role);
    return opt || { value: role, label: role, color: 'bg-gray-100 text-gray-700 border-gray-200' };
};

export default function UserRoleManager({ currentAdminId }) {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [toast, setToast] = useState({ message: '', type: '' });
    const [isPending, startTransition] = useTransition();
    const limit = 15;

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: '' }), 4000);
    }, []);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await fetchAllUsersWithRoles(page, debouncedSearch, limit);
            if (result.error) {
                showToast(result.error, 'error');
            } else {
                setUsers(result.data || []);
                setTotal(result.total || 0);
            }
        } catch (err) {
            showToast('Failed to load users', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [page, debouncedSearch, showToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const handleRoleChange = async (userId, newRole) => {
        // Self-lockout guard in UI
        if (userId === currentAdminId && !['admin', 'super_admin'].includes(newRole)) {
            showToast('Cannot remove your own admin privileges', 'error');
            return;
        }

        setUpdatingId(userId);

        // Optimistic update
        const prevUsers = [...users];
        setUsers(users.map(u =>
            u.id === userId ? { ...u, role: newRole } : u
        ));

        startTransition(async () => {
            const result = await updateUserRole(userId, newRole);
            if (!result.success) {
                // Rollback
                setUsers(prevUsers);
                showToast(result.error || 'Failed to update role', 'error');
            } else {
                showToast(result.message || 'Role updated successfully', 'success');
            }
            setUpdatingId(null);
        });
    };

    const totalPages = Math.ceil(total / limit);
    const isSelf = (userId) => userId === currentAdminId;

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Toast */}
            {toast.message && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-sm font-bold transition-all animate-fade-in ${
                    toast.type === 'error'
                        ? 'bg-red-600 text-white'
                        : 'bg-emerald-600 text-white'
                }`}>
                    {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-rose-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Shield size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Role Management</h2>
                            <p className="text-xs text-gray-500 font-medium">Manage user roles and access levels</p>
                        </div>
                    </div>
                    <button
                        onClick={() => loadData()}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold transition-colors border border-gray-200"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {/* Info Banner */}
                <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                    <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 font-medium">
                        Role changes take effect on the user&apos;s next page load. You cannot remove your own admin privileges. Only Super Admins can grant the Super Admin role.
                    </p>
                </div>

                {/* Search */}
                <div className="relative mt-4">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        className="w-full sm:w-96 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/80 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-100">
                        <tr>
                            <th className="p-4 pl-6">User</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4">Current Role</th>
                            <th className="p-4 min-w-[200px]">Change Role</th>
                            <th className="p-4 pr-6">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i}>
                                    <td colSpan="5" className="p-4">
                                        <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                                    </td>
                                </tr>
                            ))
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                                            <Users size={24} className="text-gray-400" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-900">No users found</p>
                                        <p className="text-xs text-gray-500">Try adjusting your search</p>
                                    </div>
                                </td>
                            </tr>
                        ) : users.map(user => {
                            const badge = getRoleBadge(user.role);
                            const selfRow = isSelf(user.id);

                            return (
                                <tr key={user.id} className={`transition-colors group ${selfRow ? 'bg-purple-50/30' : 'hover:bg-gray-50/60'}`}>
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                                selfRow
                                                    ? 'bg-gradient-to-br from-purple-500 to-rose-500 text-white shadow-sm'
                                                    : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700'
                                            }`}>
                                                {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {user.full_name || 'N/A'}
                                                    </p>
                                                    {selfRow && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                                            <Lock size={8} /> YOU
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-gray-600">{user.email || '—'}</p>
                                            <p className="text-xs text-gray-400">{user.phone || '—'}</p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-lg border capitalize ${badge.color}`}>
                                            {badge.label}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {updatingId === user.id ? (
                                            <div className="flex items-center gap-2 text-purple-600 py-2">
                                                <Loader2 size={14} className="animate-spin" />
                                                <span className="text-xs font-bold">Updating...</span>
                                            </div>
                                        ) : (
                                            <div className="relative group/select">
                                                <select
                                                    value={user.role}
                                                    onChange={e => handleRoleChange(user.id, e.target.value)}
                                                    disabled={selfRow}
                                                    className={`w-full text-sm border rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 p-2.5 transition-all font-medium ${
                                                        selfRow
                                                            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                                                            : 'bg-white border-gray-200 text-gray-800 hover:border-purple-300'
                                                    }`}
                                                    title={selfRow ? 'Cannot change your own role' : 'Select a new role'}
                                                >
                                                    {ROLE_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                {selfRow && (
                                                    <div className="absolute -top-8 left-0 hidden group-hover/select:flex items-center gap-1.5 px-2.5 py-1 bg-gray-900 text-white text-[10px] font-bold rounded-lg shadow-lg whitespace-nowrap z-10">
                                                        <ShieldAlert size={10} />
                                                        Self-lockout protection — cannot change your own role
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 pr-6 text-xs text-gray-500 font-medium">
                                        {new Date(user.created_at).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'short', year: '2-digit'
                                        })}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-4 sm:px-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm text-gray-500 font-medium">
                        Showing <span className="font-bold text-gray-900">{users.length}</span> of <span className="font-bold text-gray-900">{total}</span> users
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-bold text-gray-700 px-3">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
