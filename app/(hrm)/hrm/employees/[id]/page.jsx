'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
    User, Phone, Mail, Building, MapPin, Calendar, 
    DollarSign, ArrowLeft, Edit2, Shield, FileText, 
    Briefcase, TrendingUp, X, Save, CheckCircle, PowerOff
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

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

export default function EmployeeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id;

    const [employee, setEmployee] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form state for inline editing
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);

    const fetchEmployee = useCallback(async () => {
        if (!id) return;
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setEmployee(data);
            setForm({
                department: data.department || '',
                designation: data.designation || '',
                phone: data.phone || '',
                date_of_birth: data.date_of_birth || '',
                gender: data.gender || '',
                address: data.address || '',
                blood_group: data.blood_group || '',
                emergency_contact_name: data.emergency_contact_name || '',
                emergency_contact_phone: data.emergency_contact_phone || '',
                // NOTE: role, is_active, is_suspended are NOT in this form.
                // Those require admin-level operations via secure RPCs.
            });
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchEmployee();
    }, [fetchEmployee]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Use secure server-side API route instead of direct supabase.update().
            // The API route verifies HR role and only allows whitelisted fields.
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/hrm/employees/${employee.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify(form),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Update failed');
            toast.success('Employee profile updated');
            setEmployee(prev => ({ ...prev, ...form }));
            setIsEditing(false);
        } catch (err) { 
            toast.error(err.message); 
        } finally { 
            setSaving(false); 
        }
    };

    const toggleAccountStatus = async () => {
        const newStatus = !employee.is_active;
        if (!confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} this employee account?`)) return;
        
        setTogglingStatus(true);
        try {
            // Account status changes (is_active / role to 'inactive') require
            // admin-level operations. Direct supabase.update() on these fields
            // is blocked by the user_profiles_sensitive_column_guard DB trigger.
            // TODO: Implement via admin_update_user_role RPC for role change
            // and a dedicated admin_toggle_account_active RPC for is_active.
            // For now, surface an informative error.
            toast.error('Account status changes must be performed by an admin via the Admin Panel.');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setTogglingStatus(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 max-w-5xl mx-auto min-h-screen">
                <div className="animate-pulse flex flex-col gap-8">
                    <div className="h-48 bg-slate-200 rounded-[2.5rem]"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="h-64 bg-slate-200 rounded-[2rem] md:col-span-1"></div>
                        <div className="h-64 bg-slate-200 rounded-[2rem] md:col-span-2"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="p-8 max-w-5xl mx-auto min-h-screen flex flex-col items-center justify-center text-slate-500">
                <User size={48} className="mb-4 opacity-50" />
                <h2 className="text-xl font-bold">Employee Not Found</h2>
                <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 min-h-screen font-[family-name:var(--font-outfit)]">
            
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button 
                    onClick={() => router.back()}
                    className="flex w-fit items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Directory
                </button>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleAccountStatus}
                        disabled={togglingStatus}
                        className={`flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl shadow-sm transition-all border ${
                            employee.is_active 
                                ? 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50' 
                                : 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
                        }`}
                    >
                        <PowerOff size={16} /> 
                        {employee.is_active ? 'Deactivate Account' : 'Activate Account'}
                    </button>
                    {!isEditing ? (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 text-white font-bold text-sm bg-slate-900 hover:bg-slate-800 px-5 py-2.5 rounded-xl shadow-sm transition-all"
                        >
                            <Edit2 size={16} /> Edit Profile
                        </button>
                    ) : (
                        <button 
                            onClick={() => {
                                setIsEditing(false);
                                setForm({ ...employee });
                            }}
                            className="flex items-center gap-2 text-slate-600 font-bold text-sm bg-white hover:bg-slate-50 border border-slate-200 px-5 py-2.5 rounded-xl shadow-sm transition-all"
                        >
                            <X size={16} /> Cancel Editing
                        </button>
                    )}
                </div>
            </div>

            {/* Profile Cover & Header Card */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden relative">
                {/* Cover Photo Area */}
                <div className="h-32 sm:h-48 bg-gradient-to-r from-blue-600 to-indigo-600 w-full relative">
                    <div className="absolute inset-0 bg-[url('/images/hero-bg-glass.png')] opacity-30 mix-blend-overlay object-cover"></div>
                </div>
                
                <div className="px-6 sm:px-10 pb-8 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 -mt-16 sm:-mt-20">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2rem] bg-white border-4 border-white shadow-xl flex items-center justify-center overflow-hidden z-10 shrink-0">
                        {employee.avatar_url ? (
                            <Image src={employee.avatar_url} alt={employee.full_name} width={160} height={160} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-4xl font-black text-indigo-600">
                                {employee.full_name?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 text-center sm:text-left pt-2 sm:pt-20">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{employee.full_name}</h1>
                        <p className="text-slate-500 font-medium text-lg mt-1 flex items-center justify-center sm:justify-start gap-2">
                            <Briefcase size={18} className="text-indigo-500" />
                            {employee.role ? ROLE_LABELS[employee.role] || employee.role : 'Role Not Assigned'}
                        </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-3 pt-4 sm:pt-20">
                        <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${employee.is_active !== false ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            {employee.is_active !== false ? 'Active Account' : 'Inactive'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Column: Contact & Meta */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Contact Info</h3>
                        <div className="space-y-5">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Mail size={18} /></div>
                                <div className="w-full">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                                    <p className="font-semibold text-slate-900 mt-0.5 break-all">{employee.email}</p>
                                    <p className="text-xs text-slate-400 mt-1 italic">Cannot be changed</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Phone size={18} /></div>
                                <div className="w-full">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</p>
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={form.phone} 
                                            onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                                            className="w-full mt-1 px-3 py-2 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-medium"
                                        />
                                    ) : (
                                        <p className="font-semibold text-slate-900 mt-0.5">{employee.phone || 'Not provided'}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><MapPin size={18} /></div>
                                <div className="w-full">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location / City</p>
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={form.city} 
                                            onChange={e => setForm(f => ({...f, city: e.target.value}))}
                                            className="w-full mt-1 px-3 py-2 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-medium"
                                        />
                                    ) : (
                                        <p className="font-semibold text-slate-900 mt-0.5">{employee.city || 'Not provided'}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Employment Details</h3>
                        <div className="space-y-5">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Building size={18} /></div>
                                <div className="w-full">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</p>
                                    {isEditing ? (
                                        <select 
                                            value={form.department} 
                                            onChange={e => setForm(f => ({...f, department: e.target.value}))}
                                            className="w-full mt-1 px-3 py-2 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-medium"
                                        >
                                            <option value="">Select Department...</option>
                                            {['Engineering', 'Sales', 'Operations', 'HR', 'Customer Support', 'Marketing', 'Finance'].map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="font-semibold text-slate-900 mt-0.5">{employee.department || 'Unassigned'}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Shield size={18} /></div>
                                <div className="w-full">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee ID</p>
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={form.employee_id} 
                                            onChange={e => setForm(f => ({...f, employee_id: e.target.value}))}
                                            className="w-full mt-1 px-3 py-2 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-medium"
                                        />
                                    ) : (
                                        <p className="font-mono font-bold text-slate-900 mt-0.5">{employee.employee_id || 'N/A'}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Briefcase size={18} /></div>
                                <div className="w-full">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platform Role</p>
                                    {isEditing ? (
                                        <select 
                                            value={form.role} 
                                            onChange={e => setForm(f => ({...f, role: e.target.value}))}
                                            className="w-full mt-1 px-3 py-2 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-medium"
                                        >
                                            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    ) : (
                                        <p className="font-semibold text-slate-900 mt-0.5">{ROLE_LABELS[employee.role] || employee.role}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Calendar size={18} /></div>
                                <div className="w-full">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Joining Date</p>
                                    {isEditing ? (
                                        <input 
                                            type="date" 
                                            value={form.joining_date} 
                                            onChange={e => setForm(f => ({...f, joining_date: e.target.value}))}
                                            className="w-full mt-1 px-3 py-2 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-medium"
                                        />
                                    ) : (
                                        <p className="font-semibold text-slate-900 mt-0.5">
                                            {employee.joining_date ? new Date(employee.joining_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Payroll & Operations */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Payroll Information</h3>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><DollarSign size={20} /></div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 relative">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Base Salary</p>
                                {isEditing ? (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xl font-black text-slate-900">₹</span>
                                        <input 
                                            type="number" 
                                            value={form.base_salary} 
                                            onChange={e => setForm(f => ({...f, base_salary: e.target.value}))}
                                            className="w-full px-3 py-2 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xl font-black text-slate-900"
                                        />
                                    </div>
                                ) : (
                                    <p className="text-3xl font-black text-slate-900 tracking-tight mt-2">₹{employee.base_salary?.toLocaleString('en-IN') || '0'}</p>
                                )}
                                <p className="text-xs font-semibold text-slate-500 mt-1">per month</p>
                            </div>
                            
                            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Employment Type</p>
                                {isEditing ? (
                                    <select 
                                        value={form.employment_type} 
                                        onChange={e => setForm(f => ({...f, employment_type: e.target.value}))}
                                        className="w-full mt-2 px-3 py-2 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-lg font-bold"
                                    >
                                        {['full_time', 'part_time', 'contract', 'intern'].map(t => (
                                            <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-xl font-bold text-slate-900 mt-2 capitalize">{employee.employment_type?.replace('_', ' ') || 'Full Time'}</p>
                                )}
                            </div>
                        </div>

                        {isEditing && (
                            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button 
                                    onClick={() => { setIsEditing(false); setForm({ ...employee }); }}
                                    className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-60"
                                >
                                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                                    Save Changes
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
