'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Layers, MapPin, Crown, Users, Building2, ChevronRight, Edit3 } from 'lucide-react';

export default function TeamsTab({
    teams = [],
    capabilities = {},
    onSelectTeam,
    onEditTeam,
    onAssignMember,
    onManageServiceAreas
}) {
    const [search, setSearch] = useState('');
    const [regionFilter, setRegionFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('true');

    const filteredTeams = teams.filter(t => {
        const matchesSearch = !search ||
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            (t.city || '').toLowerCase().includes(search.toLowerCase()) ||
            (t.team_lead?.full_name || '').toLowerCase().includes(search.toLowerCase());

        const matchesRegion = !regionFilter || t.region_level === regionFilter;
        const matchesActive = activeFilter === '' || String(t.is_active !== false) === activeFilter;

        return matchesSearch && matchesRegion && matchesActive;
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
                        placeholder="Search units by name, lead, or region..."
                        className="w-full pl-10 pr-4 py-2 bg-transparent text-sm font-medium text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-500"
                    />
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto pr-2">
                    <select
                        value={regionFilter}
                        onChange={(e) => setRegionFilter(e.target.value)}
                        className="appearance-none px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        <option value="">All Region Levels</option>
                        <option value="state">State Level</option>
                        <option value="city">City Level</option>
                        <option value="area">Area Level</option>
                    </select>

                    <select
                        value={activeFilter}
                        onChange={(e) => setActiveFilter(e.target.value)}
                        className="appearance-none px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        <option value="true">Active Only</option>
                        <option value="false">Inactive Only</option>
                        <option value="">All Units</option>
                    </select>
                </div>
            </div>

            {/* Teams Table */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[900px]">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wider text-gray-500 font-bold">
                            <tr>
                                <th className="px-6 py-4">Organization Unit</th>
                                <th className="px-6 py-4">Level</th>
                                <th className="px-6 py-4">Territory Location</th>
                                <th className="px-6 py-4">Unit Lead</th>
                                <th className="px-6 py-4">Members</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredTeams.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-400">
                                        <Layers size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                        <p className="font-semibold text-sm text-gray-600 dark:text-gray-300">No units matching filters</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredTeams.map(t => (
                                    <tr 
                                        key={t.id} 
                                        onClick={() => onSelectTeam?.(t)}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                                            <div className="flex items-center gap-3">
                                                <span 
                                                    className="w-2.5 h-2.5 rounded-full" 
                                                    style={{ backgroundColor: t.color || '#6366f1' }} 
                                                />
                                                <span className="group-hover:text-indigo-600 transition-colors">
                                                    {t.name}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                                {t.region_level}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={14} className="text-gray-400 shrink-0" />
                                                {[t.area, t.city, t.state].filter(Boolean).join(', ') || 'Statewide'}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-200">
                                            <div className="flex items-center gap-1.5">
                                                <Crown size={14} className="text-gray-400 shrink-0" />
                                                <span>{t.team_lead?.full_name || <span className="text-gray-400 font-medium">Unassigned</span>}</span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {t.members?.length || 0} staff
                                        </td>

                                        <td className="px-6 py-4 text-right space-x-2" onClick={e => e.stopPropagation()}>
                                            {capabilities.canAssignMembers && (
                                                <button
                                                    onClick={() => onAssignMember?.(t)}
                                                    className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium text-xs hover:bg-indigo-100 transition-colors"
                                                >
                                                    + Member
                                                </button>
                                            )}
                                            {capabilities.canEditTeam && (
                                                <button
                                                    onClick={() => onManageServiceAreas?.(t)}
                                                    className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium text-xs hover:bg-emerald-100 transition-colors"
                                                >
                                                    Zones
                                                </button>
                                            )}
                                            {capabilities.canEditTeam && (
                                                <button
                                                    onClick={() => onEditTeam?.(t)}
                                                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
