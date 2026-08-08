'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
    ArrowLeft, 
    Users, 
    Network, 
    MapPin, 
    Mail, 
    Phone, 
    Shield, 
    Clock, 
    LayoutGrid, 
    User,
    ChevronRight,
    Map
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function TeamDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { id: teamId } = params;

    const [team, setTeam] = useState(null);
    const [subTeams, setSubTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTeamData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch main team details with lead and members
            const { data: teamData, error: teamError } = await supabase
                .from('teams')
                .select(`
                    *,
                    team_lead:user_profiles!teams_team_lead_id_fkey(id, full_name, email, role, avatar_url, phone),
                    members:team_members(
                        id,
                        joined_at,
                        user:user_profiles(id, full_name, email, role, avatar_url, phone)
                    ),
                    parent:teams!parent_team_id(id, name)
                `)
                .eq('id', teamId)
                .single();

            if (teamError) throw teamError;

            // Fetch sub-teams
            const { data: childrenData, error: childrenError } = await supabase
                .from('teams')
                .select('id, name, members_count')
                .eq('parent_team_id', teamId);
                
            if (childrenError) console.error("Error fetching subteams:", childrenError);

            setTeam(teamData);
            setSubTeams(childrenData || []);
        } catch (error) {
            console.error('Error fetching team:', error);
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    useEffect(() => {
        if (teamId) fetchTeamData();
    }, [fetchTeamData, teamId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Loading team details...</p>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-800">Team not found</h2>
                <button onClick={() => router.back()} className="mt-4 text-indigo-600 hover:underline">
                    Go back
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
            {/* Header / Breadcrumb navigation */}
            <div className="flex items-center gap-4 mb-2">
                <button 
                    onClick={() => router.back()} 
                    className="p-2.5 rounded-2xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <LayoutGrid size={20} />
                        </div>
                        {team.name}
                    </h1>
                    {team.parent && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-sm font-medium text-gray-500">
                            <span>Part of</span>
                            <Link href={`/hrm/teams/${team.parent.id}`} className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center">
                                {team.parent.name}
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Team Overview & Lead Info */}
                <div className="space-y-6 lg:col-span-1">
                    
                    {/* Team Info Card */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Map className="text-indigo-500" size={20} />
                            Team Overview
                        </h2>
                        <div className="space-y-4">
                            {team.description && (
                                <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-4 rounded-2xl">
                                    {team.description}
                                </p>
                            )}
                            
                            <div className="space-y-3 pt-2">
                                {(team.region_level || team.city || team.state) && (
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                            <MapPin size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Region / Area</p>
                                            <p className="font-medium text-gray-900">
                                                {[team.city, team.state].filter(Boolean).join(', ') || 'N/A'}
                                            </p>
                                            {team.region_level && (
                                                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 uppercase">
                                                    {team.region_level.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                        <Users size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Members</p>
                                        <p className="font-medium text-gray-900">
                                            {team.members?.length || 0} Members
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Team Lead Card */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Shield className="text-amber-500" size={20} />
                            Team Leader
                        </h2>
                        {team.team_lead ? (
                            <Link 
                                href={`/hrm/employees/${team.team_lead.id}`}
                                className="flex flex-col items-center text-center p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors group cursor-pointer border border-transparent hover:border-gray-200"
                            >
                                <div className="relative mb-3">
                                    <div className="w-16 h-16 rounded-full bg-white p-1 shadow-sm overflow-hidden">
                                        {team.team_lead.avatar_url ? (
                                            <img src={team.team_lead.avatar_url} alt={team.team_lead.full_name} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl">
                                                {team.team_lead.full_name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center border-2 border-white">
                                        <Shield size={10} />
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{team.team_lead.full_name}</h3>
                                <p className="text-xs font-medium text-gray-500 mb-2 capitalize">{team.team_lead.role.replace(/_/g, ' ')}</p>
                                
                                <div className="flex flex-col gap-1 w-full mt-2 pt-3 border-t border-gray-200/60 text-xs">
                                    {team.team_lead.email && (
                                        <div className="flex items-center gap-2 text-gray-600 justify-center">
                                            <Mail size={12} />
                                            <span className="truncate">{team.team_lead.email}</span>
                                        </div>
                                    )}
                                    {team.team_lead.phone && (
                                        <div className="flex items-center gap-2 text-gray-600 justify-center">
                                            <Phone size={12} />
                                            <span>{team.team_lead.phone}</span>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ) : (
                            <div className="bg-gray-50 rounded-2xl p-6 text-center border border-dashed border-gray-200">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
                                    <User size={20} />
                                </div>
                                <p className="text-sm font-medium text-gray-500">No team leader assigned</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Sub-teams and Members List */}
                <div className="space-y-6 lg:col-span-2">
                    
                    {/* Sub-teams Section */}
                    {subTeams.length > 0 && (
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Network className="text-indigo-500" size={20} />
                                Sub-Teams
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {subTeams.map(sub => (
                                    <Link
                                        key={sub.id}
                                        href={`/hrm/teams/${sub.id}`}
                                        className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all active:scale-[0.98] group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 flex items-center justify-center shadow-sm">
                                                <LayoutGrid size={16} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{sub.name}</h3>
                                                <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                                    <Users size={12} />
                                                    {sub.members_count || 0} members
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Members List */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Users className="text-indigo-500" size={20} />
                                Team Members
                            </h2>
                            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                                {team.members?.length || 0}
                            </span>
                        </div>
                        
                        <div className="space-y-3">
                            {team.members && team.members.length > 0 ? (
                                team.members.map((member) => (
                                    <Link
                                        key={member.id}
                                        href={`/hrm/employees/${member.user.id}`}
                                        className="flex items-center justify-between p-3 sm:p-4 rounded-2xl border border-transparent hover:border-gray-200 hover:shadow-sm hover:bg-gray-50/50 transition-all active:scale-[0.99] group bg-white"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-indigo-50 overflow-hidden shrink-0 border border-indigo-100">
                                                {member.user.avatar_url ? (
                                                    <img src={member.user.avatar_url} alt={member.user.full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-bold text-indigo-600">
                                                        {member.user.full_name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                    {member.user.full_name}
                                                </h3>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 uppercase">
                                                        {member.user.role.replace(/_/g, ' ')}
                                                    </span>
                                                    {member.user.email && (
                                                        <span className="text-xs text-gray-500 hidden sm:flex items-center gap-1">
                                                            <Mail size={10} />
                                                            {member.user.email}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3 text-gray-400">
                                        <Users size={20} />
                                    </div>
                                    <p className="text-gray-500 font-medium">No members found in this team.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
