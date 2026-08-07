'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ServiceAreaDrawer({ team, onClose }) {
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newArea, setNewArea] = useState({ type: 'pincode', value: '', city: '', state: '' });

    const fetchAreas = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/teams/${team.id}/service-areas`);
            if (res.ok) {
                const data = await res.json();
                setAreas(data || []);
            } else {
                toast.error('Failed to load service areas');
            }
        } catch (e) {
            toast.error('Error fetching service areas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (team) fetchAreas();
    }, [team]);

    const handleAdd = async () => {
        if (!newArea.value) {
            toast.error('Please enter a value');
            return;
        }
        if (newArea.type === 'pincode' && !/^[1-9][0-9]{5}$/.test(newArea.value)) {
            toast.error('Invalid pincode');
            return;
        }
        if ((newArea.type === 'zone' || newArea.type === 'area') && !newArea.city) {
            toast.error('City is required for Zone or Area');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/teams/${team.id}/service-areas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([{
                    area_type: newArea.type,
                    value: newArea.value,
                    city: newArea.city,
                    state: newArea.state
                }])
            });
            if (res.ok) {
                toast.success('Service area added');
                setNewArea({ type: 'pincode', value: '', city: '', state: '' });
                fetchAreas();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to add area');
            }
        } catch (e) {
            toast.error('Error adding area');
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async (id) => {
        try {
            const res = await fetch(`/api/teams/${team.id}/service-areas?id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success('Service area removed');
                fetchAreas();
            } else {
                toast.error('Failed to remove area');
            }
        } catch (e) {
            toast.error('Error removing area');
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
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <MapPin size={18} className="text-indigo-600" />
                            Coverage Zones
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">{team?.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-5 border-b border-slate-100 bg-slate-50 space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Define Coverage Zone</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <select 
                            value={newArea.type} 
                            onChange={e => setNewArea({ ...newArea, type: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all font-semibold"
                        >
                            <option value="pincode">Pincode</option>
                            <option value="zone">Zone</option>
                            <option value="area">Area</option>
                            <option value="city">City</option>
                            <option value="state">State</option>
                        </select>
                        <input 
                            type="text" 
                            placeholder="Value (e.g. 400001)" 
                            value={newArea.value}
                            onChange={e => setNewArea({ ...newArea, value: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
                        />
                    </div>
                    {(newArea.type === 'zone' || newArea.type === 'area' || newArea.type === 'city') && (
                        <div className="grid grid-cols-2 gap-3">
                            <input 
                                type="text" 
                                placeholder="City (Required)" 
                                value={newArea.city}
                                onChange={e => setNewArea({ ...newArea, city: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
                            />
                            {newArea.type === 'city' && (
                                <input 
                                    type="text" 
                                    placeholder="State (Optional)" 
                                    value={newArea.state}
                                    onChange={e => setNewArea({ ...newArea, state: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
                                />
                            )}
                        </div>
                    )}
                    <button 
                        onClick={handleAdd} 
                        disabled={saving}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {saving ? 'Adding…' : 'Add to Coverage Zones'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Active Coverage Zones</h3>
                    {loading ? (
                        <div className="text-center text-sm text-slate-400 py-4">Loading…</div>
                    ) : areas.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                            <MapPin size={20} className="text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 font-semibold">No coverage zones defined</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Add zones above to enable automatic lead allocation</p>
                        </div>
                    ) : (
                        areas.map(area => (
                            <div key={area.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl">
                                <div>
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                                        {area.area_type}
                                    </span>
                                    <span className="ml-2 text-sm font-bold text-slate-900">{area.value}</span>
                                    {area.city && <span className="ml-2 text-xs text-slate-500">({area.city})</span>}
                                </div>
                                <button onClick={() => handleRemove(area.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
