'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    X, Crown, Users, MapPin, BarChart2, History, Edit3, 
    UserPlus, ArrowRightLeft, MoveRight, Trash2, Building2, 
    Shield, CheckCircle2, AlertCircle, Phone, Mail, UserCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TeamDetailsDrawer({
    team,
    allTeams = [],
    capabilities = {},
    onClose,
    onEditTeam,
    onAssignMember,
    onRemoveMember,
    onBulkTransfer,
    onManageServiceAreas
}) {
    const [auditLogs, setAuditLogs] = useState([]);
    const [loadingAudit, setLoadingAudit] = useState(false);
    const [crmStats, setCrmStats] = useState(null);
    const [loadingCrm, setLoadingCrm] = useState(false);

    useEffect(() => {
        if (!team?.id) return;

        // Fetch Audit Logs for Team
        const fetchAudit = async () => {
            setLoadingAudit(true);
            try {
                const res = await fetch(`/api/teams/${team.id}/audit`);
                if (res.ok) {
                    const data = await res.json();
                    setAuditLogs(data.audit_logs || []);
                }
            } catch (e) {
                console.error('Failed to load audit logs:', e);
            } finally {
                setLoadingAudit(false);
            }
        };

        // Fetch CRM Lead Metrics for Team
        const fetchCrmStats = async () => {
            setLoadingCrm(true);
            try {
                const res = await fetch(`/api/crm/leads?team_id=${team.id}&limit=1`);
                if (res.ok) {
                    const data = await res.json();
                    setCrmStats({
                        total: data.pagination?.total || (data.leads?.length || 0)
                    });
                }
            } catch (e) {
                console.error('Failed to load CRM stats:', e);
            } finally {
                setLoadingCrm(false);
            }
        };

        fetchAudit();
        fetchCrmStats();
    }, [team?.id]);

    if (!team) return null;

    const parentTeam = allTeams.find(t => t.id === team.parent_team_id);
    const members = team.members || [];
    const memberCount = members.length;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full sm:w-[450px] md:w-[500px] bg-white dark:bg-gray-900 flex flex-col h-full shadow-2xl border-l border-gray-200 dark:border-gray-800 z-10"
            >
                {/* Header (TEAM Section) */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col gap-4 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                    {team.region_level || 'Area'}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${team.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                    {team.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                {team.name}
                            </h2>
                            {team.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {team.description}
                                </p>
                            )}
                        </div>
                    
                        <div className="flex items-center gap-2">
                            {capabilities.canEditTeam && (
                                <button
                                    onClick={() => { onClose(); onEditTeam?.(team); }}
                                    className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors shadow-sm"
                                    title="Edit Unit"
                                >
                                    <Edit3 size={16} />
                                </button>
                            )}
                            <button 
                                onClick={onClose} 
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* TERRITORY Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <MapPin size={14} /> Territory
                            </h3>
                            <button
                                onClick={() => { onClose(); onManageServiceAreas?.(team); }}
                                className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium hover:underline"
                            >
                                Manage Coverage
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                                <span className="text-xs text-gray-500 block mb-1">Service Area</span>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {[team.area, team.city, team.state].filter(Boolean).join(', ') || 'Statewide'}
                                </div>
                            </div>
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                                <span className="text-xs text-gray-500 block mb-1">Parent Unit</span>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {parentTeam ? parentTeam.name : 'Top Level (Root)'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LEADERSHIP Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Crown size={14} /> Leadership
                            </h3>
                        </div>

                        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                    <Crown size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                        {team.team_lead?.full_name || 'No Lead Assigned'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {team.team_lead?.email || 'Assign a lead to manage this unit'}
                                    </p>
                                </div>
                            </div>

                            {capabilities.canEditTeam && (
                                <button
                                    onClick={() => { onClose(); onEditTeam?.(team); }}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Change
                                </button>
                            )}
                        </div>
                    </div>

                    {/* WORKFORCE Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Users size={14} /> Workforce ({memberCount})
                            </h3>
                            {capabilities.canAssignMembers && (
                                <button
                                    onClick={() => { onClose(); onAssignMember?.(team); }}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1"
                                >
                                    <UserPlus size={14} /> Add Member
                                </button>
                            )}
                        </div>

                        {memberCount === 0 ? (
                            <div className="text-center py-6 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No members assigned</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {members.map((m) => {
                                    const u = m.user;
                                    if (!u) return null;
                                    const isLead = team.team_lead_id === u.id;

                                    return (
                                        <div
                                            key={m.id || u.id}
                                            className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center text-xs">
                                                    {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                        {u.full_name || u.email}
                                                        {isLead && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                                Lead
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-500 capitalize">
                                                        {u.role?.replace(/_/g, ' ')}
                                                    </p>
                                                </div>
                                            </div>

                                            {!isLead && capabilities.canAssignMembers && (
                                                <button
                                                    onClick={() => onRemoveMember?.(u.id, team.id)}
                                                    className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2 py-1 rounded transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* CRM RESPONSIBILITY Section */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <BarChart2 size={14} /> CRM Responsibility
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                                <span className="text-xs text-gray-500 block mb-1">Active Leads Load</span>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {loadingCrm ? '...' : crmStats?.total || 0}
                                </div>
                            </div>
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                                <span className="text-xs text-gray-500 block mb-1">Team Pool Load</span>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    -- {/* Feature placeholder if team pool is tracked separately */}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Audit History (Optional/Collapsible or at bottom) */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <History size={14} /> Recent Activity
                        </h3>

                        {loadingAudit ? (
                            <p className="text-xs text-gray-400">Loading activity trail...</p>
                        ) : auditLogs.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No recent log entries recorded</p>
                        ) : (
                            <div className="space-y-2">
                                {auditLogs.slice(0, 5).map(log => (
                                    <div key={log.id} className="py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 text-xs">
                                        <div className="flex items-center justify-between text-gray-900 dark:text-white font-medium mb-1">
                                            <span className="capitalize">{log.action?.replace(/_/g, ' ')}</span>
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(log.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400">
                                            By: {log.actor?.full_name || log.actor?.email || 'System'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Action Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex gap-3">
                    <button
                        onClick={() => { onClose(); onManageServiceAreas?.(team); }}
                        className="flex-1 py-2 px-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                        Service Areas
                    </button>
                    {capabilities.canAssignMembers && (
                        <button
                            onClick={() => { onClose(); onBulkTransfer?.(); }}
                            className="flex-1 py-2 px-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                        >
                            Transfer Members
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
