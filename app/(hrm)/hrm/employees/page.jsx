'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Users, Mail, Phone, Building, Calendar, RefreshCw, MoreVertical, X, Save } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const ROLE_LABELS = {
    employee: 'Employee',
    relationship_exec: 'Relationship Executive',
    relationship_manager: 'Relationship Manager',
    hr_manager: 'HR Manager',
    admin: 'Admin',
    super_admin: 'Super Admin',
    inactive: 'Inactive (Deactivated)',
    freelancer: 'Freelancer',
    video_editor: 'Video Editor',
    social_media_manager: 'Social Media Manager',
    seo_specialist: 'SEO Specialist',
    advertiser: 'Advertiser',
    support_agent: 'Support Agent',
};

const ROLE_COLOR = {
    employee: 'bg-blue-50 text-blue-700 border-blue-100',
    relationship_exec: 'bg-violet-50 text-violet-700 border-violet-100',
    relationship_manager: 'bg-purple-50 text-purple-700 border-purple-100',
    hr_manager: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    freelancer: 'bg-orange-50 text-orange-700 border-orange-100',
    video_editor: 'bg-pink-50 text-pink-700 border-pink-100',
    social_media_manager: 'bg-rose-50 text-rose-700 border-rose-100',
    seo_specialist: 'bg-amber-50 text-amber-700 border-amber-100',
    advertiser: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    support_agent: 'bg-indigo-50 text-indigo-700 border-indigo-100',
};

