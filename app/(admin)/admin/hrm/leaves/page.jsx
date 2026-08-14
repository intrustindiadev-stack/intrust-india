'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, CheckCircle2, History } from 'lucide-react';
import { toast } from 'react-hot-toast';

import AdminLeaveApprovalQueue from '@/components/admin/hrm/leaves/AdminLeaveApprovalQueue';
import LeaveRequestTable from '@/components/hrm/leaves/LeaveRequestTable';
import LeaveRequestDetailDrawer from '@/components/hrm/leaves/LeaveRequestDetailDrawer';
import LeaveReviewDialog from '@/components/hrm/leaves/LeaveReviewDialog';
import { getLeaveTypeLabel } from '@/lib/hrm/leave';

export default function AdminLeavesPage() {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'policy' | 'balances' | 'history'

  // Queue State
  const [queueRequests, setQueueRequests] = useState([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);

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

  // 1. Fetch Admin Confirmation Queue
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
  }, [fetchQueue]);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchHistory]);

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

  // Create Policy Year (removed)

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
            if (activeTab === 'history') fetchHistory();
          }}
          aria-label="Refresh workspace"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={16} className={(isLoadingQueue || isLoadingHistory) ? 'animate-spin' : ''} />
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

    </div>
  );
}
