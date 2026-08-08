'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, MapPin, Shield, Users, UserMinus, Settings, Edit, UserPlus, MoreVertical, Building2 } from 'lucide-react';
import Image from 'next/image';

const ROLE_BADGE = {
    relationship_manager: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    relationship_exec: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    admin: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
};

const formatRole = (role) => {
    if (!role) return 'Unknown';
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

// Custom Dropdown Hook to manage outside clicks
function useDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return { isOpen, setIsOpen, dropdownRef };
}

function TeamActionsDropdown({ team, onEditTeam, onAssignMember, onServiceAreas }) {
    const { isOpen, setIsOpen, dropdownRef } = useDropdown();

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-500 transition-colors shadow-sm"
            >
                <MoreVertical size={18} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/40 dark:shadow-black/40 border border-gray-100 dark:border-gray-700/50 overflow-hidden z-50 backdrop-blur-xl"
                    >
                        <div className="p-2 space-y-1">
                            <button
                                onClick={() => { setIsOpen(false); onAssignMember && onAssignMember(team); }}
                                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center gap-3 transition-colors"
                            >
                                <UserPlus size={16} /> Add Member
                            </button>
                            <button
                                onClick={() => { setIsOpen(false); onEditTeam && onEditTeam(team); }}
                                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                            >
                                <Edit size={16} className="text-gray-400" /> Edit Organization
                            </button>
                            <button
                                onClick={() => { setIsOpen(false); onServiceAreas && onServiceAreas(team); }}
                                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                            >
                                <Building2 size={16} className="text-gray-400" /> Service Areas
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


export default function TeamGrid({
    teams = [],
    onEditTeam,
    onAssignMember,
    onRemoveMember,
    onReassignMember,
    onServiceAreas,
    isReadOnly = false
}) {
    if (!teams || teams.length === 0) return null;

    const renderUserCard = (user, team, isLead = false) => {
        const badgeClass = ROLE_BADGE[user.role] || ROLE_BADGE.default;

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={user.id}
                className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-xl shadow-gray-200/20 dark:shadow-black/20 hover:shadow-2xl hover:shadow-gray-200/40 transition-all duration-300 hover:-translate-y-1 relative group"
            >
                {isLead && (
                    <div className="absolute top-0 right-6 -mt-3 bg-amber-400 text-amber-900 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md flex items-center gap-1 border border-amber-300">
                        <Shield size={10} /> Team Lead
                    </div>
                )}
                
                {!isReadOnly && !isLead && (
                    <div className="absolute top-4 right-4 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => onRemoveMember && onRemoveMember(user.id, team.id)}
                            className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
                            title="Remove Member"
                        >
                            <UserMinus size={16} />
                        </button>
                    </div>
                )}

                <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner overflow-hidden ${isLead ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                            {user.avatar_url ? (
                                <Image src={user.avatar_url} alt={user.full_name} fill className="object-cover" />
                            ) : (
                                (user.full_name || user.email || '?').charAt(0).toUpperCase()
                            )}
                        </div>
                    </div>

                    <h3 className="text-lg font-black text-gray-900 dark:text-white truncate w-full">
                        {user.full_name || 'Unnamed User'}
                    </h3>
                    
                    <span className={`mt-2 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${badgeClass}`}>
                        {formatRole(user.role)}
                    </span>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-700/50 space-y-3">
                    {user.email && (
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                            <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0">
                                <Mail size={14} className="text-gray-400" />
                            </div>
                            <span className="truncate">{user.email}</span>
                        </div>
                    )}
                    {user.phone && (
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                            <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0">
                                <Phone size={14} className="text-gray-400" />
                            </div>
                            <span className="truncate">{user.phone}</span>
                        </div>
                    )}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="space-y-12">
            {teams.map((team) => (
                <div key={team.id} className="space-y-6">
                    {/* Team Header - Mobile Responsive */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-visible z-20">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none z-0" />
                        
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10 w-full sm:w-auto">
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="w-14 h-14 shrink-0 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                                    <Users size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
                                        <span className="truncate max-w-[200px] sm:max-w-xs">{team.name}</span>
                                        <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-gray-200 dark:border-gray-600 shrink-0">
                                            {team.region_level}
                                        </span>
                                    </h2>
                                    {(team.city || team.state || team.area) && (
                                        <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1.5">
                                            <MapPin size={14} className="shrink-0" />
                                            <span className="truncate">{[team.area, team.city, team.state].filter(Boolean).join(', ')}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {!isReadOnly && (
                            <div className="flex items-center justify-end w-full sm:w-auto gap-2 relative z-20 mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-gray-700">
                                <button 
                                    onClick={() => onAssignMember && onAssignMember(team)}
                                    className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl font-black text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    <UserPlus size={16} /> Add Member
                                </button>
                                
                                <TeamActionsDropdown 
                                    team={team}
                                    onEditTeam={onEditTeam}
                                    onAssignMember={onAssignMember}
                                    onServiceAreas={onServiceAreas}
                                />
                            </div>
                        )}
                    </div>

                    {/* Team Members Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
                        {team.team_lead && renderUserCard(team.team_lead, team, true)}
                        {team.members?.map(m => m.user && m.user.id !== team.team_lead?.id && renderUserCard(m.user, team))}
                        
                        {!team.team_lead && (!team.members || team.members.length === 0) && (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl bg-gray-50/50 dark:bg-gray-800/50">
                                <Users size={32} className="mb-3 text-gray-300" />
                                <p className="font-bold text-sm">No members in this organization</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
