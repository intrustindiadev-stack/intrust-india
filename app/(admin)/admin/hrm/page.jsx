import { createAdminClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { displayEmail } from '@/lib/auth';
import { Users, UserPlus, DollarSign, Clock } from 'lucide-react';
import ContactActions from '@/components/shared/ContactActions';

function StatCard({ title, value, sub, gradient, icon: Icon }) {
    return (
        <div className={`relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br ${gradient} shadow-lg`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full" />
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                <Icon size={20} />
            </div>
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
            <p className="text-3xl font-black">{value}</p>
            {sub && <p className="text-white/70 text-xs mt-1">{sub}</p>}
        </div>
    );
}

const LEAVE_STATUS_STYLE = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
};

export default async function AdminHRMPage() {
    const supabase = createAdminClient();

    // Fetch HRM data in parallel — gracefully fallback if tables don't exist yet
    const [empRes, leaveRes, pendingLeaveRes] = await Promise.all([
        supabase.from('user_profiles')
            .select('id, full_name, email, phone, role, created_at')
            .in('role', [
                'employee', 'hr_manager', 'relationship_exec', 'relationship_manager',
                'freelancer', 'video_editor', 'social_media_manager',
                'seo_specialist', 'advertiser', 'support_agent'
            ])
            .order('created_at', { ascending: false }),
        // leave_requests may not exist yet — gracefully fall back
        supabase.from('leave_requests')
            .select('id, employee_id, leave_type, from_date, to_date, status, reason, created_at, user_profiles:employee_id(full_name, email)')
            .order('created_at', { ascending: false })
            .limit(20)
            .then(r => r.error ? { data: [] } : r),
        supabase.from('leave_requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending')
            .then(r => r.error ? { count: 0 } : r),
    ]);

    const employees = empRes.data || [];
    const leaveRequests = leaveRes.data || [];
    const pendingLeaveCount = pendingLeaveRes.count || 0;

    const totalEmp = employees.length;
    const hrManagers = employees.filter(e => e.role === 'hr_manager').length;
    const crmTeam = employees.filter(e => ['relationship_exec', 'relationship_manager'].includes(e.role)).length;

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

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-[family-name:var(--font-outfit)]">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">HRM Command Overview</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Manage employee profiles, team contacts, and leave approvals.</p>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Workforce" value={totalEmp} gradient="from-emerald-600 to-teal-600" icon={Users} />
                    <StatCard title="HR Managers" value={hrManagers} gradient="from-violet-600 to-purple-600" icon={UserPlus} />
                    <StatCard title="CRM Team" value={crmTeam} gradient="from-amber-500 to-orange-500" icon={DollarSign} />
                    <StatCard title="Pending Leaves" value={pendingLeaveCount} sub="Awaiting approval" gradient="from-red-500 to-rose-500" icon={Clock} />
                </div>

                {/* Employees Table */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Workforce Directory</h2>
                            <p className="text-sm text-gray-500">{totalEmp} active team members</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-100">
                                <tr>
                                    <th className="p-4 pl-6">Employee</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4 pr-6">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {employees.length > 0 ? employees.slice(0, 15).map(emp => (
                                    <tr key={emp.id} className="hover:bg-emerald-50/20 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-sm font-bold text-emerald-700">
                                                    {emp.full_name?.charAt(0) || '?'}
                                                </div>
                                                <span className="font-semibold text-gray-900 text-sm">{emp.full_name || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {displayEmail(emp.email) ?? (
                                                <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No email linked</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-lg border ${roleColor[emp.role] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                                {roleLabel[emp.role] || emp.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <ContactActions phone={emp.phone} email={emp.email} name={emp.full_name} compact />
                                        </td>
                                        <td className="p-4 pr-6 text-xs text-gray-500">
                                            {new Date(emp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="5" className="p-12 text-center text-gray-400 text-sm">No employees found. Grant panel access via Career Applications.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Leave Requests */}
                {leaveRequests.length > 0 && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Recent Leave Requests</h2>
                                {pendingLeaveCount > 0 && (
                                    <p className="text-sm text-amber-600 font-semibold mt-0.5">{pendingLeaveCount} pending approval</p>
                                )}
                            </div>
                            <Link href="/hrm/leaves" className="px-4 py-2 bg-amber-50 text-amber-700 font-semibold rounded-xl text-sm hover:bg-amber-100 transition-colors">
                                View All Leaves
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 pl-6">Employee</th>
                                        <th className="p-4">Leave Type</th>
                                        <th className="p-4">Duration</th>
                                        <th className="p-4">Reason</th>
                                        <th className="p-4 pr-6">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {leaveRequests.map(lr => (
                                        <tr key={lr.id} className="hover:bg-amber-50/20 transition-colors">
                                            <td className="p-4 pl-6">
                                                <p className="font-semibold text-gray-900 text-sm">{lr.user_profiles?.full_name || 'Unknown'}</p>
                                                <p className="text-xs text-gray-400">
                                                    {displayEmail(lr.user_profiles?.email) ?? (
                                                        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No email linked</span>
                                                    )}
                                                </p>
                                            </td>
                                            <td className="p-4 text-sm text-gray-600 capitalize">{lr.leave_type || '—'}</td>
                                            <td className="p-4 text-xs text-gray-500">
                                                {new Date(lr.from_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} →
                                                {new Date(lr.to_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </td>
                                            <td className="p-4 text-xs text-gray-500 max-w-[200px] truncate">{lr.reason || '—'}</td>
                                            <td className="p-4 pr-6">
                                                <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-lg border capitalize ${LEAVE_STATUS_STYLE[lr.status] || ''}`}>
                                                    {lr.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
