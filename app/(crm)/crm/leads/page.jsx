'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, Plus, UploadCloud, RefreshCw, Filter, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import LeadsTable from '@/components/crm/leads/LeadsTable';
import LeadMobileCard from '@/components/crm/leads/LeadMobileCard';
import BulkActionBar from '@/components/crm/leads/BulkActionBar';
import BulkAssignDialog from '@/components/crm/leads/BulkAssignDialog';
import LeadsPagination from '@/components/crm/leads/LeadsPagination';
import ImportLeadsDrawer from '@/components/crm/leads/ImportLeadsDrawer';
import AddLeadDrawer from '@/components/crm/leads/AddLeadDrawer';
import LeadFilterDrawer from '@/components/crm/leads/LeadFilterDrawer';
const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const TEMPERATURES = ['hot', 'warm', 'cold'];

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function LeadsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { profile } = useAuth();

    const isManager = profile && ['relationship_manager', 'admin', 'super_admin'].includes(profile.role);

    // State: Data
    const [leads, setLeads] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [reps, setReps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);

    // State: Selection
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectAllMatching, setSelectAllMatching] = useState(false);
    const [excludedIds, setExcludedIds] = useState([]);
    
    // State: UI Modals
    const [showBulkAssign, setShowBulkAssign] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [showImport, setShowImport] = useState(false);

    // Filter values derived from URL
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const searchVal = searchParams.get('search') || '';
    const statusFilter = searchParams.getAll('status') || [];
    const tempFilter = searchParams.getAll('temperature') || [];
    const assigneeFilter = searchParams.getAll('assignee') || [];
    const datePreset = searchParams.get('date_preset') || '';
    const sortVal = searchParams.get('sort') || 'newest';

    const [localSearch, setLocalSearch] = useState(searchVal);
    const debouncedSearch = useDebounce(localSearch, 400);

    const abortControllerRef = useRef(null);

    // Update URL helper
    const updateParams = useCallback((newParams, resetPage = false) => {
        const params = new URLSearchParams(searchParams.toString());
        if (resetPage) params.set('page', '1');
        
        Object.entries(newParams).forEach(([key, value]) => {
            params.delete(key);
            if (Array.isArray(value)) {
                value.forEach(v => params.append(key, v));
            } else if (value) {
                params.set(key, value);
            }
        });
        
        router.push(`${pathname}?${params.toString()}`);
    }, [searchParams, router, pathname]);

    // Handle search input sync with URL
    useEffect(() => {
        if (debouncedSearch !== searchVal) {
            updateParams({ search: debouncedSearch }, true);
        }
    }, [debouncedSearch, searchVal, updateParams]);

    // Clear selections when filters change
    useEffect(() => {
        setSelectedIds([]);
        setSelectAllMatching(false);
        setExcludedIds([]);
    }, [searchParams]);

    const fetchReps = useCallback(async () => {
        try {
            const { data } = await supabase.from('user_profiles')
                .select('id, full_name, role, email')
                .in('role', ['relationship_exec', 'relationship_manager', 'admin', 'super_admin'])
                .order('full_name', { ascending: true });
            if (data) setReps(data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchLeads = useCallback(async (isBackground = false) => {
        if (!isBackground) setIsLoading(true);
        else setIsRefetching(true);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            const params = new URLSearchParams(searchParams.toString());
            const res = await fetch(`/api/crm/leads?${params.toString()}`, {
                signal: abortControllerRef.current.signal
            });
            if (!res.ok) throw new Error('Failed to fetch leads');
            
            const { data, pagination } = await res.json();
            setLeads(data || []);
            setTotalCount(pagination.total || 0);
        } catch (err) {
            if (err.name !== 'AbortError') {
                toast.error('Could not load leads');
            }
        } finally {
            setIsLoading(false);
            setIsRefetching(false);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchReps();
    }, [fetchReps]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // Setup realtime via Supabase channel with debounced refetch
    useEffect(() => {
        let timer;
        const handler = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                fetchLeads(true);
            }, 1000);
        };

        const channel = supabase.channel('crm_leads_page')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, handler)
            .subscribe();

        return () => {
            clearTimeout(timer);
            supabase.removeChannel(channel);
        };
    }, [fetchLeads]);

    // Selection Logic
    const toggleSelect = (id) => {
        if (selectAllMatching) {
            if (excludedIds.includes(id)) {
                setExcludedIds(prev => prev.filter(e => e !== id));
            } else {
                setExcludedIds(prev => [...prev, id]);
            }
        } else {
            setSelectedIds(prev => 
                prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
            );
        }
    };

    const toggleSelectAllPage = () => {
        const pageIds = leads.map(l => l.id);
        const isAllSelected = pageIds.every(id => selectedIds.includes(id)) && !selectAllMatching;
        
        if (selectAllMatching) {
            setSelectAllMatching(false);
            setExcludedIds([]);
            setSelectedIds([]);
        } else if (isAllSelected) {
            setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
        } else {
            const newSelections = new Set([...selectedIds, ...pageIds]);
            setSelectedIds(Array.from(newSelections));
        }
    };

    const handleSelectAllMatching = () => {
        setSelectAllMatching(true);
        setSelectedIds([]);
        setExcludedIds([]);
    };

    const handleClearSelection = () => {
        setSelectedIds([]);
        setSelectAllMatching(false);
        setExcludedIds([]);
    };

    const handleBulkAssignConfirm = async (newRepId) => {
        const payload = {
            selectAllMatching,
            explicitIds: selectedIds,
            excludedIds,
            newRepId,
            filters: Object.fromEntries(searchParams.entries())
        };

        // Note: Filters in URL need special mapping if multiple values
        if (selectAllMatching) {
            payload.filters = {
                search: searchVal,
                status: statusFilter.length ? statusFilter : undefined,
                temperature: tempFilter.length ? tempFilter : undefined,
                assignee: assigneeFilter.length ? assigneeFilter : undefined,
            };
        }

        const res = await fetch('/api/crm/leads/bulk-assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Bulk assign failed');

        handleClearSelection();
        fetchLeads(true);
    };

    // Calculate selection states
    const pageIds = leads.map(l => l.id);
    const isAllPageSelected = pageIds.length > 0 && pageIds.every(id => 
        selectAllMatching ? !excludedIds.includes(id) : selectedIds.includes(id)
    );
    const isSomeSelected = pageIds.some(id => 
        selectAllMatching ? !excludedIds.includes(id) : selectedIds.includes(id)
    );

    const actualSelectedCount = selectAllMatching 
        ? totalCount - excludedIds.length 
        : selectedIds.length;

    const activeFilterCount = (searchVal ? 1 : 0) + statusFilter.length + tempFilter.length + assigneeFilter.length + (datePreset ? 1 : 0);

    const handleDatePresetChange = (preset) => {
        if (!preset) {
            updateParams({ date_preset: '', fromDate: '', toDate: '' }, true);
            return;
        }

        const today = new Date();
        let fromDate = new Date();
        let toDate = new Date();

        switch (preset) {
            case 'today':
                fromDate.setHours(0, 0, 0, 0);
                toDate.setHours(23, 59, 59, 999);
                break;
            case 'last_7_days':
                fromDate.setDate(today.getDate() - 7);
                break;
            case 'last_30_days':
                fromDate.setDate(today.getDate() - 30);
                break;
            case 'this_month':
                fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
                toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
        }

        updateParams({ 
            date_preset: preset, 
            fromDate: fromDate.toISOString(), 
            toDate: toDate.toISOString() 
        }, true);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 font-[family-name:var(--font-outfit)] relative pb-24 lg:pb-8">
            {/* Background elements */}
            <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-indigo-50/80 dark:from-indigo-900/10 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-10 w-72 h-72 bg-indigo-200/30 dark:bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 relative z-10">
                <AnimatePresence>
                    {showAdd && <AddLeadDrawer onClose={() => setShowAdd(false)} onSave={() => fetchLeads(true)} />}
                    {showImport && <ImportLeadsDrawer onClose={() => setShowImport(false)} onSave={() => fetchLeads(true)} />}
                </AnimatePresence>

                <LeadFilterDrawer 
                    isOpen={showFilters}
                    onClose={() => setShowFilters(false)}
                    statusFilter={statusFilter}
                    tempFilter={tempFilter}
                    assigneeFilter={assigneeFilter}
                    reps={reps}
                    isManager={isManager}
                    updateParams={updateParams}
                    activeFilterCount={activeFilterCount}
                />

                <BulkAssignDialog 
                    isOpen={showBulkAssign}
                    onClose={() => setShowBulkAssign(false)}
                    selectedCount={selectedIds.length}
                    totalMatchingCount={totalCount - excludedIds.length}
                    selectAllMatching={selectAllMatching}
                    reps={reps}
                    onConfirm={handleBulkAssignConfirm}
                />

                {/* Hero Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex flex-col gap-2 flex-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 dark:bg-gray-800/60 text-indigo-700 dark:text-indigo-400 text-xs font-bold w-fit border border-white/50 dark:border-gray-700/50 backdrop-blur-md shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                            CRM Leads Pipeline
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            Leads Directory
                            {isRefetching && <RefreshCw size={20} className="animate-spin text-gray-400" />}
                        </h1>
                        <p className="text-slate-500 dark:text-gray-400 font-medium text-lg max-w-xl">
                            {totalCount} total lead{totalCount !== 1 ? 's' : ''} {activeFilterCount > 0 && `(Filtered)`}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {isManager && (
                            <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-white/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800 text-slate-700 dark:text-gray-300 px-5 py-3 rounded-2xl font-bold transition-all shadow-sm shadow-slate-200/40 text-sm">
                                <UploadCloud size={18} /> Import
                            </button>
                        )}
                        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/30 text-sm">
                            <Plus size={18} /> New Lead
                        </button>
                    </div>
                </div>

                {/* Search & Quick Filters Bar */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-gray-700/50 shadow-2xl shadow-indigo-100/20 dark:shadow-none p-2 flex flex-col lg:flex-row gap-2">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text" 
                            placeholder="Search by name, phone, email, title..."
                            value={localSearch} 
                            onChange={e => setLocalSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 bg-transparent border-none text-slate-800 dark:text-white text-sm font-semibold focus:outline-none focus:ring-0 placeholder-slate-400"
                        />
                    </div>
                    
                    {/* Divider */}
                    <div className="hidden lg:block w-px bg-slate-200 dark:bg-gray-700 my-2 mx-1"></div>

                    {/* Quick Filters */}
                    <div className="flex items-center gap-2 p-2 overflow-x-auto hide-scrollbar">
                        {profile?.id && (
                            <button
                                onClick={() => {
                                    if (assigneeFilter.includes(profile.id)) {
                                        updateParams({ assignee: assigneeFilter.filter(a => a !== profile.id) }, true);
                                    } else {
                                        updateParams({ assignee: [profile.id] }, true); // Overwrite array so it isolates 'My Leads'
                                    }
                                }}
                                className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shadow-sm border ${
                                    assigneeFilter.includes(profile.id)
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                                }`}
                            >
                                ✨ My Leads
                            </button>
                        )}
                        {isManager && (
                            <button
                                onClick={() => {
                                    if (assigneeFilter.includes('unassigned')) {
                                        updateParams({ assignee: assigneeFilter.filter(a => a !== 'unassigned') }, true);
                                    } else {
                                        updateParams({ assignee: ['unassigned'] }, true); // Overwrite to isolate 'Unassigned'
                                    }
                                }}
                                className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shadow-sm border ${
                                    assigneeFilter.includes('unassigned')
                                        ? 'bg-amber-500 text-white border-amber-500'
                                        : 'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-500 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                                }`}
                            >
                                🎯 Unassigned
                            </button>
                        )}

                        <div className="hidden lg:block w-px bg-slate-200 dark:bg-gray-700 my-2 mx-1"></div>

                        {/* Day-Wise Quick Filters */}
                        <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-gray-900/50 p-1 rounded-2xl border border-slate-200/50 dark:border-gray-700/50">
                            {[
                                { id: '', label: 'All Time' },
                                { id: 'today', label: 'Today' },
                                { id: 'last_7_days', label: '7D' },
                                { id: 'this_month', label: 'Month' }
                            ].map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => handleDatePresetChange(preset.id)}
                                    className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shadow-sm ${
                                        datePreset === preset.id 
                                            ? 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-400 border border-slate-200/50 dark:border-gray-700' 
                                            : 'text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-200/50 dark:hover:bg-gray-800/50 border border-transparent'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>

                        {/* Advanced Filters Trigger */}
                        <button 
                            onClick={() => setShowFilters(true)}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
                                activeFilterCount > 0 
                                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 shadow-inner' 
                                    : 'bg-white/50 dark:bg-gray-800/50 text-slate-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 border border-slate-200/50 dark:border-gray-700'
                            }`}
                        >
                            <Filter size={16} />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="bg-indigo-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1 shadow-sm">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                        
                        {/* Clear Filters */}
                        {activeFilterCount > 0 && (
                            <button 
                                onClick={() => {
                                    setLocalSearch('');
                                    router.push(pathname);
                                }}
                                className="p-2.5 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                title="Clear all filters"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

            {/* Desktop Table */}
            <LeadsTable 
                leads={leads}
                isLoading={isLoading}
                selectedIds={selectAllMatching ? leads.map(l => l.id).filter(id => !excludedIds.includes(id)) : selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAllPage}
                isAllPageSelected={isAllPageSelected}
                isSomeSelected={isSomeSelected}
            />

            {/* Mobile Cards */}
            {!isLoading && (
                <div className="lg:hidden space-y-4">
                    {leads.map(lead => (
                        <LeadMobileCard 
                            key={lead.id}
                            lead={lead}
                            isSelected={selectAllMatching ? !excludedIds.includes(lead.id) : selectedIds.includes(lead.id)}
                            onToggleSelect={toggleSelect}
                        />
                    ))}
                </div>
            )}

            {!isLoading && leads.length === 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 py-16 px-6 text-center shadow-xl shadow-gray-200/40">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                        <Search size={24} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No leads found</h3>
                    <p className="text-sm text-gray-500 mb-6">Try adjusting your search or filter criteria.</p>
                    <button 
                        onClick={() => { setLocalSearch(''); router.push(pathname); }}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-5 py-2.5 rounded-xl transition-colors"
                    >
                        Clear All Filters
                    </button>
                </div>
            )}

            <LeadsPagination 
                currentPage={page}
                totalPages={Math.ceil(totalCount / limit)}
                totalItems={totalCount}
                pageSize={limit}
                onPageChange={(p) => updateParams({ page: p.toString() })}
            />

            <BulkActionBar 
                selectedCount={actualSelectedCount}
                totalMatchingCount={totalCount}
                selectAllMatching={selectAllMatching}
                onClearSelection={handleClearSelection}
                onSelectAllMatching={handleSelectAllMatching}
                onOpenAssign={() => setShowBulkAssign(true)}
            />
        </div>
        </div>
    );
}
