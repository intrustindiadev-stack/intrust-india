'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Users, Edit, UserPlus, Building2, Shield, MapPin, Search } from 'lucide-react';
import Image from 'next/image';

export default function ResponsiveOrgTree({
    teams = [],
    onEditTeam,
    onAssignMember,
    onRemoveMember,
    onReassignMember,
    onServiceAreas,
    isReadOnly = false
}) {
    const [expandedNodes, setExpandedNodes] = useState({});
    const [searchQuery, setSearchQuery] = useState('');

    // Build hierarchy tree from flat teams array assuming parent_id exists
    const tree = useMemo(() => {
        const teamMap = new Map();
        teams.forEach(t => teamMap.set(t.id, { ...t, children: [] }));
        
        const rootNodes = [];
        teams.forEach(t => {
            const node = teamMap.get(t.id);
            if (t.parent_id && teamMap.has(t.parent_id)) {
                teamMap.get(t.parent_id).children.push(node);
            } else {
                rootNodes.push(node);
            }
        });
        
        return rootNodes;
    }, [teams]);

    const toggleNode = (id) => {
        setExpandedNodes(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const toggleAll = (expand) => {
        const newExpanded = {};
        if (expand) {
            teams.forEach(t => newExpanded[t.id] = true);
        }
        setExpandedNodes(newExpanded);
    };

    const renderNode = (node, depth = 0) => {
        const isExpanded = !!expandedNodes[node.id];
        const hasChildren = node.children && node.children.length > 0;
        
        // Search filter
        const matchesSearch = searchQuery === '' || 
                              node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (node.team_lead && node.team_lead.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));

        if (searchQuery && !matchesSearch && !hasChildren) return null; // Very basic filter

        return (
            <div key={node.id} className="relative">
                {/* Connector line for children */}
                {depth > 0 && (
                    <div className="absolute left-[-20px] top-[24px] w-[20px] h-px bg-gray-300 dark:bg-gray-700" />
                )}
                {depth > 0 && (
                    <div className="absolute left-[-20px] top-[-10px] w-px h-[34px] bg-gray-300 dark:bg-gray-700" />
                )}

                <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white dark:bg-gray-800 border ${isExpanded ? 'border-indigo-200 dark:border-indigo-800 shadow-md shadow-indigo-100/20 dark:shadow-indigo-900/10' : 'border-gray-200 dark:border-gray-700 shadow-sm'} rounded-xl p-4 mb-3 transition-all flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between group relative z-10`}
                >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button 
                            onClick={() => hasChildren && toggleNode(node.id)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0 ${hasChildren ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50' : 'bg-gray-50 text-gray-400 dark:bg-gray-800 cursor-default'}`}
                        >
                            {hasChildren ? (isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />) : <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />}
                        </button>
                        
                        <div className="flex-1 min-w-0 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                                {node.team_lead?.avatar_url ? (
                                    <Image src={node.team_lead.avatar_url} alt="Lead" width={40} height={40} className="rounded-full object-cover" />
                                ) : (
                                    <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
                                )}
                            </div>
                            
                            <div className="min-w-0">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                                    <span className="truncate">{node.name}</span>
                                    <span className="text-[10px] font-black uppercase tracking-wider bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-600">
                                        {node.region_level || 'Team'}
                                    </span>
                                </h4>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {node.team_lead ? (
                                        <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300"><Shield size={12} className="text-indigo-500" /> {node.team_lead.full_name}</span>
                                    ) : (
                                        <span className="text-amber-500 font-medium">No Lead Assigned</span>
                                    )}
                                    {(node.city || node.state) && (
                                        <span className="flex items-center gap-1"><MapPin size={12} /> {[node.city, node.state].filter(Boolean).join(', ')}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {!isReadOnly && (
                        <div className="flex items-center gap-1 w-full sm:w-auto justify-end border-t sm:border-t-0 border-gray-100 dark:border-gray-700 pt-3 sm:pt-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onAssignMember && onAssignMember(node)} className="p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors" title="Add Member">
                                <UserPlus size={16} />
                            </button>
                            <button onClick={() => onServiceAreas && onServiceAreas(node)} className="p-2 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/30 transition-colors" title="Service Areas">
                                <Building2 size={16} />
                            </button>
                            <button onClick={() => onEditTeam && onEditTeam(node)} className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors" title="Edit Team">
                                <Edit size={16} />
                            </button>
                        </div>
                    )}
                </motion.div>

                <AnimatePresence>
                    {isExpanded && hasChildren && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden pl-6 sm:pl-10 relative"
                        >
                            {/* Vertical line connecting children */}
                            <div className="absolute left-[19px] sm:left-[35px] top-0 bottom-6 w-px bg-gray-200 dark:bg-gray-700" />
                            {node.children.map(child => renderNode(child, depth + 1))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50/50 dark:bg-gray-900/50 min-h-[500px] rounded-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search teams or leads..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => toggleAll(true)} className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                        Expand All
                    </button>
                    <button onClick={() => toggleAll(false)} className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                        Collapse All
                    </button>
                </div>
            </div>

            <div className="relative">
                {tree.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Building2 size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No organization structure found.</p>
                    </div>
                ) : (
                    tree.map(node => renderNode(node, 0))
                )}
            </div>
        </div>
    );
}
