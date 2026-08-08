'use client';

import { useState, useEffect, useCallback } from 'react';
import { Network, RefreshCw, Users, Search } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import OrgChart from '@/components/admin/teams/OrgChart';

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
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <Network className="text-indigo-600" size={28} />
                        Organization Structure
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Read-only view of the organization structure
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Filter teams..."
                            className="pl-9 pr-3 py-2 rounded-2xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <button
                        onClick={fetchTeamsData}
                        className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                        title="Refresh"
                        aria-label="Refresh team view"
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
            ) : teams.length === 0 ? (
                renderNoTeamState()
            ) : (
                <OrgChart
                    teams={teams}
                    isReadOnly={true}
                />
            )}
        </div>
    );
}
