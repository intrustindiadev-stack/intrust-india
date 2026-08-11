'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Network, Plus, RefreshCw, Users, Shield, MapPin, Layers, 
    LayoutGrid, List, Search, Filter, ArrowRightLeft, AlertTriangle, 
    Building2, CheckCircle2, UserCheck 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Tabs & Views
import OverviewTab from './OverviewTab';
import ResponsiveOrgTree from './ResponsiveOrgTree';
import TeamsTab from './TeamsTab';
import WorkforceTab from './WorkforceTab';
import TerritoriesTab from './TerritoriesTab';
import UnassignedTab from './UnassignedTab';

// Drawers & Modals
import TeamDetailsDrawer from './TeamDetailsDrawer';
import TeamCreateDrawer from './TeamCreateDrawer';
import TeamEditDrawer from './TeamEditDrawer';
import MemberAssignDrawer from './MemberAssignDrawer';
import BulkTransferDrawer from './BulkTransferDrawer';
import ServiceAreaDrawer from './ServiceAreaDrawer';
import ConfirmModal from './ConfirmModal';

export default function OrganizationShell() {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'structure' | 'teams' | 'workforce' | 'territories' | 'unassigned'

    const [teams, setTeams] = useState([]);
    const [unassignedUsers, setUnassignedUsers] = useState([]);
    const [capabilities, setCapabilities] = useState({});
    const [loading, setLoading] = useState(true);

    // Selected Team for Details Drawer
    const [selectedTeamForDetails, setSelectedTeamForDetails] = useState(null);

    // Drawers & Modals state
    const [showCreate, setShowCreate] = useState(false);
    const [showBulkTransfer, setShowBulkTransfer] = useState(false);
    const [selectedTeamForEdit, setSelectedTeamForEdit] = useState(null);
    const [selectedTeamForAssign, setSelectedTeamForAssign] = useState(null);
    const [selectedUserForAssign, setSelectedUserForAssign] = useState(null);
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
            const res = await fetch(`/api/teams?limit=100&is_active=true`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load organization data');

            setTeams(data.teams || []);
            setUnassignedUsers(data.unassigned_users || []);
            setCapabilities(data.capabilities || {});
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

            toast.success('Member removed cleanly');
            fetchTeamsData();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setRemoveModalState({ isOpen: false, userId: null, teamId: null, memberName: '', loading: false });
        }
    };

    // Trigger assign member drawer for a team or preselected unassigned user
    const handleTriggerAssign = (team, user = null) => {
        if (team) {
            setSelectedTeamForAssign(team);
        } else if (teams.length > 0) {
            setSelectedTeamForAssign(teams[0]);
        }
        setSelectedUserForAssign(user);
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutGrid },
        { id: 'structure', label: 'Organization Structure', icon: Network },
        { id: 'teams', label: 'Teams', icon: Layers },
        { id: 'workforce', label: 'Workforce', icon: Users },
        { id: 'territories', label: 'Territories', icon: MapPin },
        { id: 'unassigned', label: 'Unassigned', icon: Shield, badge: unassignedUsers.length }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-[family-name:var(--font-outfit)]">
            <div className="max-w-[1600px] mx-auto bg-white dark:bg-gray-900 min-h-screen border-x border-gray-200 dark:border-gray-800">
                {/* Drawers and Modals */}
                <AnimatePresence>
                    {selectedTeamForDetails && (
                        <TeamDetailsDrawer
                            team={selectedTeamForDetails}
                            allTeams={teams}
                            capabilities={capabilities}
                            onClose={() => setSelectedTeamForDetails(null)}
                            onEditTeam={(t) => setSelectedTeamForEdit(t)}
                            onAssignMember={(t) => setSelectedTeamForAssign(t)}
                            onRemoveMember={handlePromptRemoveMember}
                            onBulkTransfer={() => setShowBulkTransfer(true)}
                            onManageServiceAreas={(t) => setSelectedTeamForServiceArea(t)}
                        />
                    )}
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
                            preselectedUser={selectedUserForAssign}
                            onClose={() => { setSelectedTeamForAssign(null); setSelectedUserForAssign(null); }}
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

                {/* Workspace Header */}
                <div className="bg-white dark:bg-gray-900 px-6 py-6 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Organization Management
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Manage teams, workforce, territories and CRM ownership.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={fetchTeamsData}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Refresh Workspace Data"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>

                        {capabilities.canAssignMembers && (
                            <button
                                onClick={() => setShowBulkTransfer(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <ArrowRightLeft size={16} /> Bulk Transfer
                            </button>
                        )}

                        {capabilities.canCreateTeam && (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                                <Plus size={16} /> Create Unit
                            </button>
                        )}
                    </div>
                </div>

                {/* Primary Navigation Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-800 px-6 overflow-x-auto hide-scrollbar">
                    <div className="flex items-center gap-6">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                        isActive 
                                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'
                                    }`}
                                >
                                    <Icon size={16} />
                                    <span>{tab.label}</span>
                                    {tab.badge > 0 && (
                                        <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content Render */}
                <div className="min-h-[600px] p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center text-gray-400 space-y-4 h-[400px]">
                            <RefreshCw size={36} className="animate-spin text-indigo-400" />
                            <p className="font-medium text-sm tracking-wide">Loading Organization Workspace...</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {activeTab === 'overview' && (
                                    <OverviewTab
                                        teams={teams}
                                        unassignedUsers={unassignedUsers}
                                        capabilities={capabilities}
                                        onSelectTeam={setSelectedTeamForDetails}
                                        onNavigateTab={setActiveTab}
                                        onAssignMember={handleTriggerAssign}
                                        onShowCreate={() => setShowCreate(true)}
                                    />
                                )}

                                {activeTab === 'structure' && (
                                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                                        <ResponsiveOrgTree
                                            teams={teams}
                                            onEditTeam={setSelectedTeamForDetails}
                                            onAssignMember={capabilities.canAssignMembers ? setSelectedTeamForAssign : undefined}
                                            onRemoveMember={capabilities.canAssignMembers ? handlePromptRemoveMember : undefined}
                                            onReassignMember={capabilities.canAssignMembers ? handleReassignMember : undefined}
                                            onServiceAreas={capabilities.canEditTeam ? setSelectedTeamForServiceArea : undefined}
                                            isReadOnly={!capabilities.canAssignMembers}
                                        />
                                    </div>
                                )}

                                {activeTab === 'teams' && (
                                    <TeamsTab
                                        teams={teams}
                                        capabilities={capabilities}
                                        onSelectTeam={setSelectedTeamForDetails}
                                        onEditTeam={setSelectedTeamForEdit}
                                        onAssignMember={handleTriggerAssign}
                                        onManageServiceAreas={setSelectedTeamForServiceArea}
                                    />
                                )}

                                {activeTab === 'workforce' && (
                                    <WorkforceTab
                                        teams={teams}
                                        unassignedUsers={unassignedUsers}
                                        capabilities={capabilities}
                                        onSelectTeam={setSelectedTeamForDetails}
                                        onAssignMember={handleTriggerAssign}
                                        onRemoveMember={handlePromptRemoveMember}
                                    />
                                )}

                                {activeTab === 'territories' && (
                                    <TerritoriesTab
                                        teams={teams}
                                        onSelectTeam={setSelectedTeamForDetails}
                                        onManageServiceAreas={setSelectedTeamForServiceArea}
                                    />
                                )}

                                {activeTab === 'unassigned' && (
                                    <UnassignedTab
                                        unassignedUsers={unassignedUsers}
                                        teams={teams}
                                        capabilities={capabilities}
                                        onAssignMember={handleTriggerAssign}
                                        onSuccess={fetchTeamsData}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
}
