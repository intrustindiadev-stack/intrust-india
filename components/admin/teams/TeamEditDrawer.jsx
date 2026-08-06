'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Crown, Palette, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmModal from '@/components/admin/teams/ConfirmModal';
import { friendlyTeamError } from '@/components/admin/teams/teamErrorMessages';

const REGION_LEVELS = [
    { id: 'state', label: 'State Level' },
    { id: 'city', label: 'City Level' },
    { id: 'area', label: 'Area Level' },
];

const PRESET_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#10b981', '#06b6d4',
];

export default function TeamEditDrawer({
    team,
    teams = [],
    availableLeads = [],
    onClose,
    onUpdated,
    onDeleted
}) {
    const [form, setForm] = useState({
        name: team?.name || '',
        description: team?.description || '',
        region_level: team?.region_level || 'area',
        state: team?.state || 'Madhya Pradesh',
        city: team?.city || 'Bhopal',
        area: team?.area || '',
        parent_team_id: team?.parent_team_id || '',
        team_lead_id: team?.team_lead_id || team?.team_lead?.id || '',
        color: team?.color || '#6366f1',
        retain_old_lead: true
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error('Please enter a team name');
            return;
        }

        const payload = {
            ...form,
            parent_team_id: form.parent_team_id || null,
            team_lead_id: form.team_lead_id || null,
            city: form.city || null,
            area: form.area || null,
            expected_version: team.version || 1
        };

        setSaving(true);
        try {
            const res = await fetch(`/api/teams/${team.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (!res.ok) {
                toast.error(friendlyTeamError(result.error, result.code));
                return;
            }

            toast.success('Team updated successfully!');
            onUpdated?.(result.team);
            onClose();
        } catch (err) {
            toast.error(friendlyTeamError(err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmDelete = async (reason) => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/teams/${team.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    expected_version: team.version || 1,
                    reason
                })
            });

            const result = await res.json();
            if (!res.ok) {
                toast.error(friendlyTeamError(result.error, result.code));
                return;
            }

            toast.success('Team deactivated successfully');
            onDeleted?.(team.id);
            onClose();
        } catch (err) {
            toast.error(friendlyTeamError(err.message));
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const eligibleParents = teams.filter(t => t.id !== team.id);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex">
            <ConfirmModal
                isOpen={showDeleteModal}
                title="Deactivate Team"
                message={`Are you sure you want to deactivate "${team?.name}"? Members will be removed from team assignments.`}
                confirmText="Deactivate Team"
                confirmVariant="danger"
                requireReason={true}
                reasonPlaceholder="Please state why this team is being deactivated..."
                loading={deleting}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleConfirmDelete}
            />

            <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full max-w-md bg-white flex flex-col h-full shadow-2xl"
            >
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Edit Team</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{team?.name} (v{team?.version || 1})</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Team Name */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                            Team Name *
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => update('name', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                        />
                    </div>

                    {/* Region Level */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                            Region Level
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {REGION_LEVELS.map(lvl => (
                                <button
                                    key={lvl.id}
                                    type="button"
                                    onClick={() => update('region_level', lvl.id)}
                                    className={`p-2.5 rounded-xl border text-left transition-all ${
                                        form.region_level === lvl.id
                                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="text-xs font-bold capitalize">{lvl.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Parent Team */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                            Parent Team in Org Chart
                        </label>
                        <select
                            value={form.parent_team_id}
                            onChange={e => update('parent_team_id', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">None (Root Node)</option>
                            {eligibleParents.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.name} ({t.region_level})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* City & Area */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">City</label>
                            <input
                                type="text"
                                value={form.city}
                                onChange={e => update('city', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Area</label>
                            <input
                                type="text"
                                value={form.area}
                                onChange={e => update('area', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                            />
                        </div>
                    </div>

                    {/* Team Lead */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                            <Crown size={13} className="text-amber-500" /> Team Lead (Manager)
                        </label>
                        <select
                            value={form.team_lead_id}
                            onChange={e => update('team_lead_id', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Unassigned</option>
                            {team?.team_lead && !availableLeads.some(u => u.id === team.team_lead.id) && (
                                <option key={team.team_lead.id} value={team.team_lead.id}>
                                    {team.team_lead.full_name || team.team_lead.email} ({team.team_lead.role}) - Current Lead
                                </option>
                            )}
                            {availableLeads.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.full_name || u.email} ({u.role})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Retain Old Lead Toggle */}
                    {form.team_lead_id !== (team?.team_lead_id || team?.team_lead?.id) && (
                        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs space-y-1">
                            <label className="font-bold text-amber-900 flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.retain_old_lead}
                                    onChange={e => update('retain_old_lead', e.target.checked)}
                                    className="rounded text-amber-600 focus:ring-amber-500"
                                />
                                Retain previous team lead as regular team member
                            </label>
                        </div>
                    )}

                    {/* Color Accent */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                            <Palette size={13} className="text-indigo-500" /> Node Accent Color
                        </label>
                        <div className="flex items-center gap-2">
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => update('color', c)}
                                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                                        form.color === c ? 'scale-125 border-slate-900 shadow-md' : 'border-transparent hover:scale-110'
                                    }`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                            Description
                        </label>
                        <textarea
                            value={form.description}
                            onChange={e => update('description', e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-5 border-t border-slate-100 flex gap-2">
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        disabled={deleting}
                        className="p-3 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center"
                        title="Deactivate Team"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                    >
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
