'use client';

import { useState, useEffect } from 'react';
import { fetchExtendedLeadsForDistribution, fetchRoutingDiagnosis, checkReroutePreview } from '@/app/actions/admin-distribution';
import { AlertCircle, MapPin, Loader2, RefreshCw, Settings, ChevronDown, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function NeedsActionTab({ onAction }) {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [diagnostics, setDiagnostics] = useState({});
    
    // Bulk Reroute State
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [isRerouting, setIsRerouting] = useState(false);

    useEffect(() => {
        loadNeedsActionLeads();
    }, []);

    const loadNeedsActionLeads = async () => {
        setLoading(true);
        // Fetch up to 50 pending leads to show in this view
        const { data, error } = await fetchExtendedLeadsForDistribution(1, '', 'needs_action', null, 50);
        
        if (!error && data) {
            setLeads(data);
            
            // Fetch diagnostics for each lead concurrently
            const newDiagnostics = {};
            await Promise.all(data.map(async (lead) => {
                const { data: diag } = await fetchRoutingDiagnosis(
                    lead.pincode, lead.zone, lead.area, lead.city, lead.state
                );
                if (diag) {
                    newDiagnostics[lead.id] = diag;
                }
            }));
            
            setDiagnostics(newDiagnostics);
        }
        setLoading(false);
    };

    const handlePreviewReroute = async () => {
        setShowPreviewModal(true);
        setPreviewLoading(true);
        
        const { data, error } = await checkReroutePreview();
        if (!error) {
            setPreviewData(data);
        }
        setPreviewLoading(false);
    };

    const handleExecuteReroute = async () => {
        setIsRerouting(true);
        try {
            const res = await fetch('/api/crm/leads/reroute', { method: 'POST' });
            if (res.ok) {
                setShowPreviewModal(false);
                loadNeedsActionLeads();
                if (onAction) onAction();
            } else {
                alert('Failed to execute bulk reroute');
            }
        } catch (error) {
            console.error('Error during reroute', error);
        } finally {
            setIsRerouting(false);
        }
    };

    // Grouping by issue type
    const getIssueGroup = (diag) => {
        if (!diag) return 'Unknown Issue';
        if (diag.out_match_type === 'none' || !diag.out_team_id) return 'No Service Area Coverage';
        return 'Other Routing Failure';
    };

    const groupedLeads = leads.reduce((acc, lead) => {
        const group = getIssueGroup(diagnostics[lead.id]);
        if (!acc[group]) acc[group] = [];
        acc[group].push(lead);
        return acc;
    }, {});

    return (
        <div className="p-6 pb-24 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Action Required</h2>
                    <p className="text-sm text-slate-500">These leads could not be automatically routed to a team.</p>
                </div>
                <button
                    onClick={handlePreviewReroute}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                >
                    <RefreshCw size={16} />
                    Preview & Re-Route All
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
                    <p className="text-slate-500 font-medium">Diagnosing pending leads...</p>
                </div>
            ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <p className="text-lg font-bold text-slate-900">All caught up!</p>
                    <p className="text-slate-500">No leads are currently stuck in routing.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedLeads).map(([groupName, groupLeads]) => (
                        <div key={groupName} className="space-y-4">
                            
                            {/* Group Header */}
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-slate-800 flex items-center gap-2">
                                    <AlertCircle size={18} className="text-rose-500" />
                                    {groupName} ({groupLeads.length})
                                </h3>
                                
                                {groupName === 'No Service Area Coverage' && (
                                    <Link 
                                        href="/admin/teams"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                        <Settings size={14} />
                                        Configure Coverage
                                    </Link>
                                )}
                            </div>

                            {/* Group Items */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {groupLeads.map(lead => (
                                    <DiagnosticCard 
                                        key={lead.id} 
                                        lead={lead} 
                                        diagnosis={diagnostics[lead.id]} 
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Preview Modal */}
            {showPreviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">Bulk Re-Route Preview</h2>
                            <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-slate-600 p-2">
                                <XCircle size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 bg-slate-50 flex-1">
                            {previewLoading ? (
                                <div className="flex flex-col items-center justify-center p-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                                    <p className="text-slate-500">Calculating routing preview...</p>
                                </div>
                            ) : previewData ? (
                                <div className="space-y-6">
                                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-slate-500 font-medium mb-1">Affected Leads</div>
                                            <div className="text-3xl font-black text-slate-900">{previewData.total_pending}</div>
                                        </div>
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                            <RefreshCw className="w-6 h-6 text-slate-600" />
                                        </div>
                                    </div>
                                    
                                    <div className="text-sm text-slate-600 bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                        <p>
                                            Executing a bulk reroute will re-evaluate the territory matching algorithm for all <strong>{previewData.total_pending}</strong> pending leads against the current team service areas.
                                            Leads without valid service area coverage will remain pending.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center text-rose-500">Failed to load preview data.</p>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-white flex gap-3 justify-end">
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExecuteReroute}
                                disabled={isRerouting || previewLoading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                            >
                                {isRerouting ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                                {isRerouting ? 'Executing...' : 'Confirm Re-Route'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DiagnosticCard({ lead, diagnosis }) {
    
    const levels = [
        { name: 'Pincode', value: lead.pincode },
        { name: 'Zone', value: lead.zone },
        { name: 'Area', value: lead.area },
        { name: 'City', value: lead.city },
        { name: 'State', value: lead.state }
    ];

    const matchLevel = diagnosis?.out_match_type || 'none';
    const isMatched = matchLevel !== 'none';

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
            
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="font-bold text-slate-900">{lead.contact_name}</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <MapPin size={12} />
                        {[lead.city, lead.state].filter(Boolean).join(', ') || 'No location provided'}
                    </div>
                </div>
                
                {isMatched ? (
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-md border border-emerald-100">
                        Match Found
                    </span>
                ) : (
                    <span className="px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-wider rounded-md border border-rose-100">
                        Unmatched
                    </span>
                )}
            </div>

            {/* Diagnostic Trace */}
            <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Routing Resolution Trace</div>
                
                {levels.map((lvl) => {
                    if (!lvl.value) return null; // skip empty levels
                    
                    const isWinningLevel = matchLevel === lvl.name.toLowerCase();
                    const icon = isWinningLevel ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-slate-300" />;
                    
                    return (
                        <div key={lvl.name} className={`flex items-center justify-between text-sm ${isWinningLevel ? 'bg-emerald-50 p-1.5 -mx-1.5 rounded border border-emerald-100' : ''}`}>
                            <div className="flex items-center gap-2">
                                {icon}
                                <span className="font-semibold text-slate-600 w-16">{lvl.name}</span>
                                <span className="text-slate-900">{lvl.value}</span>
                            </div>
                            {isWinningLevel && (
                                <span className="text-xs font-bold text-emerald-700">Matched to Team</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Conclusion */}
            <div className="pt-2 border-t border-slate-100 text-sm flex items-center justify-between">
                <div>
                    <span className="text-slate-500 mr-2">Result:</span>
                    {isMatched ? (
                        <span className="font-bold text-slate-900">{diagnosis.out_team_name}</span>
                    ) : (
                        <span className="font-semibold text-rose-600">Failed — No matching territory</span>
                    )}
                </div>
                {/* Could add manual assign button here as fallback */}
            </div>

        </div>
    );
}
