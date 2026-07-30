'use client';

import { useState, useEffect, useCallback } from 'react';
import { Network, Plus, RefreshCw, Users, Shield, MapPin, Layers, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import OrgChart from '@/components/admin/teams/OrgChart';
import TeamCreateDrawer from '@/components/admin/teams/TeamCreateDrawer';
import TeamEditDrawer from '@/components/admin/teams/TeamEditDrawer';
import MemberAssignDrawer from '@/components/admin/teams/MemberAssignDrawer';

export default function AdminTeamsPage() {
    const [teams, setTeams] = useState([]);
    const [unassignedUsers, setUnassignedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'list'

    // Drawer state
    const [showCreate, setShowCreate] = useState(false);
    const [selectedTeamForEdit, setSelectedTeamForEdit] = useState(null);
    const [selectedTeamForAssign, setSelectedTeamForAssign] = useState(null);

    const fetchTeamsData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/teams');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load teams');

            setTeams(data.teams || []);
            setUnassignedUsers(data.unassigned_users || []);
        } catch (err) {
            console.error('[TEAMS] Fetch error:', err);
            toast.error(err.message || 'Failed to fetch team hierarchy');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTeamsData();
    }, [fetchTeamsData]);

    // Member reassignment via drag-and-drop or drawer
    const handleReassignMember = async (userId, targetTeamId) => {
        try {
            const res = await fetch('/api/teams/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_id: targetTeamId, user_id: userId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reassign member');

            toast.success('Member reassigned cleanly!');
            fetchTeamsData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    // Member remove from team
    const handleRemoveMember = async (userId, teamId) => {
        if (!confirm('Remove member from this team?')) return;
        try {
            const res = await fetch(`/api/teams/members?user_id=${userId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to remove member');

            toast.success('Member removed');
            fetchTeamsData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    // Stats
    const totalMembers = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0);
    const totalCities = new Set(teams.map(t => t.city).filter(Boolean)).size;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            {/* Drawers */}
            <AnimatePresence>
                {showCreate && (
                    <TeamCreateDrawer
                        teams={teams}
                        availableLeads={unassignedUsers.filter(u => ['sales_manager', 'admin', 'super_admin'].includes(u.role))}
                        onClose={() => setShowCreate(false)}
                        onCreated={() => fetchTeamsData()}
                    />
                )}
                {selectedTeamForEdit && (
                    <TeamEditDrawer
                        team={selectedTeamForEdit}
                        teams={teams}
                        availableLeads={unassignedUsers.filter(u => ['sales_manager', 'admin', 'super_admin'].includes(u.role))}
                        onClose={() => setSelectedTeamForEdit(null)}
                        onUpdated={() => fetchTeamsData()}
                        onDeleted={() => fetchTeamsData()}
                    />
                )}
                {selectedTeamForAssign && (
                    <MemberAssignDrawer
                        team={selectedTeamForAssign}
                        availableUsers={unassignedUsers}
                        onClose={() => setSelectedTeamForAssign(null)}
                        onMemberAssigned={() => fetchTeamsData()}
                    />
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <Network className="text-indigo-600" size={28} />
                        Team Hierarchy & Org Chart
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        State & City dynamic regional grouping, lead ownership & member drag-and-drop reassignment
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* View Switcher */}
                    <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200">
                        <button
                            onClick={() => setViewMode('chart')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                viewMode === 'chart'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <LayoutGrid size={14} /> Org Chart
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                viewMode === 'list'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <List size={14} /> Table View
                        </button>
                    </div>

                    <button
                        onClick={fetchTeamsData}
                        className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={`text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-4 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/25 text-sm"
                    >
                        <Plus size={16} /> Create Team
                    </button>
                </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Layers size={22} />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{teams.length}</div>
                        <div className="text-xs text-slate-500 font-medium">Active Teams</div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <Users size={22} />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{totalMembers}</div>
                        <div className="text-xs text-slate-500 font-medium">Team Members</div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                        <MapPin size={22} />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{totalCities || 1}</div>
                        <div className="text-xs text-slate-500 font-medium">Cities (Bhopal MP)</div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <Shield size={22} />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{unassignedUsers.length}</div>
                        <div className="text-xs text-slate-500 font-medium">Unassigned Sales Reps</div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div className="bg-slate-900 rounded-[2.5rem] h-[600px] flex flex-col items-center justify-center text-slate-400 space-y-3 shadow-2xl">
                    <RefreshCw size={36} className="animate-spin text-indigo-400" />
                    <p className="font-bold text-slate-200 text-base">Loading Team Hierarchy...</p>
                </div>
            ) : viewMode === 'chart' ? (
                <OrgChart
                    teams={teams}
                    onEditTeam={setSelectedTeamForEdit}
                    onAssignMember={setSelectedTeamForAssign}
                    onRemoveMember={handleRemoveMember}
                    onReassignMember={handleReassignMember}
                />
            ) : (
                /* Table View fallback */
                <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-xl overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                            <tr>
                                <th className="p-4 pl-6">Team Name</th>
                                <th className="p-4">Level</th>
                                <th className="p-4">Location</th>
                                <th className="p-4">Team Lead</th>
                                <th className="p-4">Members</th>
                                <th className="p-4 pr-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {teams.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="p-4 pl-6 font-bold text-slate-900">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color || '#6366f1' }} />
                                            {t.name}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                                            {t.region_level}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs font-medium text-slate-600">
                                        {t.city || 'State'} {t.area ? `• ${t.area}` : ''}
                                    </td>
                                    <td className="p-4 text-xs font-bold text-slate-800">
                                        {t.team_lead?.full_name || 'Unassigned'}
                                    </td>
                                    <td className="p-4 text-xs font-semibold text-slate-600">
                                        {t.members?.length || 0} members
                                    </td>
                                    <td className="p-4 pr-6 text-right space-x-2">
                                        <button
                                            onClick={() => setSelectedTeamForAssign(t)}
                                            className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-xs hover:bg-indigo-100 transition-colors"
                                        >
                                            + Member
                                        </button>
                                        <button
                                            onClick={() => setSelectedTeamForEdit(t)}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
