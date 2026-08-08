'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Users, UserPlus, CheckCircle2, AlertTriangle, 
    ArrowRight, Search, ShieldAlert, Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function UnassignedTab({
    unassignedUsers = [],
    teams = [],
    capabilities = {},
    onAssignMember,
    onSuccess
}) {
    const [search, setSearch] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [batchTargetTeamId, setBatchTargetTeamId] = useState('');
    const [batchAssigning, setBatchAssigning] = useState(false);

    const filteredUsers = unassignedUsers.filter(u =>
        !search ||
        (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.role || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedUserIds(filteredUsers.map(u => u.id));
        } else {
            setSelectedUserIds([]);
        }
    };

    const handleToggleSelect = (userId) => {
        setSelectedUserIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleBatchAssign = async () => {
        if (selectedUserIds.length === 0) {
            toast.error('Select at least one employee to assign');
            return;
        }
        if (!batchTargetTeamId) {
            toast.error('Select a target organization unit');
            return;
        }

        setBatchAssigning(true);
        let successCount = 0;
        try {
            for (const userId of selectedUserIds) {
                const res = await fetch('/api/teams/members', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        team_id: batchTargetTeamId,
                        user_id: userId,
                        reason: 'Batch assignment from Unassigned Employees workspace'
                    })
                });
                if (res.ok) successCount++;
            }

            toast.success(`Assigned ${successCount} employee(s) successfully!`);
            setSelectedUserIds([]);
            setBatchTargetTeamId('');
            onSuccess?.();
        } catch (e) {
            toast.error('Failed to complete batch assignment');
        } finally {
            setBatchAssigning(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Attention Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-amber-900 dark:text-amber-300">
                            {unassignedUsers.length} Unassigned Employee(s)
                        </h3>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                            Staff members who need to be assigned to an organization unit.
                        </p>
                    </div>
                </div>

                {capabilities.canAssignMembers && selectedUserIds.length > 0 && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select
                            value={batchTargetTeamId}
                            onChange={(e) => setBatchTargetTeamId(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        >
                            <option value="">Select Target Unit...</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.region_level})</option>
                            ))}
                        </select>

                        <button
                            onClick={handleBatchAssign}
                            disabled={batchAssigning || !batchTargetTeamId}
                            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
                        >
                            {batchAssigning ? 'Assigning...' : `Assign ${selectedUserIds.length}`}
                        </button>
                    </div>
                )}
            </div>

            {/* Filter & Batch Toolbar */}
            <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between gap-4">
                <div className="relative flex-1 pl-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search unassigned employees..."
                        className="w-full pl-10 pr-4 py-2 bg-transparent text-sm font-medium text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-500"
                    />
                </div>

                {capabilities.canAssignMembers && filteredUsers.length > 0 && (
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center gap-2 pr-4 shrink-0 transition-colors">
                        <input
                            type="checkbox"
                            checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Select All ({filteredUsers.length})
                    </label>
                )}
            </div>

            {/* List / Cards */}
            {filteredUsers.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center text-gray-400 border border-gray-200 dark:border-gray-800 shadow-sm">
                    <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500" />
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">All Staff Assigned!</p>
                    <p className="text-xs text-gray-500 mt-1">There are no unassigned employees requiring organization assignment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map(user => {
                        const isSelected = selectedUserIds.includes(user.id);

                        return (
                            <div
                                key={user.id}
                                className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                                    isSelected
                                        ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-500/50'
                                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-sm'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        {capabilities.canAssignMembers && (
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelect(user.id)}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                                            />
                                        )}
                                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center text-sm shrink-0">
                                            {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                                                {user.full_name || 'Unnamed Employee'}
                                            </h4>
                                            <p className="text-xs text-gray-500">
                                                {user.email || 'No email registered'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                        {user.role?.replace(/_/g, ' ')}
                                    </span>

                                    {capabilities.canAssignMembers && (
                                        <button
                                            onClick={() => onAssignMember?.(null, user)}
                                            className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 font-medium text-xs transition-colors flex items-center gap-1.5"
                                        >
                                            <UserPlus size={14} /> Assign Unit
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
