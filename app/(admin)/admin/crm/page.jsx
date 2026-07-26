import { createAdminClient } from '@/lib/supabaseServer';
import { 
    TrendingUp, Users, Target, Plus
} from 'lucide-react';
import ActiveLeadsPipelineClient from '@/components/admin/crm/ActiveLeadsPipelineClient';

function StatCard({ title, value, sub, gradient, icon: Icon }) {
    return (
        <div className={`relative overflow-hidden rounded-[2rem] p-6 sm:p-8 text-white bg-gradient-to-br ${gradient} shadow-xl shadow-indigo-500/10 transition-transform hover:-translate-y-1 hover:shadow-2xl`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full backdrop-blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full blur-2xl" />
            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                    <Icon size={24} className="drop-shadow-sm" />
                </div>
                <div>
                    <p className="text-white/80 text-[11px] font-black uppercase tracking-widest mb-1.5 drop-shadow-sm">{title}</p>
                    <p className="text-4xl sm:text-5xl font-black drop-shadow-md tracking-tight">{value}</p>
                    {sub && <p className="text-white/80 text-xs mt-2 font-medium bg-black/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">{sub}</p>}
                </div>
            </div>
        </div>
    );
}

const STATUS_STYLE = {
    new: 'bg-blue-50/50 text-blue-700 border-blue-200 shadow-blue-500/10',
    contacted: 'bg-violet-50/50 text-violet-700 border-violet-200 shadow-violet-500/10',
    qualified: 'bg-amber-50/50 text-amber-700 border-amber-200 shadow-amber-500/10',
    proposal: 'bg-orange-50/50 text-orange-700 border-orange-200 shadow-orange-500/10',
    won: 'bg-emerald-50/50 text-emerald-700 border-emerald-200 shadow-emerald-500/10',
    lost: 'bg-red-50/50 text-red-700 border-red-200 shadow-red-500/10',
};

export default async function AdminCRMPage() {
    const supabase = createAdminClient();

    const [leadsRes, statsRes] = await Promise.all([
        supabase.from('crm_leads')
            .select('*')
            .is('archived_at', null)
            .order('created_at', { ascending: false })
            .limit(20),
        supabase.from('crm_leads').select('status').is('archived_at', null)
    ]);

    const leadsRaw = leadsRes.data || [];
    const allLeads = statsRes.data || [];

    // Map assigned user profiles safely
    const assignedIds = Array.from(new Set(leadsRaw.map(l => l.assigned_to).filter(Boolean)));
    let profileMap = {};
    if (assignedIds.length > 0) {
        const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .in('id', assignedIds);
        (profiles || []).forEach(p => {
            profileMap[p.id] = p.full_name;
        });
    }

    const initialLeads = leadsRaw.map(l => ({
        ...l,
        user_profiles: l.assigned_to && profileMap[l.assigned_to] ? { full_name: profileMap[l.assigned_to] } : null
    }));
    
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
        <div className="min-h-screen bg-[#F8FAFC] font-[family-name:var(--font-outfit)] relative">
            {/* Background elements */}
            <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-50 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-0 w-96 h-96 bg-purple-200/40 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-40 left-0 w-96 h-96 bg-blue-200/40 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-10 relative z-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4">
                    <div className="flex flex-col gap-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/50 text-indigo-700 text-xs font-bold w-fit border border-indigo-200/50 backdrop-blur-sm">
                            <Target size={14} /> CRM Command Center
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Overview</h1>
                        <p className="text-slate-500 font-medium text-lg">Comprehensive lead pipeline analytics and executive assignments.</p>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total Leads" value={total} gradient="from-blue-600 via-indigo-600 to-violet-700" icon={Users} />
                    <StatCard title="New This Week" value={newLeads} sub="Uncontacted" gradient="from-amber-400 via-orange-500 to-rose-500" icon={Plus} />
                    <StatCard title="Active Pipeline" value={activeLeads} sub="Contacted / Proposal" gradient="from-violet-500 via-purple-600 to-fuchsia-700" icon={Target} />
                    <StatCard title="Conversion Rate" value={`${convRate}%`} sub={`${wonCount} Won`} gradient="from-emerald-400 via-teal-500 to-cyan-600" icon={TrendingUp} />
                </div>

                {/* Pipeline Status Breakdown */}
                <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/50 shadow-xl shadow-slate-200/40 p-6 sm:p-8 transition-all hover:shadow-2xl">
                    <h2 className="text-xl font-extrabold text-slate-900 mb-6 tracking-tight flex items-center gap-2">
                        Pipeline Breakdown
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'].map(s => (
                            <div key={s} className={`rounded-2xl border p-5 text-center flex flex-col justify-center shadow-sm backdrop-blur-md transition-transform hover:scale-[1.02] ${STATUS_STYLE[s] || 'bg-gray-50 border-gray-200'}`}>
                                <p className="text-3xl font-black mb-1 drop-shadow-sm">{statusCounts[s] || 0}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{s}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Active Leads Pipeline with Inline Assignment */}
                <ActiveLeadsPipelineClient initialLeads={initialLeads} />
            </div>
        </div>
    );
}

