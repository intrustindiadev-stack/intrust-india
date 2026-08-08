'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Building2, CheckCircle2, AlertTriangle, Layers, ArrowRight, ShieldAlert } from 'lucide-react';

export default function TerritoriesTab({
    teams = [],
    onSelectTeam,
    onManageServiceAreas
}) {
    const [allServiceAreas, setAllServiceAreas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllCoverage = async () => {
            setLoading(true);
            try {
                // Fetch service areas for all active teams
                const activeTeams = teams.filter(t => t.is_active !== false);
                const areaPromises = activeTeams.map(async (t) => {
                    const res = await fetch(`/api/teams/${t.id}/service-areas`);
                    if (res.ok) {
                        const data = await res.json();
                        return (data || []).map(sa => ({ ...sa, team: t }));
                    }
                    return [];
                });

                const results = await Promise.all(areaPromises);
                setAllServiceAreas(results.flat());
            } catch (e) {
                console.error('Failed to load coverage zones:', e);
            } finally {
                setLoading(false);
            }
        };

        if (teams.length > 0) fetchAllCoverage();
    }, [teams]);

    // Group service areas by type (State, City, Zone/Area, Pincode)
    const stateAreas = allServiceAreas.filter(a => a.area_type === 'state');
    const cityAreas = allServiceAreas.filter(a => a.area_type === 'city');
    const zoneAreas = allServiceAreas.filter(a => a.area_type === 'zone' || a.area_type === 'area');
    const pincodeAreas = allServiceAreas.filter(a => a.area_type === 'pincode');

    return (
        <div className="space-y-6">
            {/* KPI Cards for Coverage */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">States Covered</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {new Set(stateAreas.map(a => a.value.toLowerCase())).size || 1}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Cities Covered</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {new Set([...cityAreas.map(a => a.value.toLowerCase()), ...teams.map(t => t.city?.toLowerCase()).filter(Boolean)]).size || 1}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Zones & Areas</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {zoneAreas.length}
                    </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800/50 shadow-sm flex flex-col justify-center">
                    <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">Exclusive Pincodes</div>
                    <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                        {pincodeAreas.length}
                    </div>
                </div>
            </div>

            {/* Main Coverage Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Team Territory Assignments */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-wider uppercase flex items-center gap-2">
                        <MapPin className="text-gray-500" size={16} /> Active Coverage Zones
                    </h3>

                    {loading ? (
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center text-gray-400 border border-gray-200 dark:border-gray-800">
                            Loading coverage map data...
                        </div>
                    ) : teams.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center text-gray-400 border border-gray-200 dark:border-gray-800">
                            No teams available.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {teams.map(team => {
                                const teamAreas = allServiceAreas.filter(a => a.team_id === team.id);

                                return (
                                    <div key={team.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span 
                                                    className="w-2.5 h-2.5 rounded-full" 
                                                    style={{ backgroundColor: team.color || '#6366f1' }} 
                                                />
                                                <div>
                                                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                                                        {team.name}
                                                    </h4>
                                                    <p className="text-xs text-gray-500">
                                                        {[team.area, team.city, team.state].filter(Boolean).join(', ') || 'Statewide'}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => onManageServiceAreas?.(team)}
                                                className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-100 transition-colors"
                                            >
                                                Configure Zones ({teamAreas.length})
                                            </button>
                                        </div>

                                        {/* Active Zones Badges */}
                                        {teamAreas.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic">No granular service areas defined.</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {teamAreas.map(area => (
                                                    <span key={area.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                                        <span className="uppercase text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-1 rounded">
                                                            {area.area_type}
                                                        </span>
                                                        {area.value} {area.city ? `(${area.city})` : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Lead Routing Engine Summary */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-wider uppercase flex items-center gap-2">
                        <Building2 className="text-gray-500" size={16} /> Auto-Routing Engine
                    </h3>

                    <div className="bg-gray-900 dark:bg-gray-950 text-white rounded-xl p-6 shadow-sm border border-gray-800 space-y-4">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                                Match Priority Order
                            </span>
                            <h4 className="text-base font-bold text-white">Lead Location Resolution</h4>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-between">
                                <span className="font-semibold text-gray-200">1. Exclusive Pincode Match</span>
                                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded uppercase">Highest</span>
                            </div>
                            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-between">
                                <span className="font-semibold text-gray-200">2. Zone / Area Match</span>
                                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded uppercase">High</span>
                            </div>
                            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-between">
                                <span className="font-semibold text-gray-200">3. City Level Match</span>
                                <span className="text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-600 px-2 py-0.5 rounded uppercase">Medium</span>
                            </div>
                            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-between">
                                <span className="font-semibold text-gray-200">4. State Level Match</span>
                                <span className="text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-600 px-2 py-0.5 rounded uppercase">Fallback</span>
                            </div>
                        </div>

                        <p className="text-xs text-gray-400 leading-relaxed pt-2 border-t border-gray-800">
                            When a lead is captured, PostgreSQL trigger <code className="text-indigo-400 bg-gray-800 px-1 py-0.5 rounded">crm_route_lead_territory</code> automatically assigns it to the territory owner team.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
