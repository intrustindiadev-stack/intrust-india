'use client';

import { useState, useEffect, useCallback } from 'react';
import { Network, RefreshCw, Users, Search } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import TeamHierarchyList from '@/components/hrm/teams/TeamHierarchyList';

export default function HrmTeamsPage() {
    const { profile } = useAuth();
    const [teams, setTeams] = useState([]);
    const [capabilities, setCapabilities] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchTeamsData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);

            const res = await fetch(`/api/teams?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load teams');

            setTeams(data.teams || []);
            setCapabilities(data.capabilities || {});
        } catch (err) {
            console.error('[HRM TEAMS] Fetch error:', err);
            toast.error(err.message || 'Failed to load team hierarchy');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchTeamsData();
    }, [fetchTeamsData]);

    const renderNoTeamState = () => (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-5 shadow-sm">
                <Users size={36} className="text-indigo-300" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-800 mb-2">No Teams Found</h2>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                There are no active teams to display in the hierarchy.
            </p>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen bg-gray-50/30 dark:bg-gray-900/30 font-[family-name:var(--font-outfit)]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 shadow-inner">
                            <Network size={24} />
                        </div>
                        Team Hierarchy
                    </h1>
                    <p className="text-sm font-bold text-gray-500 mt-2">
                        Read-only view of the organization's team structure
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

            {/* Org Chart View */}
            {loading ? (
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 h-[550px] flex flex-col items-center justify-center text-gray-500 space-y-4 shadow-sm">
                    <RefreshCw size={36} className="animate-spin text-indigo-500" />
                    <p className="font-bold text-gray-900 dark:text-white text-base">Loading Team View...</p>
                </div>
            ) : teams.length === 0 ? (
                renderNoTeamState()
            ) : (
                <TeamHierarchyList
                    teams={teams}
                />
            )}
        </div>
    );
}