function EmployeeDrawer({ employee, onClose, onSave }) {
    const [form, setForm] = useState({
        department: employee?.department || '',
        employee_id: employee?.employee_id || '',
        joining_date: employee?.joining_date || '',
        employment_type: employee?.employment_type || 'full_time',
        city: employee?.city || '',
        base_salary: employee?.base_salary || 0,
        role: employee?.role || 'employee',
    });
    const [saving, setSaving] = useState(false);
    const up = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.from('user_profiles').update(form).eq('id', employee.id);
            if (error) throw error;
            toast.success('Employee profile updated');

            // Audit Log Insert
            supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) {
                    supabase.from('audit_logs_hrm').insert({
                        actor_id: user.id,
                        actor_name: user.user_metadata?.full_name || 'System',
                        action: 'Employee profile updated',
                        table_name: 'user_profiles',
                        record_id: employee.id,
                        old_data: employee,
                        new_data: form,
                        module: 'Core HR',
                        severity: 'medium'
                    }).then(({ error: auditError }) => {
                        if (auditError) console.warn('Audit log failed:', auditError);
                    });
                }
            });

            onSave({ ...employee, ...form });
            onClose();
        } catch (err) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full max-w-md bg-white flex flex-col h-full shadow-2xl">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{employee?.full_name}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Edit employment details</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} className="text-gray-500" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Avatar */}
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 shadow-sm">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xl shadow-inner">
                            {(employee?.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">{employee?.full_name}</p>
                            <p className="text-sm text-gray-500">{employee?.email}</p>
                            <p className="text-xs text-gray-400">{employee?.phone}</p>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform">
                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            </div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 relative z-10">Monthly Base</p>
                            <p className="text-lg font-black text-indigo-900 font-mono relative z-10">₹{Number(form.base_salary || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform">
                                <TrendingUp size={60} />
                            </div>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 relative z-10">YTD Earnings (Est)</p>
                            <p className="text-lg font-black text-emerald-900 font-mono relative z-10">₹{Number((form.base_salary || 0) * (new Date().getMonth() || 1)).toLocaleString('en-IN')}</p>
                            <p className="text-[10px] font-bold text-emerald-600 mt-1 relative z-10">Current Financial Year</p>
                        </div>
                    </div>

                    {[
                        { label: 'Employee ID', key: 'employee_id', placeholder: 'e.g. EMP001' },
                        { label: 'City', key: 'city', placeholder: 'e.g. Mumbai' },
                        { label: 'Base Salary (₹/month)', key: 'base_salary', placeholder: '30000', type: 'number' },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">{f.label}</label>
                            <input type={f.type || 'text'} value={form[f.key]} onChange={e => up(f.key, e.target.value)} placeholder={f.placeholder}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all" />
                        </div>
                    ))}

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Department</label>
                        <select value={form.department} onChange={e => up('department', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all">
                            <option value="">Select Department...</option>
                            {['Engineering', 'Sales', 'Operations', 'HR', 'Customer Support', 'Marketing', 'Finance'].map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Joining Date</label>
                        <input type="date" value={form.joining_date} onChange={e => up('joining_date', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Employment Type</label>
                        <select value={form.employment_type} onChange={e => up('employment_type', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            {['full_time', 'part_time', 'contract', 'intern'].map(t => (
                                <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Role</label>
                        <select value={form.role} onChange={e => up('role', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                </div>
                <div className="p-5 border-t border-gray-100 flex flex-col gap-3">
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">Cancel</button>
                        <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={16} /> Save Changes</>}
                        </button>
                    </div>
                    {form.role !== 'inactive' && (
                        <button 
                            onClick={() => {
                                if (confirm("Are you sure you want to deactivate this employee? They will lose access to the system.")) {
                                    up('role', 'inactive');
                                }
                            }}
                            className="w-full py-2.5 rounded-2xl border-2 border-rose-100 text-rose-600 font-semibold text-sm hover:bg-rose-50 hover:border-rose-200 transition-colors"
                        >
                            Deactivate Employee
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

function AddEmployeeDrawer({ onClose, onSave }) {
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        department: '',
        employee_id: '',
        joining_date: new Date().toISOString().split('T')[0],
        employment_type: 'full_time',
        city: '',
        base_salary: 0,
        role: 'employee',
    });
    const [saving, setSaving] = useState(false);
    const up = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.full_name?.trim() || !form.email?.trim()) {
            toast.error('Full Name and Email are required');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email.trim())) {
            toast.error('Please enter a valid email address');
            return;
        }

        if (Number(form.base_salary) < 0) {
            toast.error('Base salary cannot be negative');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                email: form.email.toLowerCase().trim(),
                base_salary: Math.max(0, Number(form.base_salary) || 0)
            };
            
            const res = await fetch('/api/hrm/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Failed to add employee');
            }
            
            toast.success('New employee added!');
            onSave(data.user);
            onClose();
        } catch (err) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full max-w-md bg-white flex flex-col h-full shadow-2xl">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Add New Employee</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Onboard a new team member</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} className="text-gray-500" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {[
                        { label: 'Full Name *', key: 'full_name', placeholder: 'John Doe' },
                        { label: 'Email *', key: 'email', placeholder: 'john@intrust.com', type: 'email' },
                        { label: 'Phone', key: 'phone', placeholder: '10-digit mobile' },
                        { label: 'Employee ID', key: 'employee_id', placeholder: 'e.g. EMP001' },
                        { label: 'City', key: 'city', placeholder: 'e.g. Mumbai' },
                        { label: 'Base Salary (₹/month)', key: 'base_salary', placeholder: '30000', type: 'number' },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">{f.label}</label>
                            <input type={f.type || 'text'} value={form[f.key]} onChange={e => up(f.key, e.target.value)} placeholder={f.placeholder}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all" />
                        </div>
                    ))}

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Department</label>
                        <select value={form.department} onChange={e => up('department', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all">
                            <option value="">Select Department...</option>
                            {['Engineering', 'Sales', 'Operations', 'HR', 'Customer Support', 'Marketing', 'Finance'].map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Joining Date</label>
                        <input type="date" value={form.joining_date} onChange={e => up('joining_date', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Employment Type</label>
                        <select value={form.employment_type} onChange={e => up('employment_type', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            {['full_time', 'part_time', 'contract', 'intern'].map(t => (
                                <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Role</label>
                        <select value={form.role} onChange={e => up('role', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                </div>
                <div className="p-5 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus size={16} /> Add Employee</>}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState(null);
    const [showAdd, setShowAdd] = useState(false);

    const fetchEmployees = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('user_profiles')
                .select('id, full_name, email, phone, role, department, employee_id, joining_date, employment_type, city, base_salary, avatar_url, created_at')
               .in('role', [
                   'employee', 'relationship_exec', 'relationship_manager', 'hr_manager',
                   'freelancer', 'video_editor', 'social_media_manager',
                   'seo_specialist', 'advertiser', 'support_agent'
               ])
                .order('created_at', { ascending: false });
            if (error) throw error;
            setEmployees(data || []);
        } catch (err) {
            console.error(err);
            toast.error('Could not load employees');
        } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

    const filtered = employees.filter(e =>
        !search ||
        e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.email?.toLowerCase().includes(search.toLowerCase()) ||
        e.department?.toLowerCase().includes(search.toLowerCase()) ||
        e.employee_id?.toLowerCase().includes(search.toLowerCase())
    );

    const handleUpdate = (updated) => setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
    const handleAdd = (newEmp) => setEmployees(prev => [newEmp, ...prev]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            <AnimatePresence>
                {editing && <EmployeeDrawer employee={editing} onClose={() => setEditing(null)} onSave={handleUpdate} />}
                {showAdd && <AddEmployeeDrawer onClose={() => setShowAdd(false)} onSave={handleAdd} />}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Employees</h1>
                    <p className="text-sm text-gray-500 mt-1">{filtered.length} team member{filtered.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchEmployees} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50">
                        <RefreshCw size={16} className="text-gray-500" />
                    </button>
                    <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/25 text-sm">
                        <Plus size={16} /> New Employee
                    </button>
                </div>
            </div>

            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, dept, employee ID..."
                    className="w-full pl-11 pr-4 py-3 bg-white border-none rounded-[1.5rem] shadow-xl shadow-gray-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-52 bg-white border-none shadow-xl shadow-gray-200/40 rounded-[2rem] animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] border-none shadow-xl shadow-gray-200/40 p-16 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4"><Users size={28} className="text-gray-400" /></div>
                    <p className="font-bold text-gray-900 text-lg">No employees found</p>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Hire someone from the Recruitment panel to see them here</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((emp, i) => (
                        <motion.div key={emp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white rounded-[2rem] border-none shadow-xl shadow-gray-200/40 hover:shadow-2xl hover:shadow-emerald-200/40 hover:-translate-y-1 transition-all duration-300 p-6 group flex flex-col justify-between">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                        {(emp.full_name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{emp.full_name}</p>
                                        <p className="text-xs font-mono text-gray-400">{emp.employee_id || 'No ID set'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setEditing(emp)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                    <MoreVertical size={16} className="text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-2 mb-4">
                                {emp.department && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Building size={13} className="text-gray-400" />
                                        <span>{emp.department}</span>
                                    </div>
                                )}
                                {emp.email && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 truncate">
                                        <Mail size={13} className="text-gray-400 flex-shrink-0" />
                                        <span className="truncate">{emp.email}</span>
                                    </div>
                                )}
                                {emp.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone size={13} className="text-gray-400" />
                                        <span>{emp.phone}</span>
                                    </div>
                                )}
                                {emp.joining_date && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Calendar size={13} className="text-gray-400" />
                                        <span>Joined {new Date(emp.joining_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border capitalize ${ROLE_COLOR[emp.role] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                    {ROLE_LABELS[emp.role] || emp.role}
                                </span>
                                {emp.base_salary > 0 && (
                                    <span className="text-sm font-bold text-emerald-600">₹{emp.base_salary.toLocaleString('en-IN')}/mo</span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
