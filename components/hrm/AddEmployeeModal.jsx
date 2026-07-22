'use client';

import { useState } from 'react';
import { X, User, Mail, Phone, Building2, Shield, MapPin, Save, Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function AddEmployeeModal({ isOpen, onClose, onSuccess }) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        role: 'employee',
        department: 'Sales',
        city: 'Mumbai',
        address: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.full_name.trim() || !formData.email.trim()) {
            toast.error('Please provide full name and email.');
            return;
        }

        setSaving(true);
        try {
            // Check if profile exists
            const { data: existing } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('email', formData.email.trim().toLowerCase())
                .maybeSingle();

            if (existing) {
                // Update existing user profile role and department
                const { data, error } = await supabase
                    .from('user_profiles')
                    .update({
                        full_name: formData.full_name,
                        phone: formData.phone,
                        role: formData.role,
                        department: formData.department,
                        city: formData.city,
                        address: formData.address,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;
                toast.success('Employee profile updated successfully!');
                if (onSuccess) onSuccess(data);
            } else {
                // Insert new profile record
                const newId = crypto.randomUUID();
                const { data, error } = await supabase
                    .from('user_profiles')
                    .insert([{
                        id: newId,
                        full_name: formData.full_name,
                        email: formData.email.trim().toLowerCase(),
                        phone: formData.phone,
                        role: formData.role,
                        department: formData.department,
                        city: formData.city,
                        address: formData.address,
                        created_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (error) throw error;
                toast.success('New employee added successfully!');
                if (onSuccess) onSuccess(data);
            }

            onClose();
        } catch (err) {
            console.error('Error adding employee:', err);
            toast.error(err.message || 'Failed to add employee');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-6 relative overflow-hidden font-[family-name:var(--font-outfit)]"
                >
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <UserPlus size={20} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">Add New Employee</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Register new personnel in organization roster</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-emerald-500"
                                placeholder="Vikram Malhotra"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Official Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-emerald-500"
                                    placeholder="vikram@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-emerald-500"
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role Access</label>
                                <select
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-emerald-500"
                                >
                                    <option value="employee">Employee</option>
                                    <option value="sales_exec">Sales Executive</option>
                                    <option value="sales_manager">Sales Manager</option>
                                    <option value="hr_manager">HR Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department</label>
                                <select
                                    value={formData.department}
                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                    className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-emerald-500"
                                >
                                    <option value="Sales">Sales</option>
                                    <option value="HR & Operations">HR & Operations</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Customer Support">Customer Support</option>
                                    <option value="Finance">Finance</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City / Base Location</label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-emerald-500"
                                    placeholder="Gurugram / Mumbai"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Work Type</label>
                                <select
                                    className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-900 dark:text-white font-semibold text-sm outline-none focus:border-emerald-500"
                                >
                                    <option value="full_time">Full Time On-Site</option>
                                    <option value="hybrid">Hybrid</option>
                                    <option value="wfh">Remote / WFH</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 text-sm transition-all"
                            >
                                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                {saving ? 'Adding...' : 'Add Employee'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
