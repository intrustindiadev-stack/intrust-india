'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Filter, RefreshCw, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { toast as hotToast } from 'react-hot-toast';

import LeadsTable from '@/components/crm/leads/LeadsTable';
import BulkActionBar from '@/components/crm/leads/BulkActionBar';
import BulkAssignDialog from '@/components/crm/leads/BulkAssignDialog';
import LeadsPagination from '@/components/crm/leads/LeadsPagination';
import { supabase } from '@/lib/supabaseClient';

export default function LeadAssignmentPanel() {
    const [leads, setLeads] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [reps, setReps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [page, setPage] = useState(1);
    const limit = 15;
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filter, setFilter] = useState('all');

    // Selection
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectAllMatching, setSelectAllMatching] = useState(false);
    const [excludedIds, setExcludedIds] = useState([]);
    const [showBulkAssign, setShowBulkAssign] = useState(false);

    const abortControllerRef = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchReps = useCallback(async () => {
        try {
            const { data } = await supabase.from('user_profiles')
                .select('id, full_name, role, email')
                .in('role', ['relationship_exec', 'relationship_manager', 'admin', 'super_admin'])
                .order('full_name', { ascending: true });
            if (data) setReps(data);
        } catch (err) {
            console.error('Failed to fetch reps:', err);
        }
    }, []);

    const fetchLeads = useCallback(async () => {
        setIsLoading(true);
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        try {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('limit', limit.toString());
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (filter === 'unassigned') params.set('assignee', 'unassigned');

            const res = await fetch(`/api/crm/leads?${params.toString()}`, {
                signal: abortControllerRef.current.signal
            });
            
            if (!res.ok) throw new Error('Failed to fetch');
            
            const { data, pagination } = await res.json();
            setLeads(data || []);
            setTotalCount(pagination.total || 0);
        } catch (err) {
            if (err.name !== 'AbortError') {
                hotToast.error('Failed to load leads');
            }
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, debouncedSearch, filter]);

    useEffect(() => {
        fetchReps();
    }, [fetchReps]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // Selection logic
    const toggleSelect = (id) => {
        if (selectAllMatching) {
            setExcludedIds(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
        } else {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
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

    const handleBulkAssignConfirm = async (newRepId) => {
        const payload = {
            selectAllMatching,
            explicitIds: selectedIds,
            excludedIds,
            newRepId,
            filters: {
                search: debouncedSearch,
                assignee: filter === 'unassigned' ? ['unassigned'] : undefined
            }
        };

        const res = await fetch('/api/crm/leads/bulk-assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Bulk assign failed');
        }

        setSelectedIds([]);
        setSelectAllMatching(false);
        setExcludedIds([]);
        fetchLeads();
    };

    const actualSelectedCount = selectAllMatching ? totalCount - excludedIds.length : selectedIds.length;
    const pageIds = leads.map(l => l.id);
    const isAllPageSelected = pageIds.length > 0 && pageIds.every(id => selectAllMatching ? !excludedIds.includes(id) : selectedIds.includes(id));
    const isSomeSelected = pageIds.some(id => selectAllMatching ? !excludedIds.includes(id) : selectedIds.includes(id));

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col relative min-h-[500px]">
            <BulkAssignDialog 
                isOpen={showBulkAssign}
                onClose={() => setShowBulkAssign(false)}
                selectedCount={selectedIds.length}
                totalMatchingCount={totalCount - excludedIds.length}
                selectAllMatching={selectAllMatching}
                reps={reps}
                onConfirm={handleBulkAssignConfirm}
            />

            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Users size={20} className="text-indigo-600" /> Lead Assignment
                    </h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">Bulk reassign leads to relationship executives</p>
                </div>
                <button
                    onClick={fetchLeads}
                    className="self-start sm:self-center p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition-colors border border-gray-200"
                >
                    <RefreshCw size={18} className={isLoading ? 'animate-spin text-indigo-600' : ''} />
                </button>
            </div>

            <div className="p-4 bg-gray-50/50 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search leads..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setFilter('all'); setPage(1); }}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border ${filter === 'all' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        All Leads
                    </button>
                    <button
                        onClick={() => { setFilter('unassigned'); setPage(1); }}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border flex items-center gap-1.5 ${filter === 'unassigned' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <Filter size={14} /> Unassigned
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto relative">
                <LeadsTable 
                    leads={leads}
                    isLoading={isLoading}
                    selectedIds={selectAllMatching ? leads.map(l => l.id).filter(id => !excludedIds.includes(id)) : selectedIds}
                    onToggleSelect={toggleSelect}
                    onToggleSelectAll={toggleSelectAllPage}
                    isAllPageSelected={isAllPageSelected}
                    isSomeSelected={isSomeSelected}
                />
            </div>

            <div className="border-t border-gray-100 mt-auto">
                <LeadsPagination 
                    currentPage={page}
                    totalPages={Math.ceil(totalCount / limit)}
                    totalItems={totalCount}
                    pageSize={limit}
                    onPageChange={setPage}
                />
            </div>

            <BulkActionBar 
                selectedCount={actualSelectedCount}
                totalMatchingCount={totalCount}
                selectAllMatching={selectAllMatching}
                onClearSelection={() => { setSelectedIds([]); setSelectAllMatching(false); setExcludedIds([]); }}
                onSelectAllMatching={() => { setSelectAllMatching(true); setSelectedIds([]); setExcludedIds([]); }}
                onOpenAssign={() => setShowBulkAssign(true)}
            />
        </div>
    );
}
