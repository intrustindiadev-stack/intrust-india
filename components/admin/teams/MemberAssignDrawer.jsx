'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, UserPlus, Search, UserCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { friendlyTeamError } from '@/components/admin/teams/teamErrorMessages';

export default function MemberAssignDrawer({
    team,
    availableUsers = [],
    onClose,
    onMemberAssigned
}) {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const filteredUsers = availableUsers.filter(u =>
        !search ||
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const handleAssign = async (userIdToAssign) => {
        const targetUserId = userIdToAssign || selectedUserId;
        if (!targetUserId) {
            toast.error('Please select a member to assign');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/teams/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_id: team.id,
                    user_id: targetUserId
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(friendlyTeamError(result.error, result.code));

            toast.success('Member assigned successfully!');
            onMemberAssigned?.(team.id, result.user);
            onClose();
        } catch (err) {
            toast.error(friendlyTeamError(err.message));
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full max-w-md bg-white flex flex-col h-full shadow-2xl"
            >
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Assign to Workforce</h2>
                        <p className="text-xs text-indigo-600 font-semibold mt-0.5">{team?.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <div className="relative">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search sales executives / managers..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-2">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <UserCheck size={36} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-semibold text-slate-600">No available unassigned sales reps</p>
                            <p className="text-xs text-slate-400 mt-1">All reps are already in a team or no matching users found.</p>
                        </div>
                    ) : (
                        filteredUsers.map(u => (
                            <div
                                key={u.id}
                                onClick={() => setSelectedUserId(u.id)}
                                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                                    selectedUserId === u.id
                                        ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                                        {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 leading-tight">
                                            {u.full_name || u.email}
                                        </p>
                                        <p className="text-xs text-slate-400 font-medium capitalize">
                                            {u.role?.replace('_', ' ')}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAssign(u.id); }}
                                    disabled={saving}
                                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors flex items-center gap-1"
                                >
                                    <UserPlus size={12} /> Assign
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-5 border-t border-slate-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-sm">
                        Cancel
                    </button>
                    <button
                        onClick={() => handleAssign()}
                        disabled={!selectedUserId || saving}
                        className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Assignment'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
