'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Users, Edit3, ChevronDown, ChevronUp, MapPin, UserPlus, GripVertical, MoveRight } from 'lucide-react';

const REGION_BADGES = {
    state: 'bg-purple-100 text-purple-800 border-purple-200',
    city: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    area: 'bg-emerald-100 text-emerald-800 border-emerald-200',
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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-72 bg-white dark:bg-gray-800 rounded-[1.75rem] border transition-all duration-300 shadow-xl shadow-gray-200/30 dark:shadow-black/20 hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-1 relative select-none overflow-hidden ${
                isDragOver
                    ? 'border-indigo-400 ring-4 ring-indigo-500/10 bg-indigo-50/30 scale-105'
                    : 'border-gray-100 dark:border-gray-700/50 hover:border-gray-200'
            }`}
            style={{
                // Removed the thick colored top border for a flatter, premium look
            }}
        >
            {/* Header / Region Tag */}
            <div className="p-4 border-b border-gray-50 dark:border-gray-700/50 flex items-center justify-between gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeStyle}`} style={{ color: team.color || 'inherit', borderColor: team.color ? `${team.color}40` : 'inherit', backgroundColor: team.color ? `${team.color}10` : 'inherit' }}>
                    {team.region_level}
                </span>

                <div className="flex items-center gap-1.5">
                    {team.city && (
                        <span className="text-xs text-slate-500 flex items-center gap-0.5 font-medium">
                            <MapPin size={11} className="text-slate-400" />
                            {team.city}
                        </span>
                    )}
                    {!isReadOnly && (
                        <>
                            <button
                                onClick={() => onServiceAreas?.(team)}
                                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Coverage Zones"
                                aria-label={`Manage Coverage Zones for ${team.name}`}
                            >
                                <MapPin size={13} />
                            </button>
                            <button
                                onClick={() => onEditTeam?.(team)}
                                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
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
            <div className="p-4 space-y-3">
                <div>
                    <h3 className="font-black text-gray-900 dark:text-white text-base leading-snug tracking-tight">
                        {team.name}
                    </h3>
                    {team.area && (
                        <p className="text-xs text-slate-500 font-medium">{team.area}</p>
                    )}
                    {team.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{team.description}</p>
                    )}
                </div>

                {/* Team Lead Card */}
                <div className="bg-amber-50/80 border border-amber-200/70 rounded-2xl p-2.5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0">
                        <Crown size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                            Team Lead
                        </div>
                        <div className="text-xs font-bold text-slate-800 truncate">
                            {team.team_lead?.full_name || 'No Lead Assigned'}
                        </div>
                    </div>
                </div>

                {/* Members List */}
                <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Users size={12} /> Members ({memberCount})
                        </span>
                        {!isReadOnly && (
                            <button
                                onClick={() => onAssignMember?.(team)}
                                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-0.5 hover:underline"
                                aria-label={`Add member to ${team.name}`}
                            >
                                <UserPlus size={12} /> Add
                            </button>
                        )}
                    </div>

                    {memberCount === 0 ? (
                        <div className="text-center py-3 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <p className="text-xs text-slate-400 font-medium">No members added yet</p>
                            {!isReadOnly && (
                                <p className="text-[10px] text-indigo-500 font-semibold mt-0.5">Drag members here or click Add</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto hide-scrollbar pr-0.5">
                            {team.members.map((m) => {
                                const u = m.user;
                                if (!u) return null;
                                const isLead = team.team_lead_id === u.id;

                                return (
                                    <div
                                        key={m.id || u.id}
                                        draggable={!isReadOnly}
                                        onDragStart={(e) => handleMemberDragStart(e, u.id)}
                                        className={`group flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
                                            isLead
                                                ? 'bg-amber-50/40 border-amber-200/50 text-amber-900'
                                                : 'bg-white hover:bg-indigo-50/30 border-slate-100 hover:border-indigo-100 text-slate-700 shadow-sm shadow-slate-100/50'
                                        } ${!isReadOnly ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {!isReadOnly && (
                                                <GripVertical size={12} className="text-slate-300 group-hover:text-indigo-400 flex-shrink-0" />
                                            )}
                                            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                                                {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold truncate leading-tight text-slate-800">
                                                    {u.full_name || u.email}
                                                </p>
                                                <p className="text-[9px] text-slate-400 uppercase font-medium">
                                                    {u.role?.replace(/_/g, ' ')}
                                                </p>
                                            </div>
                                        </div>

                                        {!isReadOnly && !isLead && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => onRemoveMember?.(u.id, team.id)}
                                                    className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-rose-50 transition-opacity"
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
                <div className="p-2 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl text-center">
                    <button
                        onClick={onToggleExpand}
                        className="w-full py-1 text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-1 transition-colors"
                        aria-label={isExpanded ? "Collapse sub-teams" : "Expand sub-teams"}
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp size={14} /> Hide Sub-teams ({team.children.length})
                            </>
                        ) : (
                            <>
                                <ChevronDown size={14} /> View Sub-teams ({team.children.length})
                            </>
                        )}
                    </button>
                </div>
            )}
        </motion.div>
    );
}
