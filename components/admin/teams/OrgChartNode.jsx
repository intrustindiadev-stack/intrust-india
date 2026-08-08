'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Users, Edit3, ChevronDown, ChevronUp, MapPin, UserPlus, GripVertical, MoveRight } from 'lucide-react';

const REGION_BADGES = {
    state: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
    city: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800',
    area: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
};

export default function OrgChartNode({
    team,
    isExpanded,
    onToggleExpand,
    onEditTeam,
    onAssignMember,
    onRemoveMember,
    onReassignMember,
    onServiceAreas,
    isReadOnly = false,
    nodeRef
}) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [movingMemberId, setMovingMemberId] = useState(null);

    const level = team.region_level || 'area';
    const badgeStyle = REGION_BADGES[level] || REGION_BADGES.area;
    const memberCount = team.members?.length || 0;
    const hasChildren = (team.children?.length || 0) > 0;

    // Drag and Drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isReadOnly) setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (isReadOnly) return;

        try {
            const dataStr = e.dataTransfer.getData('application/json');
            if (!dataStr) return;
            const data = JSON.parse(dataStr);
            if (data.userId && data.sourceTeamId !== team.id) {
                onReassignMember?.(data.userId, team.id);
            }
        } catch (err) {
            console.error('Failed to parse drag data:', err);
        }
    };

    const handleMemberDragStart = (e, userId) => {
        if (isReadOnly) return;
        e.stopPropagation();
        e.dataTransfer.setData('application/json', JSON.stringify({
            userId,
            sourceTeamId: team.id
        }));
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <motion.div
            ref={nodeRef}
            layout
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-72 bg-white dark:bg-gray-900 rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md relative select-none overflow-hidden ${
                isDragOver
                    ? 'border-indigo-400 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
            }`}
        >
            {/* Header / Region Tag */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 bg-gray-50/50 dark:bg-gray-800/50">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                    {team.region_level}
                </span>

                <div className="flex items-center gap-1">
                    {team.city && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5 font-medium mr-1">
                            <MapPin size={11} className="text-gray-400" />
                            {team.city}
                        </span>
                    )}
                    {!isReadOnly && (
                        <>
                            <button
                                onClick={() => onServiceAreas?.(team)}
                                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                title="Coverage Zones"
                                aria-label={`Manage Coverage Zones for ${team.name}`}
                            >
                                <MapPin size={13} />
                            </button>
                            <button
                                onClick={() => onEditTeam?.(team)}
                                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                title="Edit Team"
                                aria-label={`Edit ${team.name}`}
                            >
                                <Edit3 size={13} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Team Title & Description */}
            <div className="p-4 space-y-4">
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">
                        {team.name}
                    </h3>
                    {team.area && (
                        <p className="text-xs text-gray-500 font-medium">{team.area}</p>
                    )}
                    {team.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 mt-1">{team.description}</p>
                    )}
                </div>

                {/* Team Lead Card */}
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm flex-shrink-0 border border-indigo-100 dark:border-indigo-800/50">
                        <Crown size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Team Lead
                        </div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-gray-200 truncate">
                            {team.team_lead?.full_name || 'No Lead Assigned'}
                        </div>
                    </div>
                </div>

                {/* Members List */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <Users size={12} /> Members ({memberCount})
                        </span>
                        {!isReadOnly && (
                            <button
                                onClick={() => onAssignMember?.(team)}
                                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold flex items-center gap-0.5 hover:underline"
                                aria-label={`Add member to ${team.name}`}
                            >
                                <UserPlus size={10} /> Add
                            </button>
                        )}
                    </div>

                    {memberCount === 0 ? (
                        <div className="text-center py-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/30">
                            <p className="text-[11px] text-gray-500 font-medium">No members added yet</p>
                            {!isReadOnly && (
                                <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium mt-1">Drag members here or click Add</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                            {team.members.map((m) => {
                                const u = m.user;
                                if (!u) return null;
                                const isLead = team.team_lead_id === u.id;

                                return (
                                    <div
                                        key={m.id || u.id}
                                        draggable={!isReadOnly}
                                        onDragStart={(e) => handleMemberDragStart(e, u.id)}
                                        className={`group flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                                            isLead
                                                ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50'
                                                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-100 dark:border-gray-700 shadow-sm'
                                        } ${!isReadOnly ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {!isReadOnly && (
                                                <GripVertical size={12} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
                                            )}
                                            <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold flex items-center justify-center text-[9px] flex-shrink-0">
                                                {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium truncate leading-tight text-gray-800 dark:text-gray-200 text-[11px]">
                                                    {u.full_name || u.email}
                                                </p>
                                                <p className="text-[9px] text-gray-400 uppercase font-medium">
                                                    {u.role?.replace(/_/g, ' ')}
                                                </p>
                                            </div>
                                        </div>

                                        {!isReadOnly && !isLead && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => onRemoveMember?.(u.id, team.id)}
                                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-opacity"
                                                    title="Remove member"
                                                    aria-label={`Remove ${u.full_name || u.email} from ${team.name}`}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Sub-teams Expand / Collapse Trigger */}
            {hasChildren && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 rounded-b-xl text-center">
                    <button
                        onClick={onToggleExpand}
                        className="w-full py-1 text-[11px] font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center justify-center gap-1 transition-colors"
                        aria-label={isExpanded ? "Collapse sub-teams" : "Expand sub-teams"}
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp size={14} /> Hide Sub-units ({team.children.length})
                            </>
                        ) : (
                            <>
                                <ChevronDown size={14} /> View Sub-units ({team.children.length})
                            </>
                        )}
                    </button>
                </div>
            )}
        </motion.div>
    );
}
