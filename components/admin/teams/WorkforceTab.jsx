'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Users, Search, Filter, Shield, Crown, MapPin, 
    UserPlus, UserCheck, AlertTriangle, ArrowRightLeft 
} from 'lucide-react';
import Image from 'next/image';

const ROLE_BADGES = {
    relationship_manager: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    relationship_exec: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    admin: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    hr_manager: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
};

export default function WorkforceTab({
    teams = [],
    unassignedUsers = [],
    capabilities = {},
    onSelectTeam,
    onAssignMember,
    onRemoveMember
}) {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [assignmentFilter, setAssignmentFilter] = useState(''); // 'assigned' | 'unassigned'

    // Flatten all assigned members across active teams
    const assignedMembers = [];
    const memberSet = new Set();

    teams.forEach(team => {
        if (team.team_lead) {
            if (!memberSet.has(team.team_lead.id)) {
                memberSet.add(team.team_lead.id);
                assignedMembers.push({
                    user: team.team_lead,
                    team,
                    isLead: true
                });
            }
        }
        (team.members || []).forEach(m => {
            if (m.user && !memberSet.has(m.user.id)) {
                memberSet.add(m.user.id);
                assignedMembers.push({
                    user: m.user,
                    team,
                    isLead: team.team_lead_id === m.user.id
                });
            }
        });
    });

    // Unassigned users
    const unassignedList = unassignedUsers
        .filter(u => !memberSet.has(u.id))
        .map(u => ({
            user: u,
            team: null,
            isLead: false
        }));

    const allStaff = [...assignedMembers, ...unassignedList];

    // Filter staff
    const filteredStaff = allStaff.filter(({ user, team }) => {
        const matchesSearch = !search || 
            (user.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(search.toLowerCase()) ||
            (team?.name || '').toLowerCase().includes(search.toLowerCase());

        const matchesRole = !roleFilter || user.role === roleFilter;

        const matchesAssignment = !assignmentFilter ||
            (assignmentFilter === 'assigned' && team !== null) ||
            (assignmentFilter === 'unassigned' && team === null);

        return matchesSearch && matchesRole && matchesAssignment;
    });

    return (
        <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative flex-1 w-full pl-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search workforce by name, email, or team..."
                        className="w-full pl-10 pr-4 py-2 bg-transparent text-sm font-medium text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-500"
                    />
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto pr-2">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="appearance-none px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        <option value="">All Roles</option>
                        <option value="relationship_manager">Relationship Manager</option>
                        <option value="relationship_exec">Relationship Exec</option>
                        <option value="employee">Employee</option>
                        <option value="hr_manager">HR Manager</option>
                        <option value="admin">Admin</option>
                    </select>

                    <select
                        value={assignmentFilter}
                        onChange={(e) => setAssignmentFilter(e.target.value)}
                        className="appearance-none px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        <option value="">All Staff</option>
                        <option value="assigned">Assigned ({assignedMembers.length})</option>
                        <option value="unassigned">Unassigned ({unassignedList.length})</option>
                    </select>
                </div>
            </div>

            {/* Workforce Table */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[900px]">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wider text-gray-500 font-bold">
                            <tr>
                                <th className="px-6 py-4">Employee / Staff</th>
                                <th className="px-6 py-4">System Role</th>
                                <th className="px-6 py-4">Assigned Organization Unit</th>
                                <th className="px-6 py-4">Leadership Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-gray-400">
                                        <Users size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                        <p className="font-semibold text-sm text-gray-600 dark:text-gray-300">No staff members found</p>
                                        <p className="text-xs text-gray-500 mt-1">Try adjusting search or role filters.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredStaff.map(({ user, team, isLead }) => {
                                    const badgeClass = ROLE_BADGES[user.role] || ROLE_BADGES.default;

                                    return (
                                        <tr 
                                            key={user.id} 
                                            className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!team ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                                                        {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                                            {user.full_name || 'Unnamed Employee'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {user.email || 'No email registered'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}>
                                                    {user.role?.replace(/_/g, ' ') || 'User'}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                {team ? (
                                                    <button
                                                        onClick={() => onSelectTeam?.(team)}
                                                        className="group flex items-center gap-2 hover:underline text-left"
                                                    >
                                                        <span 
                                                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                                                            style={{ backgroundColor: team.color || '#6366f1' }}
                                                        />
                                                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-200 group-hover:text-indigo-600">
                                                            {team.name}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 font-semibold uppercase">
                                                            ({team.region_level})
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                                                        <AlertTriangle size={12} /> Unassigned
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                {isLead ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                                                        <Crown size={12} /> Unit Lead
                                                    </span>
                                                ) : team ? (
                                                    <span className="text-xs font-medium text-gray-500">Member</span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                {team ? (
                                                    capabilities.canAssignMembers && !isLead && (
                                                        <button
                                                            onClick={() => onRemoveMember?.(user.id, team.id)}
                                                            className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-xs font-medium transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    )
                                                ) : (
                                                    capabilities.canAssignMembers && (
                                                        <button
                                                            onClick={() => onAssignMember?.(null, user)}
                                                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors flex items-center justify-end gap-1.5 ml-auto"
                                                        >
                                                            <UserPlus size={14} /> Assign Unit
                                                        </button>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
