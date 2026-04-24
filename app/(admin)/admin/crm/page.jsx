import { createAdminClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { 
    TrendingUp, Users, CheckCircle, Clock, XCircle, 
    Phone, Mail, Plus, ArrowRight, Target, BarChart3
} from 'lucide-react';

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

const STATUS_STYLE = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    contacted: 'bg-violet-50 text-violet-700 border-violet-200',
    qualified: 'bg-amber-50 text-amber-700 border-amber-200',
    proposal: 'bg-orange-50 text-orange-700 border-orange-200',
    won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    lost: 'bg-red-50 text-red-700 border-red-200',
};

export default async function AdminCRMPage() {
    const supabase = createAdminClient();

    const [leadsRes, statsRes] = await Promise.all([
        supabase.from('crm_leads')
            .select('id, title, contact_name, phone, email, status, pipeline_stage, created_at, source, assigned_to')
            .order('created_at', { ascending: false })
            .limit(20),
        supabase.from('crm_leads').select('status')
    ]);

    const leads = leadsRes.data || [];
    const allLeads = statsRes.data || [];
    
    const statusCounts = allLeads.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
    }, {});
    
    const total = allLeads.length;
    const wonCount = statusCounts.won || 0;
    const convRate = total > 0 ? Math.round((wonCount / total) * 100) : 0;
    const newLeads = statusCounts.new || 0;
    const activeLeads = (statusCounts.contacted || 0) + (statusCounts.qualified || 0) + (statusCounts.proposal || 0);

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-[family-name:var(--font-outfit)]">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">CRM Overview</h1>
                        <p className="text-gray-500 mt-1">Monitor the sales pipeline, leads, and team performance.</p>
                    </div>
                    <Link
                        href="/crm"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold rounded-xl hover:opacity-90 transition-all text-sm shadow-lg shadow-blue-500/25"
                    >
                        Open CRM Panel <ArrowRight size={15} />
                    </Link>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Leads" value={total} gradient="from-blue-600 to-violet-600" icon={Users} />
                    <StatCard title="New This Week" value={newLeads} sub="Uncontacted" gradient="from-amber-500 to-orange-500" icon={Plus} />
                    <StatCard title="Active Pipeline" value={activeLeads} sub="Contacted/Qualified/Proposal" gradient="from-violet-600 to-purple-600" icon={Target} />
                    <StatCard title="Conversion Rate" value={`${convRate}%`} sub={`${wonCount} won out of ${total}`} gradient="from-emerald-500 to-teal-500" icon={TrendingUp} />
                </div>

                {/* Pipeline Status Breakdown */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-5">Pipeline Breakdown</h2>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'].map(s => (
                            <div key={s} className={`rounded-2xl border p-4 text-center ${STATUS_STYLE[s] || 'bg-gray-50 border-gray-200'}`}>
                                <p className="text-2xl font-black">{statusCounts[s] || 0}</p>
                                <p className="text-xs font-bold uppercase mt-1 capitalize">{s}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Leads */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Recent Leads</h2>
                            <p className="text-sm text-gray-500">Latest 20 leads across all sales reps</p>
                        </div>
                        <Link href="/crm/leads" className="px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-xl text-sm hover:bg-blue-100 transition-colors flex items-center gap-1.5">
                            Full CRM <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-100">
                                <tr>
                                    <th className="p-4 pl-6">Lead</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4">Source</th>
                                    <th className="p-4">Assigned To</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 pr-6">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {leads.length > 0 ? leads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-blue-50/20 transition-colors">
                                        <td className="p-4 pl-6">
                                            <p className="font-semibold text-gray-900 text-sm">{lead.title || lead.contact_name}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{lead.contact_name}</p>
                                        </td>
                                        <td className="p-4">
                                            {lead.phone && <p className="text-xs text-gray-600 flex items-center gap-1"><Phone size={11} /> {lead.phone}</p>}
                                            {lead.email && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Mail size={11} /> {lead.email}</p>}
                                        </td>
                                        <td className="p-4 text-xs text-gray-500">{lead.source || '—'}</td>
                                        <td className="p-4">
                                            <p className="text-xs font-medium text-gray-700">{lead.assigned_to ? `ID: ${lead.assigned_to.slice(0, 8)}…` : 'Unassigned'}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-lg border capitalize ${STATUS_STYLE[lead.status] || 'bg-gray-50 border-gray-200'}`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6 text-xs text-gray-500">
                                            {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="p-12 text-center text-gray-400 text-sm">No leads found. The CRM is empty.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
