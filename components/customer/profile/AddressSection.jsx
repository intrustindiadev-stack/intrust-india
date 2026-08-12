'use client';

import { useState, useEffect } from 'react';
import { MapPin, Edit2, Check, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AddressSection({ address, onSave }) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fields, setFields] = useState({ line1: '', area: '', city: '', state: '', pincode: '' });

    useEffect(() => {
        if (editing) return;
        if (address) {
            const p = address.split(',').map(s => s.trim());
            setFields({ line1: p[0] || '', area: p[1] || '', city: p[2] || '', state: p[3] || '', pincode: p[4] || '' });
        } else {
            setFields({ line1: '', area: '', city: '', state: '', pincode: '' });
        }
    }, [address, editing]);

    const fullAddress = [fields.line1, fields.area, fields.city, fields.state, fields.pincode].filter(Boolean).join(', ');

    const handleSave = async () => {
        if (!fields.line1.trim()) return;
        setSaving(true);
        const ok = await onSave(fullAddress || null);
        setSaving(false);
        if (ok) setEditing(false);
    };

    const inputCls = "w-full text-sm font-semibold bg-gray-50 dark:bg-white/5 border border-transparent focus:border-[#92BCEA] rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600 shadow-inner";

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden transition-all duration-500">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Delivery Address</h3>
                {!editing && (
                    <button onClick={() => setEditing(true)}
                        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:underline min-h-[44px]">
                        <Edit2 size={13} />
                        {address ? 'Edit' : 'Add'}
                    </button>
                )}
            </div>

            <div className="p-6">
                <AnimatePresence mode="wait">
                    {!editing ? (
                        <motion.div
                            key="view"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {address ? (
                                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {address}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">No address configured.</p>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="edit"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2 px-1">Structure / Flat No.</label>
                                <input type="text" value={fields.line1} onChange={e => setFields(f => ({ ...f, line1: e.target.value }))} placeholder="e.g. Unit 402, Elite Towers" className={inputCls} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2 px-1">Locality / Sector</label>
                                <input type="text" value={fields.area} onChange={e => setFields(f => ({ ...f, area: e.target.value }))} placeholder="e.g. South Extension II" className={inputCls} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2 px-1">Metropolis</label>
                                    <input type="text" value={fields.city} onChange={e => setFields(f => ({ ...f, city: e.target.value }))} placeholder="New Delhi" className={inputCls} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2 px-1">Province</label>
                                    <input type="text" value={fields.state} onChange={e => setFields(f => ({ ...f, state: e.target.value }))} placeholder="Delhi" className={inputCls} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2 px-1">Postal Code</label>
                                <input type="text" inputMode="numeric" maxLength={6} value={fields.pincode} onChange={e => setFields(f => ({ ...f, pincode: e.target.value.replace(/\D/g, '') }))} placeholder="110049" className={inputCls} />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={handleSave} disabled={saving || !fields.line1.trim()}
                                    className="flex-1 py-4 bg-[#1E3A5F] text-white text-[11px] font-black rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-[#16304f] transition-all uppercase tracking-[0.15em] shadow-2xl min-h-[44px]">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    Save Address
                                </button>
                                <button onClick={() => setEditing(false)}
                                    className="px-6 py-4 bg-gray-100 dark:bg-white/5 text-gray-500 text-[11px] font-black rounded-2xl transition-all uppercase tracking-widest min-h-[44px]">
                                    Discard
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
