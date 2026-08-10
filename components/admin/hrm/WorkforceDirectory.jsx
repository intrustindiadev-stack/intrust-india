'use client';

import { useState } from 'react';
import { displayEmail } from '@/lib/auth';
import { MoreHorizontal, Edit2, Trash2, X, Save, IndianRupee, Briefcase, Mail, Phone, Calendar as CalendarIcon, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ContactActions from '@/components/shared/ContactActions';

const roleLabel = {
    employee: 'Employee',
    hr_manager: 'HR Manager',
    relationship_exec: 'Relationship Executive',
    relationship_manager: 'Relationship Manager',
    freelancer: 'Freelancer',
    video_editor: 'Video Editor',
    social_media_manager: 'Social Media Manager',
    seo_specialist: 'SEO Specialist',
    advertiser: 'Advertiser',
    support_agent: 'Support Agent',
};

const roleColor = {
    employee: 'bg-blue-50 text-blue-700 border-blue-200',
    hr_manager: 'bg-violet-50 text-violet-700 border-violet-200',
    relationship_exec: 'bg-amber-50 text-amber-700 border-amber-200',
    relationship_manager: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    freelancer: 'bg-orange-50 text-orange-700 border-orange-200',
    video_editor: 'bg-pink-50 text-pink-700 border-pink-200',
    social_media_manager: 'bg-rose-50 text-rose-700 border-rose-200',
    seo_specialist: 'bg-amber-50 text-amber-700 border-amber-200',
    advertiser: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    support_agent: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export default function WorkforceDirectory({ initialEmployees }) {
    const [employees, setEmployees] = useState(initialEmployees || []);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form state
    const [editForm, setEditForm] = useState(null);

    const handleRowClick = (emp) => {
        setSelectedEmp(emp);
        setEditForm({ ...emp });
    };

    const handleClose = () => {
        setSelectedEmp(null);
        setEditForm(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!editForm) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    full_name: editForm.full_name,
                    department: editForm.department,
                    role: editForm.role,
                    base_salary: Number(editForm.base_salary) || 0
                })
                .eq('id', editForm.id);

            if (error) throw error;

            toast.success('Employee updated successfully');
            setEmployees(prev => prev.map(emp => emp.id === editForm.id ? { ...emp, ...editForm } : emp));
            handleClose();
        } catch (error) {
            console.error('Update error:', error);
            toast.error(error.message || 'Failed to update employee');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedEmp) return;
        if (!window.confirm(`Are you sure you want to terminate/delete ${selectedEmp.full_name}? This action cannot be undone.`)) return;
        
        setIsDeleting(true);
        try {
            // Note: In a real system, you might want to call an edge function to delete the auth user as well,
            // or soft-delete by setting status='terminated'. We will update the role or soft-delete here.
            // For now, let's change role to 'terminated' as soft delete.
            const { error } = await supabase
                .from('user_profiles')
                .update({ role: 'terminated' })
                .eq('id', selectedEmp.id);
                
            if (error) throw error;
            
            toast.success('Employee terminated successfully');
            setEmployees(prev => prev.filter(emp => emp.id !== selectedEmp.id));
            handleClose();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to terminate employee');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Workforce Directory</h2>
                    <p className="text-sm text-gray-500">{employees.length} active team members</p>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/80 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-100">
                        <tr>
                            <th className="p-4 pl-6">Employee</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4 pr-6">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {employees.length > 0 ? employees.map(emp => (
                            <tr 
                                key={emp.id} 
                                onClick={() => handleRowClick(emp)}
                                className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                            >
                                <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-sm font-black text-indigo-700 shadow-sm group-hover:scale-110 transition-transform">
                                            {emp.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-900 text-sm block">{emp.full_name || 'N/A'}</span>
                                            {emp.department && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{emp.department}</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-gray-500">
                                    {displayEmail(emp.email) ?? (
                                        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No email linked</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider ${roleColor[emp.role] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                        {roleLabel[emp.role] || emp.role}
                                    </span>
                                </td>
                                <td className="p-4" onClick={e => e.stopPropagation()}>
                                    <ContactActions phone={emp.phone} email={emp.email} name={emp.full_name} compact />
                                </td>
                                <td className="p-4 pr-6 text-xs font-medium text-gray-500 flex justify-between items-center">
                                    {new Date(emp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    <MoreHorizontal size={16} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="5" className="p-12 text-center text-gray-400 text-sm font-medium">No employees found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Slide-out Drawer for Employee Details */}
            <AnimatePresence>
                {selectedEmp && editForm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleClose}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ x: '100%', opacity: 0.5 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0.5 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Enterprise Management</h2>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Staff Profile & Access</p>
                                </div>
                                <button onClick={handleClose} className="p-2 rounded-xl hover:bg-slate-200 text-slate-400 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                                        {editForm.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">{editForm.full_name}</h3>
                                        <span className={`inline-flex mt-1 text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${roleColor[editForm.role] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                            {roleLabel[editForm.role] || editForm.role}
                                        </span>
                                    </div>
                                </div>

                                <form id="emp-edit-form" onSubmit={handleSave} className="space-y-6">
                                    {/* Profile Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Briefcase size={14} /> Profile Information
                                        </h4>
                                        <div className="grid grid-cols-1 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                                                <input 
                                                    type="text" 
                                                    value={editForm.full_name || ''} 
                                                    onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                                                <input 
                                                    type="text" 
                                                    value={editForm.department || ''} 
                                                    onChange={e => setEditForm({...editForm, department: e.target.value})}
                                                    placeholder="e.g. Sales, HR..."
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Access & Role Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <ShieldCheck size={14} /> Access Controls
                                        </h4>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">System Role</label>
                                                <select 
                                                    value={editForm.role || ''} 
                                                    onChange={e => setEditForm({...editForm, role: e.target.value})}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                >
                                                    {Object.entries(roleLabel).map(([val, label]) => (
                                                        <option key={val} value={val}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                                Modifying the system role changes the modules and data the employee can access. Changes are instant.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Compensation Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <IndianRupee size={14} /> Compensation
                                        </h4>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Base Salary (Monthly)</label>
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</div>
                                                <input 
                                                    type="number" 
                                                    value={editForm.base_salary || 0} 
                                                    onChange={e => setEditForm({...editForm, base_salary: e.target.value})}
                                                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm font-bold font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-white flex flex-col gap-3">
                                <div className="flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={handleClose}
                                        className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        form="emp-edit-form"
                                        disabled={isSaving}
                                        className="flex-[2] py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                                    >
                                        {isSaving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                                    </button>
                                </div>
                                
                                <div className="pt-4 mt-2 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Danger Zone</span>
                                    <button 
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={14} /> Terminate
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
