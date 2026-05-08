'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Users, Mail, Phone, Building, Calendar, RefreshCw, MoreVertical, X, Save } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const ROLE_LABELS = {
    employee: 'Employee', sales_exec: 'Sales Executive', sales_manager: 'Sales Manager',
    hr_manager: 'HR Manager', admin: 'Admin', super_admin: 'Super Admin',
};

const ROLE_COLOR = {
    employee: 'bg-blue-50 text-blue-700 border-blue-100',
    sales_exec: 'bg-violet-50 text-violet-700 border-violet-100',
    sales_manager: 'bg-purple-50 text-purple-700 border-purple-100',
    hr_manager: 'bg-emerald-50 text-emerald-700 border-emerald-100',
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
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xl">
                            {(employee?.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">{employee?.full_name}</p>
                            <p className="text-sm text-gray-500">{employee?.email}</p>
                            <p className="text-xs text-gray-400">{employee?.phone}</p>
                        </div>
                    </div>

                    {[
                        { label: 'Employee ID', key: 'employee_id', placeholder: 'e.g. EMP001' },
                        { label: 'Department', key: 'department', placeholder: 'e.g. Sales, Engineering' },
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
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={16} /> Save Changes</>}
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

    const fetchEmployees = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('user_profiles')
                .select('id, full_name, email, phone, role, department, employee_id, joining_date, employment_type, city, base_salary, avatar_url, created_at')
                .in('role', ['employee', 'sales_exec', 'sales_manager', 'hr_manager'])
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

    const handleSave = (updated) => setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            <AnimatePresence>
                {editing && <EmployeeDrawer employee={editing} onClose={() => setEditing(null)} onSave={handleSave} />}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Employees</h1>
                    <p className="text-sm text-gray-500 mt-1">{filtered.length} team member{filtered.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={fetchEmployees} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50">
                    <RefreshCw size={16} className="text-gray-500" />
                </button>
            </div>

            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, dept, employee ID..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-52 bg-white border border-gray-100 rounded-3xl animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4"><Users size={28} className="text-gray-400" /></div>
                    <p className="font-semibold text-gray-700">No employees found</p>
                    <p className="text-sm text-gray-400 mt-1">Hire someone from the Recruitment panel to see them here</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((emp, i) => (
                        <motion.div key={emp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 group">
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
