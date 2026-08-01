'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Layers, MapPin, Crown, Palette, AlignLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { friendlyTeamError } from '@/components/admin/teams/teamErrorMessages';

const REGION_LEVELS = [
    { id: 'state', label: 'State Level', desc: 'Highest node (e.g. Madhya Pradesh)' },
    { id: 'city', label: 'City Level', desc: 'Middle node (e.g. Bhopal)' },
    { id: 'area', label: 'Area Level', desc: 'Local sub-team node (e.g. MP Nagar)' },
];

const PRESET_COLORS = [
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#f97316', // Orange
    '#eab308', // Yellow
    '#10b981', // Emerald
    '#06b6d4', // Cyan
];

export default function TeamCreateDrawer({
    teams = [],
    availableLeads = [],
    onClose,
    onCreated
}) {
    const [form, setForm] = useState({
        name: '',
        description: '',
        region_level: 'area',
        state: 'Madhya Pradesh',
        city: 'Bhopal',
        area: '',
        parent_team_id: '',
        team_lead_id: '',
        color: '#6366f1'
    });
    const [saving, setSaving] = useState(false);

    const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error('Please enter a team name');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(friendlyTeamError(result.error, result.code));

            toast.success('Team created successfully!');
            onCreated?.(result.team);
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full max-w-md bg-white flex flex-col h-full shadow-2xl"
            >
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Create New Team</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Define region, hierarchy & team leadership</p>
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
                            placeholder="e.g. Bhopal MP Nagar Sales"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                        />
                    </div>

                    {/* Region Level */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                            Region Level *
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

                    {/* Parent Team (Hierarchy) */}
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
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.name} ({t.region_level})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Area / City details */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">City</label>
                            <input
                                type="text"
                                value={form.city}
                                onChange={e => update('city', e.target.value)}
                                placeholder="Bhopal"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Area / Zone</label>
                            <input
                                type="text"
                                value={form.area}
                                onChange={e => update('area', e.target.value)}
                                placeholder="e.g. MP Nagar Zone-1"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                            />
                        </div>
                    </div>

                    {/* Team Lead */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                            <Crown size={13} className="text-amber-500" /> Team Lead (Sales Manager)
                        </label>
                        <select
                            value={form.team_lead_id}
                            onChange={e => update('team_lead_id', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Unassigned</option>
                            {availableLeads.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.full_name || u.email} ({u.role})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Color Picker */}
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
                            placeholder="Brief operational description of this team..."
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-5 border-t border-slate-100 flex gap-3">
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
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Team'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
