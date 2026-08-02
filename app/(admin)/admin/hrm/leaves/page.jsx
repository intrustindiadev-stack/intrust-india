'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, CheckCircle2, Sliders, Settings, History, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

import AdminLeaveApprovalQueue from '@/components/admin/hrm/leaves/AdminLeaveApprovalQueue';
import LeavePolicyYearSelector from '@/components/admin/hrm/leaves/LeavePolicyYearSelector';
import LeavePolicyEditor from '@/components/admin/hrm/leaves/LeavePolicyEditor';
import LeaveBalanceAdjustmentDrawer from '@/components/admin/hrm/leaves/LeaveBalanceAdjustmentDrawer';
import LeaveRequestTable from '@/components/hrm/leaves/LeaveRequestTable';
import LeaveRequestDetailDrawer from '@/components/hrm/leaves/LeaveRequestDetailDrawer';
import LeaveReviewDialog from '@/components/hrm/leaves/LeaveReviewDialog';
import { getLeaveTypeLabel } from '@/lib/hrm/leave';

export default function AdminLeavesPage() {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'policy' | 'balances' | 'history'

  // Queue State
  const [queueRequests, setQueueRequests] = useState([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);

  // Policy Setup State
  const [policyYears, setPolicyYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [publishing, setPublishing] = useState(false);

  // Employee Balances State
  const [balances, setBalances] = useState([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [showAdjDrawer, setShowAdjDrawer] = useState(false);
  const [submittingAdj, setSubmittingAdj] = useState(false);
  const [empSearch, setEmpSearch] = useState('');

  // Request History State
  const [historyRequests, setHistoryRequests] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');

  // Review Modal State
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Detail Drawer State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  // 1. Fetch Admin Confirmation Queue
  const fetchQueue = useCallback(async () => {
    setIsLoadingQueue(true);
    try {
      const res = await fetch('/api/admin/hrm/leaves?status=pending_admin_confirmation', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load confirmation queue');
      setQueueRequests(json.data || []);
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setIsLoadingQueue(false);
    }
  }, []);

  // 2. Fetch Policy Setup
  const fetchPolicies = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/hrm/leave-policies', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const json = await res.json();
      if (res.ok) {
        setPolicyYears(json.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // 3. Fetch Balances
  const fetchBalances = useCallback(async () => {
    setIsLoadingBalances(true);
    try {
      const res = await fetch(`/api/admin/hrm/leave-balances?year=${selectedYear}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load employee balances');
      setBalances(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [selectedYear]);

  // 4. Fetch History
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/admin/hrm/leaves?status=${historyStatusFilter}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const json = await res.json();
      if (res.ok) {
        setHistoryRequests(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [historyStatusFilter]);

  useEffect(() => {
    fetchQueue();
    fetchPolicies();
  }, [fetchQueue, fetchPolicies]);

  useEffect(() => {
    if (activeTab === 'balances') fetchBalances();
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchBalances, fetchHistory]);

  // Admin Review Execution
  const handleAdminReviewSubmit = async ({ action, note }) => {
    if (!reviewingRequest) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/admin/hrm/leaves/${reviewingRequest.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note })
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error('Concurrency conflict: This request was already reviewed.');
          setReviewingRequest(null);
          fetchQueue();
          return;
        }
        throw new Error(json.error || 'Review failed');
      }

      toast.success(action === 'approve' ? 'Leave request approved' : 'Leave request rejected');
      setReviewingRequest(null);
      if (showDetailDrawer) setShowDetailDrawer(false);
      fetchQueue();
      if (activeTab === 'history') fetchHistory();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Create Policy Year
  const handleCreatePolicyYear = async (yearData) => {
    try {
      const res = await fetch('/api/admin/hrm/leave-policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yearData)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create policy year');

      toast.success(`Policy year ${yearData.policy_year} created`);
      fetchPolicies();
      setSelectedYear(yearData.policy_year);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Save Policy Row
  const handleSavePolicyRow = async (policyData) => {
    try {
      const res = await fetch('/api/admin/hrm/leave-policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policyData)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save leave policy');

      toast.success('Policy rule saved successfully');
      fetchPolicies();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Publish Policy Year
  const handlePublishYear = async (yearId) => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/hrm/leave-policies/${yearId}/publish`, {
        method: 'POST'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Publishing failed');

      toast.success(`Policy year published! Created ${json.data.created_balances} employee balances.`);
      fetchPolicies();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPublishing(false);
    }
  };

  // Apply Balance Adjustment
  const handleApplyAdjustment = async (balanceId, deltaDays, reason) => {
    setSubmittingAdj(true);
    try {
      const res = await fetch(`/api/admin/hrm/leave-balances/${balanceId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta_days: deltaDays, reason })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Adjustment failed');

      toast.success('Leave balance adjusted successfully');
      setShowAdjDrawer(false);
      fetchBalances();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingAdj(false);
    }
  };

  const selectedYearData = policyYears.find(y => y.policy_year === selectedYear);

  const filteredBalances = balances.filter(b =>
    !empSearch ||
    b.user_profiles?.full_name?.toLowerCase().includes(empSearch.toLowerCase()) ||
    b.user_profiles?.email?.toLowerCase().includes(empSearch.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50/50 dark:bg-slate-950 font-[family-name:var(--font-outfit)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Admin Leave Command Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure leave entitlements, review confirmation requests, and manage workforce balances.
          </p>
        </div>

        <button
          onClick={() => {
            if (activeTab === 'queue') fetchQueue();
            if (activeTab === 'policy') fetchPolicies();
            if (activeTab === 'balances') fetchBalances();
            if (activeTab === 'history') fetchHistory();
          }}
          aria-label="Refresh workspace"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={16} className={(isLoadingQueue || isLoadingBalances || isLoadingHistory) ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Primary Workspace Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'queue'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Confirmation Queue {queueRequests.length > 0 && <span className="ml-1.5 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px]">{queueRequests.length}</span>}
        </button>

        <button
          onClick={() => setActiveTab('policy')}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'policy'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Policy Setup & Entitlements
        </button>

        <button
          onClick={() => setActiveTab('balances')}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'balances'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Workforce Balances & Adjustments
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Workforce Request History
        </button>
      </div>

      {/* TAB 1: CONFIRMATION QUEUE */}
      {activeTab === 'queue' && (
        <AdminLeaveApprovalQueue
          requests={queueRequests}
          isLoading={isLoadingQueue}
          onSelectRequest={(req) => {
            setSelectedRequest(req);
            setShowDetailDrawer(true);
          }}
          onOpenReview={(req) => setReviewingRequest(req)}
        />
      )}

      {/* TAB 2: POLICY SETUP */}
      {activeTab === 'policy' && (
        <div className="space-y-6">
          <LeavePolicyYearSelector
            policyYears={policyYears}
            selectedYear={selectedYear}
            onSelectYear={setSelectedYear}
            onCreateYear={handleCreatePolicyYear}
            onPublishYear={handlePublishYear}
            publishing={publishing}
          />

          <LeavePolicyEditor
            policyYear={selectedYearData}
            policies={selectedYearData?.leave_policies || []}
            onSavePolicy={handleSavePolicyRow}
          />
        </div>
      )}

      {/* TAB 3: WORKFORCE BALANCES */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative max-w-xs w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                placeholder="Search employee name/email..."
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Year: {selectedYear} · Total Balances: {filteredBalances.length}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Entitled</th>
                    <th className="py-3 px-4">Used / Reserved</th>
                    <th className="py-3 px-4">Adjustment</th>
                    <th className="py-3 px-4">Available</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoadingBalances ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400">Loading workforce balances...</td></tr>
                  ) : filteredBalances.length > 0 ? (
                    filteredBalances.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{b.user_profiles?.full_name || 'Employee'}</span>
                          <span className="block text-[11px] text-slate-400">{b.user_profiles?.email || '—'}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {getLeaveTypeLabel(b.leave_type)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {b.entitled_days}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {b.used_days} / <span className={b.reserved_days > 0 ? 'text-amber-600 font-bold' : ''}>{b.reserved_days}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {b.adjustment_days > 0 ? `+${b.adjustment_days}` : b.adjustment_days}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                          {b.available_days}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedBalance(b);
                              setShowAdjDrawer(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors flex items-center gap-1 ml-auto"
                          >
                            <Sliders size={12} /> Adjust Balance
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400">No leave balances found for year {selectedYear}.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REQUEST HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all', 'pending_hr_review', 'pending_admin_confirmation', 'approved', 'rejected_by_hr', 'rejected_by_admin', 'cancelled'].map(st => (
              <button
                key={st}
                onClick={() => setHistoryStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap capitalize transition-all ${
                  historyStatusFilter === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <LeaveRequestTable
            requests={historyRequests}
            isLoading={isLoadingHistory}
            userRole="admin"
            onSelectRequest={(req) => {
              setSelectedRequest(req);
              setShowDetailDrawer(true);
            }}
            onReviewRequest={(req) => setReviewingRequest(req)}
          />
        </div>
      )}

      {/* Admin Review Dialog */}
      <LeaveReviewDialog
        isOpen={!!reviewingRequest}
        onClose={() => setReviewingRequest(null)}
        request={reviewingRequest}
        mode="admin"
        onSubmitReview={handleAdminReviewSubmit}
        submitting={submittingReview}
      />

      {/* Detail Drawer */}
      <LeaveRequestDetailDrawer
        isOpen={showDetailDrawer}
        onClose={() => setShowDetailDrawer(false)}
        request={selectedRequest}
        userRole="admin"
        onOpenReview={(req) => setReviewingRequest(req)}
      />

      {/* Adjustment Drawer */}
      <LeaveBalanceAdjustmentDrawer
        isOpen={showAdjDrawer}
        onClose={() => setShowAdjDrawer(false)}
        balanceRecord={selectedBalance}
        onApplyAdjustment={handleApplyAdjustment}
        submitting={submittingAdj}
      />
    </div>
  );
}
