'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Layers, Users, MapPin, Shield, AlertTriangle, 
    ArrowRight, Crown, BarChart2, Building2, CheckCircle2, ChevronRight, ArrowRightLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function OverviewTab({
    teams = [],
    unassignedUsers = [],
    capabilities = {},
    onSelectTeam,
    onNavigateTab,
    onAssignMember,
    onShowCreate
}) {
    const activeTeams = teams.filter(t => t.is_active !== false);
    const totalMembers = activeTeams.reduce((acc, t) => acc + (t.members?.length || 0), 0);
    const totalCities = new Set(activeTeams.map(t => t.city).filter(Boolean)).size;

    // Attention items
    const teamsWithoutLeads = activeTeams.filter(t => !t.team_lead_id);
    const hasUnassignedStaff = unassignedUsers.length > 0;

    const [pendingAllocation, setPendingAllocation] = useState(0);
    const [reallocating, setReallocating] = useState(false);

    useEffect(() => {
        if (capabilities.canAssignMembers) {
            fetch('/api/crm/territory/metrics')
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data?.unmatched) setPendingAllocation(data.unmatched);
                })
                .catch(() => {});
        }
    }, [capabilities.canAssignMembers]);

    const handleReallocate = async () => {
        setReallocating(true);
        try {
            const res = await fetch('/api/crm/leads/reroute', { method: 'POST' });
            if (res.ok) {
                toast.success('Reallocation initiated');
                setPendingAllocation(0);
            } else {
                toast.error('Reallocation failed');
            }
        } catch {
            toast.error('Reallocation failed');
        } finally {
            setReallocating(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div 
                    onClick={() => onNavigateTab?.('teams')}
                    className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
                >
                    <div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Units</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{activeTeams.length}</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        <Layers size={20} />
                    </div>
                </div>

                <div 
                    onClick={() => onNavigateTab?.('workforce')}
                    className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
                >
                    <div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned Staff</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalMembers}</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <Users size={20} />
                    </div>
                </div>

                <div 
                    onClick={() => onNavigateTab?.('unassigned')}
                    className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between relative"
                >
                    <div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Unassigned</div>
                        <div className={`text-2xl font-bold mt-1 ${hasUnassignedStaff ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>{unassignedUsers.length}</div>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasUnassignedStaff ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                        <Shield size={20} />
                        {hasUnassignedStaff && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                    </div>
                </div>

                <div 
                    onClick={() => onNavigateTab?.('territories')}
                    className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
                >
                    <div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Cities Covered</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalCities || 1}</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                        <MapPin size={20} />
                    </div>
                </div>
            </div>

            {/* Attention Required Items */}
            {(teamsWithoutLeads.length > 0 || hasUnassignedStaff || pendingAllocation > 0) && (
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-500" /> Attention Required
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {hasUnassignedStaff && (
                            <div className="bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                                <div className="mb-4">
                                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                        {unassignedUsers.length} Unassigned Employees
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Staff waiting to be assigned to an organization unit.
                                    </p>
                                </div>
                                <button
                                    onClick={() => onNavigateTab?.('unassigned')}
                                    className="w-full px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium text-sm transition-colors border border-gray-200 dark:border-gray-600 text-center"
                                >
                                    Assign Employees
                                </button>
                            </div>
                        )}

                        {teamsWithoutLeads.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                                <div className="mb-4">
                                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                                        {teamsWithoutLeads.length} Team(s) Missing Lead
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                        {teamsWithoutLeads.map(t => t.name).join(', ')} require lead assignment.
                                    </p>
                                </div>
                                <button
                                    onClick={() => onSelectTeam?.(teamsWithoutLeads[0])}
                                    className="w-full px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium text-sm transition-colors border border-gray-200 dark:border-gray-600 text-center"
                                >
                                    Assign Team Lead
                                </button>
                            </div>
                        )}

                        {pendingAllocation > 0 && capabilities.canAssignMembers && (
                            <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                                <div className="mb-4">
                                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        {pendingAllocation} Pending Lead Allocations
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Leads are unmatched and require re-routing.
                                    </p>
                                </div>
                                <button
                                    onClick={handleReallocate}
                                    disabled={reallocating}
                                    className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm transition-colors text-center flex items-center justify-center gap-2"
                                >
                                    <ArrowRightLeft size={16} />
                                    {reallocating ? 'Processing...' : 'Reallocate Pending'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Organization Unit Cards Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Building2 className="text-indigo-600" size={20} /> Active Organization Units ({activeTeams.length})
                    </h3>

                    {capabilities.canCreateTeam && (
                        <button
                            onClick={onShowCreate}
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium flex items-center gap-1 hover:underline"
                        >
                            + Create Unit
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activeTeams.map(team => (
                        <div
                            key={team.id}
                            onClick={() => onSelectTeam?.(team)}
                            className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-4 flex flex-col justify-between group"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span 
                                        className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
                                        style={{ backgroundColor: team.color || '#6366f1' }}
                                    >
                                        {team.region_level}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                        <Users size={12} /> {team.members?.length || 0} members
                                    </span>
                                </div>

                                <div>
                                    <h4 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-1">
                                        {team.name}
                                    </h4>
                                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5 line-clamp-1">
                                        <MapPin size={14} className="shrink-0" />
                                        {[team.area, team.city, team.state].filter(Boolean).join(', ') || 'Statewide'}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Crown size={14} className="text-amber-500 shrink-0" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                                        {team.team_lead?.full_name || 'No Lead'}
                                    </span>
                                </div>

                                <ChevronRight size={16} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
