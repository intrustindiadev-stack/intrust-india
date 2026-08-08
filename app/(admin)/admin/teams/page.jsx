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
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)] relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />
            <div className="absolute top-40 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none -ml-20" />

            <div className="relative z-10 space-y-8 max-w-[1600px] mx-auto">
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

                {/* Hero Header */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] border border-white/50 dark:border-gray-700/50 shadow-2xl shadow-indigo-100/20 dark:shadow-black/20 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-indigo-500/10 transition-colors duration-500" />
                    
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative z-10">
                        <div className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest mb-3">
                            <Network size={14} /> Organization Control Center
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                            Team Hierarchy
                        </h1>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 max-w-md">
                            Multi-region team management, atomic assignments & optimistic concurrency control
                        </p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row flex-wrap items-center gap-4 w-full lg:w-auto relative z-10">
                        
                        {/* Premium Segmented Control */}
                        <div className="flex items-center bg-gray-100/80 dark:bg-gray-900/50 p-1.5 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-md w-full sm:w-auto relative">
                            {['chart', 'list'].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`relative z-10 flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${viewMode === mode ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >
                                    {mode === 'chart' ? <LayoutGrid size={16} /> : <List size={16} />} 
                                    <span className="capitalize">{mode === 'list' ? 'Table' : 'Chart'}</span>
                                    {viewMode === mode && (
                                        <motion.div
                                            layoutId="activeTabAdminTeams"
                                            className="absolute inset-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50"
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            style={{ zIndex: -1 }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={fetchTeamsData}
                            className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 shadow-sm backdrop-blur-md transition-all shrink-0"
                            title="Refresh"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>

                        {capabilities.canAssignMembers && (
                            <button
                                onClick={() => setShowBulkTransfer(true)}
                                className="inline-flex items-center justify-center gap-2 border-2 border-indigo-100/50 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/20 hover:bg-indigo-100/80 text-indigo-700 dark:text-indigo-400 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all backdrop-blur-md w-full sm:w-auto"
                            >
                                <ArrowRightLeft size={16} /> Bulk Transfer
                            </button>
                        )}

                        {capabilities.canCreateTeam && (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 w-full sm:w-auto"
                            >
                                <Plus size={16} /> Create Team
                            </button>
                        )}
                    </motion.div>
                </div>

            {/* Filter Toolbar */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/70 dark:bg-gray-800/70 p-3 rounded-[2rem] border border-white/50 dark:border-gray-700/50 shadow-xl shadow-gray-200/20 dark:shadow-black/20 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative flex-1 w-full pl-2">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search teams by name, lead, or region..."
                        className="w-full pl-12 pr-4 py-3 bg-transparent text-sm font-bold text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400"
                    />
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto pr-2">
                    <div className="relative group">
                        <select
                            value={regionFilter}
                            onChange={(e) => setRegionFilter(e.target.value)}
                            className="appearance-none px-6 py-3 rounded-2xl border-none bg-gray-100/80 dark:bg-gray-900/50 text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/50 cursor-pointer w-full sm:w-auto min-w-[140px]"
                        >
                            <option value="">All Regions</option>
                            <option value="state">State Level</option>
                            <option value="city">City Level</option>
                            <option value="area">Area Level</option>
                        </select>
                        <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                    </div>

                    <div className="relative group">
                        <select
                            value={activeFilter}
                            onChange={(e) => setActiveFilter(e.target.value)}
                            className="appearance-none px-6 py-3 rounded-2xl border-none bg-gray-100/80 dark:bg-gray-900/50 text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/50 cursor-pointer w-full sm:w-auto min-w-[120px]"
                        >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>
                </div>
            </motion.div>

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
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/50 dark:border-gray-700/50 shadow-xl shadow-gray-200/20 dark:shadow-black/20 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group">
                    <div className="w-14 h-14 rounded-3xl mb-8 flex items-center justify-center font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shadow-inner">
                        <Layers size={24} />
                    </div>
                    <div>
                        <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Teams Displayed</div>
                        <div className="text-4xl font-black text-gray-900 dark:text-white">{teams.length}</div>
                    </div>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/50 dark:border-gray-700/50 shadow-xl shadow-gray-200/20 dark:shadow-black/20 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group">
                    <div className="w-14 h-14 rounded-3xl mb-8 flex items-center justify-center font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shadow-inner">
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Team Members</div>
                        <div className="text-4xl font-black text-gray-900 dark:text-white">{totalMembers}</div>
                    </div>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/50 dark:border-gray-700/50 shadow-xl shadow-gray-200/20 dark:shadow-black/20 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group">
                    <div className="w-14 h-14 rounded-3xl mb-8 flex items-center justify-center font-bold bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform shadow-inner">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Active Cities</div>
                        <div className="text-4xl font-black text-gray-900 dark:text-white">{totalCities || 1}</div>
                    </div>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/50 dark:border-gray-700/50 shadow-xl shadow-gray-200/20 dark:shadow-black/20 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group">
                    <div className="w-14 h-14 rounded-3xl mb-8 flex items-center justify-center font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform shadow-inner">
                        <Shield size={24} />
                    </div>
                    <div>
                        <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Available Reps</div>
                        <div className="text-4xl font-black text-gray-900 dark:text-white">{unassignedUsers.length}</div>
                    </div>
                </div>
            </motion.div>

            {/* Main Content Area */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="min-h-[600px]">
                {loading ? (
                    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/50 dark:border-gray-700/50 rounded-[2.5rem] h-[600px] flex flex-col items-center justify-center text-gray-400 space-y-4 shadow-sm">
                        <RefreshCw size={36} className="animate-spin text-indigo-400" />
                        <p className="font-bold text-sm tracking-wide uppercase">Loading Team Hierarchy...</p>
                    </div>
                ) : viewMode === 'chart' ? (
                    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-[2.5rem] shadow-xl shadow-gray-200/20 dark:shadow-black/20 overflow-hidden p-6 sm:p-8">
                        <OrgChart
                            teams={teams}
                            onEditTeam={capabilities.canEditTeam ? setSelectedTeamForEdit : undefined}
                            onAssignMember={capabilities.canAssignMembers ? setSelectedTeamForAssign : undefined}
                            onRemoveMember={capabilities.canAssignMembers ? handlePromptRemoveMember : undefined}
                            onReassignMember={capabilities.canAssignMembers ? handleReassignMember : undefined}
                            onManageServiceAreas={capabilities.canEditTeam ? setSelectedTeamForServiceArea : undefined}
                            isReadOnly={!capabilities.canAssignMembers}
                        />
                    </div>
                ) : (
                    /* Table View fallback */
                    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-[2.5rem] shadow-xl shadow-gray-200/20 dark:shadow-black/20 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="bg-gray-100/50 dark:bg-gray-900/50 border-b border-gray-200/50 dark:border-gray-700/50 text-[10px] uppercase tracking-widest text-gray-500 font-black">
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
                                <tbody className="divide-y divide-gray-100/50 dark:divide-gray-700/50">
                                    {teams.map(t => (
                                        <tr key={t.id} className="hover:bg-white dark:hover:bg-gray-800 transition-colors">
                                            <td className="p-5 pl-8 font-black text-gray-900 dark:text-white">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: t.color || '#6366f1' }} />
                                                    {t.name}
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200/50 dark:border-gray-600/50 shadow-sm">
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
            </motion.div>
            </div>
        </div>
    );
}
