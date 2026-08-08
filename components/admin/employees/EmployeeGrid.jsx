'use client';

import { useState } from 'react';
import { Edit2, Save, X, Mail, Phone, Briefcase, IndianRupee } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { EMPLOYEE_ROLES } from '@/lib/utils/transactionHelpers';

// Since EMPLOYEE_ROLES might not exist in transactionHelpers, let's define it locally or import if it exists.
// Let's define the roles array explicitly here for safety.
const ROLES = [
    { value: 'employee', label: 'Employee' },
    { value: 'hr_manager', label: 'HR Manager' },
    { value: 'relationship_exec', label: 'Relationship Executive' },
    { value: 'relationship_manager', label: 'Relationship Manager' },
    { value: 'freelancer', label: 'Freelancer' },
    { value: 'video_editor', label: 'Video Editor' },
    { value: 'social_media_manager', label: 'Social Media Manager' },
    { value: 'seo_specialist', label: 'SEO Specialist' },
    { value: 'advertiser', label: 'Advertiser' },
    { value: 'support_agent', label: 'Support Agent' }
];

export default function EmployeeGrid({ initialEmployees }) {
    const [employees, setEmployees] = useState(initialEmployees);
    const [editingEmp, setEditingEmp] = useState(null);
    const [saving, setSaving] = useState(false);

    const handleEdit = (emp) => {
        setEditingEmp({ ...emp });
    };

    const handleClose = () => {
        setEditingEmp(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    full_name: editingEmp.full_name,
                    department: editingEmp.department,
                    role: editingEmp.role,
                    base_salary: Number(editingEmp.base_salary) || 0
                })
                .eq('id', editingEmp.id);

            if (error) throw error;

            toast.success('Employee updated successfully');
            setEmployees(prev => prev.map(emp => emp.id === editingEmp.id ? editingEmp : emp));
            handleClose();
        } catch (error) {
            console.error('Error updating employee:', error);
            toast.error(error.message || 'Failed to update employee');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {employees.map((emp) => (
                    <div key={emp.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-xl transition-all group flex flex-col h-full relative overflow-hidden">
                        {/* Status bar */}
                        <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                        
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0">
                                {emp.full_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <button 
                                onClick={() => handleEdit(emp)}
                                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-colors border border-slate-100 hover:border-indigo-100"
                            >
                                <Edit2 size={14} />
                            </button>
                        </div>
                        
                        <div className="flex-1">
                            <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{emp.full_name}</h3>
                            <p className="text-sm font-semibold text-indigo-600 mb-3">{emp.department || 'Unassigned Dept'}</p>
                            
                            <div className="space-y-2 mt-4">
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Briefcase size={14} className="text-slate-400 shrink-0" />
                                    <span className="truncate">{ROLES.find(r => r.value === emp.role)?.label || emp.role}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <IndianRupee size={14} className="text-slate-400 shrink-0" />
                                    <span className="font-mono text-slate-700 font-bold">{(emp.base_salary || 0).toLocaleString('en-IN')} /mo</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                                <Mail size={12} className="shrink-0" />
                                <span>{emp.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                                <Phone size={12} className="shrink-0" />
                                <span>{emp.phone || 'No phone'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingEmp && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ y: 20, opacity: 0, scale: 0.95 }} 
                            animate={{ y: 0, opacity: 1, scale: 1 }} 
                            exit={{ y: 20, opacity: 0, scale: 0.95 }} 
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Edit Employee</h2>
                                    <p className="text-xs font-medium text-slate-500 mt-1">Update enterprise profile details</p>
                                </div>
                                <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-200 text-slate-500 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-5">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Full Name</label>
                                        <input 
                                            type="text" 
                                            value={editingEmp.full_name || ''} 
                                            onChange={e => setEditingEmp({...editingEmp, full_name: e.target.value})}
                                            required
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-semibold text-slate-800"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Department</label>
                                            <input 
                                                type="text" 
                                                value={editingEmp.department || ''} 
                                                onChange={e => setEditingEmp({...editingEmp, department: e.target.value})}
                                                placeholder="e.g. Sales, HR, Tech"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-semibold text-slate-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">System Role</label>
                                            <select 
                                                value={editingEmp.role || ''} 
                                                onChange={e => setEditingEmp({...editingEmp, role: e.target.value})}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-semibold text-slate-800 cursor-pointer"
                                            >
                                                {ROLES.map(r => (
                                                    <option key={r.value} value={r.value}>{r.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Base Salary (Monthly)</label>
                                        <div className="relative">
                                            <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type="number" 
                                                value={editingEmp.base_salary || 0} 
                                                onChange={e => setEditingEmp({...editingEmp, base_salary: e.target.value})}
                                                min="0"
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-bold font-mono text-slate-800"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 mt-2">
                                        <p className="text-xs font-medium text-amber-700 leading-relaxed">
                                            <strong>Note:</strong> Changes to base salary will take effect in the next payroll cycle. The employee's historical payroll records will not be affected.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <button 
                                        type="button" 
                                        onClick={handleClose}
                                        className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={saving}
                                        className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-indigo-500/20"
                                    >
                                        {saving ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <><Save size={16} /> Save Changes</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
