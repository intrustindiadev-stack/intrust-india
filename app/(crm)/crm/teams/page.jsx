'use client';

import { useState, useEffect, useCallback } from 'react';
import { Network, RefreshCw, Users, MapPin, Shield } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import OrgChart from '@/components/admin/teams/OrgChart';
import MemberAssignDrawer from '@/components/admin/teams/MemberAssignDrawer';

export default function CrmTeamsPage() {
    const { profile } = useAuth();
    const [teams, setTeams] = useState([]);
    const [unassignedUsers, setUnassignedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTeamForAssign, setSelectedTeamForAssign] = useState(null);

    const isAdmin = profile && ['admin', 'super_admin'].includes(profile.role);
    const isManager = profile && ['relationship_manager', 'admin', 'super_admin'].includes(profile.role);
    const hasTeam = !!profile?.team_id;

    const fetchTeamsData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/teams');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load teams');

            let userTeams = data.teams || [];

            if (!isAdmin) {
                // Non-admins only see teams they are a member of or lead
                if (!hasTeam) {
                    // User not assigned to any team — show nothing
                    userTeams = [];
                } else {
                    // Show only their team + direct sub-teams under it
                    userTeams = userTeams.filter(t =>
                        t.id === profile.team_id ||
                        t.parent_team_id === profile.team_id ||
                        t.team_lead_id === profile.id
                    );
                }
            }

            setTeams(userTeams);
            setUnassignedUsers(data.unassigned_users || []);
        } catch (err) {
            console.error('[CRM TEAMS] Fetch error:', err);
            toast.error(err.message || 'Failed to load teams');
        } finally {
            setLoading(false);
        }
    }, [profile, isAdmin, hasTeam]);

    useEffect(() => {
        fetchTeamsData();
    }, [fetchTeamsData]);

    const handleReassignMember = async (userId, targetTeamId) => {
        if (!isManager) {
            toast.error('Only Sales Managers can reassign team members');
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

    const handleRemoveMember = async (userId, teamId) => {
        if (!isManager) {
            toast.error('Only Sales Managers can remove team members');
            return;
        }

        if (!confirm('Remove member from team?')) return;

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

    // Empty state: user has not been assigned to any team yet
    const renderNoTeamState = () => (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-5 shadow-sm">
                <Users size={36} className="text-indigo-300" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-800 mb-2">You&apos;re not in a team yet</h2>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                Your manager or admin hasn&apos;t assigned you to a team. Once you&apos;re added, your team structure will appear here.
            </p>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            {selectedTeamForAssign && (
                <MemberAssignDrawer
                    team={selectedTeamForAssign}
                    availableUsers={unassignedUsers}
                    onClose={() => setSelectedTeamForAssign(null)}
                    onMemberAssigned={() => fetchTeamsData()}
                />
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <Network className="text-indigo-600" size={28} />
                        My Team Hierarchy
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        View team structure, team lead assignments, and member allocation
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchTeamsData}
                        className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={`text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Org Chart View */}
            {loading ? (
                <div className="bg-slate-900 rounded-[2.5rem] h-[550px] flex flex-col items-center justify-center text-slate-400 space-y-3 shadow-2xl">
                    <RefreshCw size={36} className="animate-spin text-indigo-400" />
                    <p className="font-bold text-slate-200 text-base">Loading Team View...</p>
                </div>
            ) : !hasTeam && !isAdmin ? (
                renderNoTeamState()
            ) : (
                <OrgChart
                    teams={teams}
                    onAssignMember={isManager ? setSelectedTeamForAssign : undefined}
                    onRemoveMember={isManager ? handleRemoveMember : undefined}
                    onReassignMember={isManager ? handleReassignMember : undefined}
                    isReadOnly={!isManager}
                />
            )}
        </div>
    );
}
