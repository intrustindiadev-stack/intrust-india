'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Users, Mail, Phone, Building, Calendar, RefreshCw, MoreVertical, X, Save, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

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





export default function EmployeesPage() {
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

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

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Employees</h1>
                    <p className="text-sm text-gray-500 mt-1">{filtered.length} team member{filtered.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchEmployees} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 shadow-sm transition-all">
                        <RefreshCw size={18} className="text-gray-500 hover:text-emerald-600" />
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
                                        <Link href={`/hrm/employees/${emp.id}`} className="font-bold text-gray-900 hover:text-emerald-600 transition-colors block">{emp.full_name}</Link>
                                        <p className="text-xs font-mono text-gray-400">{emp.employee_id || 'No ID set'}</p>
                                    </div>
                                </div>
                                <Link href={`/hrm/employees/${emp.id}`} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                    <MoreVertical size={16} className="text-gray-400" />
                                </Link>
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
