'use client';

import { useState, useEffect, useCallback } from 'react';
import { Network, RefreshCw, Users, Shield, MapPin, Search } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import OrgChart from '@/components/admin/teams/OrgChart';
import MemberAssignDrawer from '@/components/admin/teams/MemberAssignDrawer';
import ConfirmModal from '@/components/admin/teams/ConfirmModal';
import ServiceAreaDrawer from '@/components/admin/teams/ServiceAreaDrawer';
import LeadAllocationPanel from '@/components/admin/teams/LeadAllocationPanel';

export default function CrmTeamsPage() {
    const { profile } = useAuth();
    const [teams, setTeams] = useState([]);
    const [unassignedUsers, setUnassignedUsers] = useState([]);
    const [capabilities, setCapabilities] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedTeamForAssign, setSelectedTeamForAssign] = useState(null);
    const [selectedTeamForAreas, setSelectedTeamForAreas] = useState(null);
    const [search, setSearch] = useState('');

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
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen bg-gray-50/30 dark:bg-gray-900/30 font-[family-name:var(--font-outfit)]">
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

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 shadow-inner">
                            <Network size={24} />
                        </div>
                        My Team Hierarchy
                    </h1>
                    <p className="text-sm font-bold text-gray-500 mt-2">
                        {capabilities.canAssignMembers ? 'Managed subtree structure & team member allocation' : 'Read-only view of your assigned team structure'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search teams..."
                            className="pl-10 pr-4 py-2.5 w-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400 transition-all"
                        />
                    </div>
                    <button
                        onClick={fetchTeamsData}
                        className="w-11 h-11 rounded-2xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all shrink-0"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Lead Allocation Overview — only visible to managers/admins */}
            {capabilities.canAssignMembers && !loading && teams.length > 0 && (
                <LeadAllocationPanel isManager={capabilities.canAssignMembers} />
            )}

            {/* Org Chart View */}
            {loading ? (
                <div className="bg-slate-50/50 border border-slate-200/60 rounded-[2.5rem] h-[550px] flex flex-col items-center justify-center text-slate-500 space-y-4 shadow-inner">
                    <RefreshCw size={36} className="animate-spin text-indigo-500" />
                    <p className="font-bold text-slate-700 text-base tracking-wide">Loading Team View...</p>
                </div>
            ) : teams.length === 0 ? (
                renderNoTeamState()
            ) : (
                <OrgChart
                    teams={teams}
                    onAssignMember={capabilities.canAssignMembers ? setSelectedTeamForAssign : undefined}
                    onRemoveMember={capabilities.canAssignMembers ? handlePromptRemoveMember : undefined}
                    onReassignMember={capabilities.canAssignMembers ? handleReassignMember : undefined}
                    onServiceAreas={capabilities.canAssignMembers ? setSelectedTeamForAreas : undefined}
                    isReadOnly={!capabilities.canAssignMembers}
                />
            )}
        </div>
    );
}
