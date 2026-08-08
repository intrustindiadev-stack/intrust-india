'use client';

import { useState, useEffect, useCallback } from 'react';
import { Network, RefreshCw, Users, Shield, MapPin, Search, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import OrgChart from '@/components/admin/teams/OrgChart';
import MemberAssignDrawer from '@/components/admin/teams/MemberAssignDrawer';
import ConfirmModal from '@/components/admin/teams/ConfirmModal';
import ServiceAreaDrawer from '@/components/admin/teams/ServiceAreaDrawer';
import LeadAllocationPanel from '@/components/admin/teams/LeadAllocationPanel';
import TeamGrid from '@/components/admin/teams/TeamGrid';

export default function CrmTeamsPage() {
    const { profile } = useAuth();
    const [teams, setTeams] = useState([]);
    const [unassignedUsers, setUnassignedUsers] = useState([]);
    const [capabilities, setCapabilities] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedTeamForAssign, setSelectedTeamForAssign] = useState(null);
    const [selectedTeamForAreas, setSelectedTeamForAreas] = useState(null);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'hierarchy'

    // Remove Confirmation Modal
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

            // Fetch server-scoped teams (server handles authorized subtree filtering!)
            const res = await fetch(`/api/teams?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load teams');

            setTeams(data.teams || []);
            setUnassignedUsers(data.unassigned_users || []);
            setCapabilities(data.capabilities || {});
        } catch (err) {
            console.error('[CRM TEAMS] Fetch error:', err);
            toast.error(err.message || 'Failed to load team hierarchy');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchTeamsData();
    }, [fetchTeamsData]);

    const handleReassignMember = async (userId, targetTeamId) => {
        if (!capabilities.canAssignMembers) {
            toast.error('You do not have permission to reassign team members');
            return;
        }

        try {
            const res = await fetch('/api/teams/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_id: targetTeamId, user_id: userId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reassign member');

            toast.success('Member reassigned!');
            fetchTeamsData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handlePromptRemoveMember = (userId, teamId) => {
        if (!capabilities.canAssignMembers) {
            toast.error('You do not have permission to remove team members');
            return;
        }

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

            toast.success('Member removed from team');
            fetchTeamsData();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setRemoveModalState({ isOpen: false, userId: null, teamId: null, memberName: '', loading: false });
        }
    };

    // Empty state: user has not been assigned to any team yet
    const renderNoTeamState = () => (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-5 shadow-sm">
                <Users size={36} className="text-indigo-300" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-800 mb-2">No Authorized Subtree Found</h2>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                You are not currently assigned to an active team. Contact your relationship manager or administrator to be added.
            </p>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)] relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />
            <div className="absolute top-40 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none -ml-20" />

            <div className="relative z-10 space-y-8 max-w-7xl mx-auto">
                {selectedTeamForAssign && (
                    <MemberAssignDrawer
                        team={selectedTeamForAssign}
                        availableUsers={unassignedUsers}
                        onClose={() => setSelectedTeamForAssign(null)}
                        onMemberAssigned={() => fetchTeamsData()}
                    />
                )}

                {selectedTeamForAreas && (
                    <ServiceAreaDrawer
                        team={selectedTeamForAreas}
                        onClose={() => setSelectedTeamForAreas(null)}
                    />
                )}

                <ConfirmModal
                    isOpen={removeModalState.isOpen}
                    title="Remove Member from Team"
                    message={`Are you sure you want to remove ${removeModalState.memberName}?`}
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
                            <Users size={14} /> Organization Overview
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                            My Organization
                        </h1>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 max-w-md">
                            {capabilities.canAssignMembers 
                                ? 'Manage your subtree structure, assign members, and monitor capacity.' 
                                : 'Explore your assigned organization structure and team members.'}
                        </p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto relative z-10">
                        
                        {/* Premium Segmented Control */}
                        <div className="flex items-center bg-gray-100/80 dark:bg-gray-900/50 p-1.5 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-md w-full sm:w-auto relative">
                            {['grid', 'hierarchy'].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`relative z-10 flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${viewMode === mode ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >
                                    {mode === 'grid' ? <LayoutGrid size={16} /> : <Network size={16} />} 
                                    <span className="capitalize">{mode}</span>
                                    {viewMode === mode && (
                                        <motion.div
                                            layoutId="activeTabCrmTeams"
                                            className="absolute inset-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50"
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            style={{ zIndex: -1 }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Search & Refresh */}
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search organization..."
                                    className="w-full pl-10 pr-4 py-3 rounded-2xl border-none bg-gray-100/80 dark:bg-gray-900/50 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-gray-400 backdrop-blur-md shadow-inner transition-all"
                                />
                            </div>
                            <button
                                onClick={fetchTeamsData}
                                className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 shadow-sm backdrop-blur-md transition-all shrink-0"
                                title="Refresh"
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Lead Allocation Overview */}
                <AnimatePresence>
                    {capabilities.canAssignMembers && !loading && teams.length > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[2.5rem] border border-white/50 dark:border-gray-700/50 shadow-xl shadow-gray-200/20 dark:shadow-black/20 overflow-hidden"
                        >
                            <LeadAllocationPanel isManager={capabilities.canAssignMembers} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Content Area */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="min-h-[500px]">
                    {loading ? (
                        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/50 dark:border-gray-700/50 rounded-[2.5rem] h-[500px] flex flex-col items-center justify-center text-gray-400 space-y-4 shadow-sm">
                            <RefreshCw size={36} className="animate-spin text-indigo-400" />
                            <p className="font-bold text-sm tracking-wide uppercase">Loading Organization Structure...</p>
                        </div>
                    ) : teams.length === 0 ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-[2.5rem] h-[500px] flex items-center justify-center shadow-xl shadow-gray-200/20 dark:shadow-black/20">
                            {renderNoTeamState()}
                        </motion.div>
                    ) : viewMode === 'grid' ? (
                        <TeamGrid 
                            teams={teams}
                            onAssignMember={capabilities.canAssignMembers ? setSelectedTeamForAssign : undefined}
                            onRemoveMember={capabilities.canAssignMembers ? handlePromptRemoveMember : undefined}
                            onReassignMember={capabilities.canAssignMembers ? handleReassignMember : undefined}
                            onServiceAreas={capabilities.canAssignMembers ? setSelectedTeamForAreas : undefined}
                            isReadOnly={!capabilities.canAssignMembers}
                        />
                    ) : (
                        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-[2.5rem] shadow-xl shadow-gray-200/20 dark:shadow-black/20 overflow-hidden p-6 sm:p-8">
                            <OrgChart
                                teams={teams}
                                onAssignMember={capabilities.canAssignMembers ? setSelectedTeamForAssign : undefined}
                                onRemoveMember={capabilities.canAssignMembers ? handlePromptRemoveMember : undefined}
                                onReassignMember={capabilities.canAssignMembers ? handleReassignMember : undefined}
                                onServiceAreas={capabilities.canAssignMembers ? setSelectedTeamForAreas : undefined}
                                isReadOnly={!capabilities.canAssignMembers}
                            />
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
