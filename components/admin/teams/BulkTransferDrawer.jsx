'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowRight, Users, Check, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { friendlyTeamError } from '@/components/admin/teams/teamErrorMessages';

export default function BulkTransferDrawer({
    teams = [],
    onClose,
    onSuccess
}) {
    const activeTeams = teams.filter(t => t.is_active !== false);

    const [sourceTeamId, setSourceTeamId] = useState('');
    const [targetTeamId, setTargetTeamId] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const sourceTeam = activeTeams.find(t => t.id === sourceTeamId);
    const sourceMembers = sourceTeam?.members || [];

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedUserIds(sourceMembers.map(m => m.user.id));
        } else {
            setSelectedUserIds([]);
        }
    };

    const handleToggleUser = (userId) => {
        setSelectedUserIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!sourceTeamId || !targetTeamId) {
            toast.error('Source and Target teams are required');
            return;
        }
        if (sourceTeamId === targetTeamId) {
            toast.error('Source and Target teams must be different');
            return;
        }
        if (selectedUserIds.length === 0) {
            toast.error('Select at least one member to transfer');
            return;
        }
        if (!reason.trim()) {
            toast.error('A reason is required for bulk transfers');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/teams/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_team_id: sourceTeamId,
                    target_team_id: targetTeamId,
                    user_ids: selectedUserIds,
                    reason: reason.trim()
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(friendlyTeamError(data.error, data.code));

            toast.success(`Successfully transferred ${data.transferred_count} member(s)!`);
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(friendlyTeamError(err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end">
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                            <Users className="text-indigo-600" size={22} />
                            Bulk Member Transfer
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Transfer multiple team members atomically with audit trail
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Teams Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1.5">
                                Source Unit <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={sourceTeamId}
                                onChange={(e) => {
                                    setSourceTeamId(e.target.value);
                                    setSelectedUserIds([]);
                                }}
                                required
                                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            >
                                <option value="">Select source team...</option>
                                {activeTeams.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} ({t.members?.length || 0} members)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1.5">
                                Target Unit <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={targetTeamId}
                                onChange={(e) => setTargetTeamId(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            >
                                <option value="">Select target team...</option>
                                {activeTeams.filter(t => t.id !== sourceTeamId).map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} ({t.region_level})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Member Selection List */}
                    {sourceTeamId && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                                    Select Members to Move ({selectedUserIds.length}/{sourceMembers.length})
                                </label>
                                {sourceMembers.length > 0 && (
                                    <label className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1.5">
                                        <input
                                            type="checkbox"
                                            checked={selectedUserIds.length === sourceMembers.length && sourceMembers.length > 0}
                                            onChange={handleSelectAll}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        Select All
                                    </label>
                                )}
                            </div>

                            {sourceMembers.length === 0 ? (
                                <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs font-medium text-slate-500">
                                    No active members found in this team.
                                </div>
                            ) : (
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                    {sourceMembers.map(m => {
                                        const isLead = sourceTeam?.team_lead_id === m.user.id;
                                        return (
                                            <label
                                                key={m.user.id}
                                                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors ${
                                                    selectedUserIds.includes(m.user.id)
                                                        ? 'bg-indigo-50/60 border-indigo-200'
                                                        : 'bg-white border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUserIds.includes(m.user.id)}
                                                        onChange={() => handleToggleUser(m.user.id)}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                            {m.user.full_name}
                                                            {isLead && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-extrabold">
                                                                    LEAD
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 capitalize">{m.user.role?.replace(/_/g, ' ')}</p>
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reason */}
                    <div>
                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 block mb-1.5">
                            Reason for Transfer <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            placeholder="e.g. Reorganizing Bhopal sales territory..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || selectedUserIds.length === 0 || !targetTeamId}
                        className={`px-5 py-2.5 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 ${
                            loading || selectedUserIds.length === 0 || !targetTeamId ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                    >
                        {loading ? (
                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <ArrowRight size={16} />
                        )}
                        Transfer {selectedUserIds.length} Member(s)
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
