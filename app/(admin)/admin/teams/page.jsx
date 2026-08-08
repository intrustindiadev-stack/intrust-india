'use client';

import { useState, useEffect, useCallback } from 'react';
import { Network, Plus, RefreshCw, Users, Shield, MapPin, Layers, LayoutGrid, List, Search, Filter, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import OrgChart from '@/components/admin/teams/OrgChart';
import TeamCreateDrawer from '@/components/admin/teams/TeamCreateDrawer';
import TeamEditDrawer from '@/components/admin/teams/TeamEditDrawer';
import MemberAssignDrawer from '@/components/admin/teams/MemberAssignDrawer';
import BulkTransferDrawer from '@/components/admin/teams/BulkTransferDrawer';
import ConfirmModal from '@/components/admin/teams/ConfirmModal';
import ServiceAreaDrawer from '@/components/admin/teams/ServiceAreaDrawer';

export default function AdminTeamsPage() {
    const [teams, setTeams] = useState([]);
    const [unassignedUsers, setUnassignedUsers] = useState([]);
    const [capabilities, setCapabilities] = useState({});
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'list'

    // Filters
    const [search, setSearch] = useState('');
    const [regionFilter, setRegionFilter] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('true');

    // Drawers & Modals state
    const [showCreate, setShowCreate] = useState(false);
    const [showBulkTransfer, setShowBulkTransfer] = useState(false);
    const [selectedTeamForEdit, setSelectedTeamForEdit] = useState(null);
    const [selectedTeamForAssign, setSelectedTeamForAssign] = useState(null);
    const [selectedTeamForServiceArea, setSelectedTeamForServiceArea] = useState(null);

    // Confirm Modal State
    const [removeModalState, setRemoveModalState] = useState({
        isOpen: false,
        userId: null,
        teamId: null,
        memberName: '',
        loading: false
    });

    const fetchTeamsData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (regionFilter) params.set('region_level', regionFilter);
            if (cityFilter) params.set('city', cityFilter);
            if (activeFilter) params.set('is_active', activeFilter);

            const res = await fetch(`/api/teams?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load teams');

            setTeams(data.teams || []);
            setUnassignedUsers(data.unassigned_users || []);
            setCapabilities(data.capabilities || {});
        } catch (err) {
            console.error('[TEAMS] Fetch error:', err);
            toast.error(err.message || 'Failed to fetch team hierarchy');
        } finally {
            setLoading(false);
        }
    }, [search, regionFilter, cityFilter, activeFilter]);

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

    // Open confirmation modal for member removal
    const handlePromptRemoveMember = (userId, teamId) => {
        const team = teams.find(t => t.id === teamId);
        const memberObj = team?.members?.find(m => m.user?.id === userId);
        const memberName = memberObj?.user?.full_name || memberObj?.user?.email || 'this member';

        setRemoveModalState({
            isOpen: true,
            userId,
            teamId,
            memberName,
            loading: false
        });
    };

    const handleConfirmRemoveMember = async (reason) => {
        setRemoveModalState(prev => ({ ...prev, loading: true }));
        try {
            const res = await fetch('/api/teams/members', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: removeModalState.userId,
                    team_id: removeModalState.teamId,
                    reason
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to remove member');

            toast.success('Member removed');
            fetchTeamsData();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setRemoveModalState({ isOpen: false, userId: null, teamId: null, memberName: '', loading: false });
        }
    };

    // Derived Statistics & Hierarchy Warnings
    const totalMembers = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0);
    const totalCities = new Set(teams.map(t => t.city).filter(Boolean)).size;

    // Detect orphaned or lead-less teams
    const warningTeams = teams.filter(t => !t.team_lead_id || (t.region_level === 'area' && !t.parent_team_id));

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen bg-gray-50/30 dark:bg-gray-900/30 font-[family-name:var(--font-outfit)]">
            {/* Drawers and Modals */}
            <AnimatePresence>
                {showCreate && (
                    <TeamCreateDrawer
                        teams={teams}
                        availableLeads={unassignedUsers.filter(u => ['relationship_manager', 'admin', 'super_admin'].includes(u.role))}
                        onClose={() => setShowCreate(false)}
                        onCreated={() => fetchTeamsData()}
                    />
                )}
                {showBulkTransfer && (
                    <BulkTransferDrawer
                        teams={teams}
                        onClose={() => setShowBulkTransfer(false)}
                        onSuccess={() => fetchTeamsData()}
                    />
                )}
                {selectedTeamForEdit && (
                    <TeamEditDrawer
                        team={selectedTeamForEdit}
                        teams={teams}
                        availableLeads={unassignedUsers.filter(u => ['relationship_manager', 'admin', 'super_admin'].includes(u.role))}
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
                {selectedTeamForServiceArea && (
                    <ServiceAreaDrawer
                        team={selectedTeamForServiceArea}
                        onClose={() => setSelectedTeamForServiceArea(null)}
                    />
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={removeModalState.isOpen}
                title="Remove Team Member"
                message={`Are you sure you want to remove ${removeModalState.memberName} from this team?`}
                confirmText="Remove Member"
                confirmVariant="danger"
                requireReason={true}
                reasonPlaceholder="Reason for removal..."
                loading={removeModalState.loading}
                onClose={() => setRemoveModalState({ isOpen: false, userId: null, teamId: null, memberName: '', loading: false })}
                onConfirm={handleConfirmRemoveMember}
            />

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 shadow-inner">
                            <Network size={24} />
                        </div>
                        Team Hierarchy
                    </h1>
                    <p className="text-sm font-bold text-gray-500 mt-2">
                        Multi-region team management, atomic assignments & optimistic concurrency control
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* View Switcher */}
                    <div className="bg-white dark:bg-gray-800 p-1.5 rounded-2xl flex items-center border border-gray-200 dark:border-gray-700 shadow-sm">
                        <button
                            onClick={() => setViewMode('chart')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                viewMode === 'chart'
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md transform scale-100'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <LayoutGrid size={14} /> Chart
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                viewMode === 'list'
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md transform scale-100'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <List size={14} /> Table
                        </button>
                    </div>

                    <button
                        onClick={fetchTeamsData}
                        className="w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>

                    {capabilities.canAssignMembers && (
                        <button
                            onClick={() => setShowBulkTransfer(true)}
                            className="inline-flex items-center gap-2 border-2 border-indigo-100 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                        >
                            <ArrowRightLeft size={14} /> Bulk Transfer
                        </button>
                    )}

                    {capabilities.canCreateTeam && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white hover:-translate-y-0.5 text-white dark:text-gray-900 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl"
                        >
                            <Plus size={16} /> Create Team
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white dark:bg-gray-800 p-2 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 overflow-hidden">
                <div className="relative flex-1 w-full pl-4">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search teams..."
                        className="w-full pl-8 pr-4 py-3 bg-transparent text-sm font-bold text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400"
                    />
                </div>

                <div className="flex items-center gap-2 pr-2">
                    <select
                        value={regionFilter}
                        onChange={(e) => setRegionFilter(e.target.value)}
                        className="px-4 py-2.5 rounded-full border border-gray-100 dark:border-gray-700 text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 focus:outline-none cursor-pointer"
                    >
                        <option value="">All Levels</option>
                        <option value="state">State</option>
                        <option value="city">City</option>
                        <option value="area">Area</option>
                    </select>

                    <select
                        value={activeFilter}
                        onChange={(e) => setActiveFilter(e.target.value)}
                        className="px-4 py-2.5 rounded-full border border-gray-100 dark:border-gray-700 text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 focus:outline-none cursor-pointer"
                    >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Hierarchy Warning Banner */}
            {warningTeams.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex items-center justify-between gap-3 text-xs text-amber-900 font-semibold">
                    <div className="flex items-center gap-2.5">
                        <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                        <span>
                            Hierarchy Warning: {warningTeams.length} team(s) have unassigned team leads or missing parent configurations.
                        </span>
                    </div>
                </div>
            )}

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="w-12 h-12 rounded-[1.25rem] mb-6 flex items-center justify-center font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                        <Layers size={24} />
                    </div>
                    <div>
                        <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Teams Displayed</div>
                        <div className="text-3xl font-black text-gray-900 dark:text-white">{teams.length}</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="w-12 h-12 rounded-[1.25rem] mb-6 flex items-center justify-center font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Team Members</div>
                        <div className="text-3xl font-black text-gray-900 dark:text-white">{totalMembers}</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="w-12 h-12 rounded-[1.25rem] mb-6 flex items-center justify-center font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Active Cities</div>
                        <div className="text-3xl font-black text-gray-900 dark:text-white">{totalCities || 1}</div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="w-12 h-12 rounded-[1.25rem] mb-6 flex items-center justify-center font-bold bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400">
                        <Shield size={24} />
                    </div>
                    <div>
                        <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Available Reps</div>
                        <div className="text-3xl font-black text-gray-900 dark:text-white">{unassignedUsers.length}</div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div className="bg-slate-50/50 border border-slate-200/60 rounded-[2.5rem] h-[600px] flex flex-col items-center justify-center text-slate-500 space-y-4 shadow-inner">
                    <RefreshCw size={36} className="animate-spin text-indigo-500" />
                    <p className="font-bold text-slate-700 text-base tracking-wide">Loading Team Hierarchy...</p>
                </div>
            ) : viewMode === 'chart' ? (
                <OrgChart
                    teams={teams}
                    onEditTeam={capabilities.canEditTeam ? setSelectedTeamForEdit : undefined}
                    onAssignMember={capabilities.canAssignMembers ? setSelectedTeamForAssign : undefined}
                    onRemoveMember={capabilities.canAssignMembers ? handlePromptRemoveMember : undefined}
                    onReassignMember={capabilities.canAssignMembers ? handleReassignMember : undefined}
                    onManageServiceAreas={capabilities.canEditTeam ? setSelectedTeamForServiceArea : undefined}
                    isReadOnly={!capabilities.canAssignMembers}
                />
            ) : (
                /* Table View fallback */
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-[10px] uppercase tracking-widest text-gray-400 font-black">
                                <tr>
                                    <th className="p-5 pl-8">Team Name</th>
                                    <th className="p-5">Level</th>
                                    <th className="p-5">Location</th>
                                    <th className="p-5">Team Lead</th>
                                    <th className="p-5">Members</th>
                                    <th className="p-5">Version</th>
                                    <th className="p-5 pr-8 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {teams.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
                                        <td className="p-5 pl-8 font-black text-gray-900 dark:text-white">
                                            <div className="flex items-center gap-3">
                                                <span className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: t.color || '#6366f1' }} />
                                                {t.name}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                {t.region_level}
                                            </span>
                                        </td>
                                        <td className="p-5 text-xs font-bold text-gray-500">
                                            {t.city || 'State'} {t.area ? `• ${t.area}` : ''}
                                        </td>
                                        <td className="p-5 text-sm font-black text-gray-800 dark:text-gray-200">
                                            {t.team_lead?.full_name || 'Unassigned'}
                                        </td>
                                        <td className="p-5 text-sm font-black text-gray-500">
                                            {t.members?.length || 0}
                                        </td>
                                        <td className="p-5 text-xs font-mono font-bold text-gray-400">
                                            v{t.version || 1}
                                        </td>
                                        <td className="p-5 pr-8 text-right space-x-2">
                                            {capabilities.canAssignMembers && (
                                                <button
                                                    onClick={() => setSelectedTeamForAssign(t)}
                                                    className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-black text-xs uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                                >
                                                    + Member
                                                </button>
                                            )}
                                            {capabilities.canEditTeam && (
                                                <button
                                                    onClick={() => setSelectedTeamForServiceArea(t)}
                                                    className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-wider hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                                >
                                                    Coverage
                                                </button>
                                            )}
                                            {capabilities.canEditTeam && (
                                                <button
                                                    onClick={() => setSelectedTeamForEdit(t)}
                                                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-black text-xs uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
