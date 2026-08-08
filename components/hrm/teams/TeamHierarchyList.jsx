'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Users, Layers, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

function TeamNode({ team, childrenMap, level = 0 }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const children = childrenMap[team.id] || [];
    const hasChildren = children.length > 0;

    return (
        <div className="w-full group">
            <div className="flex items-center gap-2 mb-2" style={{ marginLeft: level === 0 ? 0 : '2rem' }}>
                {/* Expander Button - Keeps event from bubbling to link */}
                <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                    {hasChildren ? (
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className="w-full h-full flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors"
                        >
                            {isExpanded ? <ChevronDown size={18} strokeWidth={2.5} /> : <ChevronRight size={18} strokeWidth={2.5} />}
                        </button>
                    ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    )}
                </div>

                {/* Clickable Team Card */}
                <Link 
                    href={`/hrm/teams/${team.id}`}
                    className={`flex-1 flex items-center gap-4 py-3 px-4 rounded-2xl transition-all duration-200 border active:scale-[0.99] ${
                        level === 0 
                            ? 'bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md mb-2' 
                            : 'bg-gray-50/50 border-transparent hover:bg-white hover:border-gray-200 hover:shadow-md'
                    }`}
                >
                    {/* Team Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        level === 0 ? 'bg-gray-900 text-white shadow-sm' : 'bg-white text-gray-700 shadow-sm border border-gray-200'
                    }`}>
                        {level === 0 ? <LayoutGrid size={18} /> : <Layers size={18} />}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-gray-900 truncate ${level === 0 ? 'text-lg' : 'text-sm'}`}>
                            {team.name}
                        </h3>
                        {team.description && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">{team.description}</p>
                        )}
                    </div>

                    {/* Badges / Stats */}
                    <div className="shrink-0 flex items-center gap-2">
                        <span className="flex items-center gap-1.5 bg-gray-100/80 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 group-hover:bg-gray-200 transition-colors">
                            <Users size={14} />
                            {team.members_count || 0}
                        </span>
                        <ChevronRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                    </div>
                </Link>
            </div>

            {/* Children */}
            <AnimatePresence>
                {hasChildren && isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="relative mt-1 mb-3">
                            {/* Vertical connecting line */}
                            <div className="absolute left-[1.35rem] top-0 bottom-6 w-[2px] bg-gray-100 rounded-full" />
                            
                            <div className="flex flex-col gap-2">
                                {children.map(child => (
                                    <TeamNode 
                                        key={child.id} 
                                        team={child} 
                                        childrenMap={childrenMap} 
                                        level={level + 1} 
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function TeamHierarchyList({ teams = [] }) {
    const { rootTeams, childrenMap } = useMemo(() => {
        const childrenMap = {};
        const rootTeams = [];

        teams.forEach(t => {
            if (t.parent_team_id) {
                if (!childrenMap[t.parent_team_id]) childrenMap[t.parent_team_id] = [];
                childrenMap[t.parent_team_id].push(t);
            } else {
                rootTeams.push(t);
            }
        });

        return { rootTeams, childrenMap };
    }, [teams]);

    if (teams.length === 0) {
        return (
            <div className="bg-white rounded-[2rem] border border-slate-100 p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Layers size={28} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No Organizations Found</h3>
                <p className="text-sm text-slate-500 mt-1">There are no organizations in the hierarchy yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-black text-slate-900 mb-6 tracking-tight">Organization Structure</h2>
            <div className="flex flex-col gap-4">
                {rootTeams.map(root => (
                    <TeamNode 
                        key={root.id} 
                        team={root} 
                        childrenMap={childrenMap} 
                        level={0} 
                    />
                ))}
            </div>
        </div>
    );
}
