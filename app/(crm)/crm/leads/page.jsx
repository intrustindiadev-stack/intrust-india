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
        <div className="p-4 sm:p-6 lg:p-8 min-h-screen max-w-7xl mx-auto space-y-6 pb-24 lg:pb-8">
            <AnimatePresence>
                {showAdd && <AddLeadDrawer onClose={() => setShowAdd(false)} onSave={() => fetchLeads(true)} />}
                {showImport && <ImportLeadsDrawer onClose={() => setShowImport(false)} onSave={() => fetchLeads(true)} />}
            </AnimatePresence>

            <BulkAssignDialog 
                isOpen={showBulkAssign}
                onClose={() => setShowBulkAssign(false)}
                selectedCount={selectedIds.length}
                totalMatchingCount={totalCount - excludedIds.length}
                selectAllMatching={selectAllMatching}
                reps={reps}
                onConfirm={handleBulkAssignConfirm}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        Leads
                        {isRefetching && <RefreshCw size={14} className="animate-spin text-gray-400" />}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {totalCount} total lead{totalCount !== 1 ? 's' : ''}
                        {activeFilterCount > 0 && ` matching filters`}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => fetchLeads(true)} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm text-gray-500">
                        <RefreshCw size={18} />
                    </button>
                    {isManager && (
                        <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm">
                            <UploadCloud size={16} /> Import
                        </button>
                    )}
                    <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 text-sm">
                        <Plus size={16} /> New Lead
                    </button>
                </div>
            </div>

            {/* Toolbar / Search & Filters */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row gap-4 relative z-20">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text" 
                        placeholder="Search by name, phone, email, title..."
                        value={localSearch} 
                        onChange={e => setLocalSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                    <div className="relative">
                        <select 
                            value={statusFilter[0] || ''}
                            onChange={(e) => updateParams({ status: e.target.value ? [e.target.value] : [] }, true)}
                            className="appearance-none pl-4 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Statuses</option>
                            {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>

                    {isManager && (
                        <div className="relative">
                            <select 
                                value={assigneeFilter[0] || ''}
                                onChange={(e) => updateParams({ assignee: e.target.value ? [e.target.value] : [] }, true)}
                                className="appearance-none pl-4 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">All Reps</option>
                                <option value="unassigned">Unassigned</option>
                                <option value="me">Assigned to me</option>
                                {reps.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        <select 
                            value={datePreset}
                            onChange={(e) => handleDatePresetChange(e.target.value)}
                            className="appearance-none pl-4 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Time</option>
                            <option value="today">Today</option>
                            <option value="last_7_days">Last 7 Days</option>
                            <option value="last_30_days">Last 30 Days</option>
                            <option value="this_month">This Month</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowFilters(true)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${
                            activeFilterCount > 0 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <Filter size={16} />
                        More Filters
                        {activeFilterCount > 0 && (
                            <span className="bg-indigo-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    
                    {activeFilterCount > 0 && (
                        <button 
                            onClick={() => {
                                setLocalSearch('');
                                router.push(pathname);
                            }}
                            className="p-2.5 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
    );
}
