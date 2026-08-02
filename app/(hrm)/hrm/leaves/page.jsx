'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, UserCheck, Calendar, Info, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

import LeaveRequestTable from '@/components/hrm/leaves/LeaveRequestTable';
import LeaveRequestDetailDrawer from '@/components/hrm/leaves/LeaveRequestDetailDrawer';
import LeaveReviewDialog from '@/components/hrm/leaves/LeaveReviewDialog';
import LeaveBalanceCard from '@/components/hrm/leaves/LeaveBalanceCard';
import LeaveRequestForm from '@/components/hrm/leaves/LeaveRequestForm';
import Dialog from '@/components/hrm/Dialog';

export default function HRMLeavesPage() {
  const [activeTab, setActiveTab] = useState('team'); // 'team' or 'my_leave'

  // Team Queue State
  const [teamRequests, setTeamRequests] = useState([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending_hr_review');

  // My Leave State
  const [summaryData, setSummaryData] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [isLoadingMy, setIsLoadingMy] = useState(true);
  const [showSelfModal, setShowSelfModal] = useState(false);
  const [submittingSelf, setSubmittingSelf] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Modal / Drawer state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fetch logged in user identity
  useEffect(() => {
    fetch('/api/employee/leaves/summary')
      .then(r => r.json())
      .then(data => setSummaryData(data))
      .catch(console.error);
  }, []);

  const fetchTeamLeaves = useCallback(async () => {
    setIsLoadingTeam(true);
    try {
      const res = await fetch(`/api/hrm/leaves?status=${statusFilter}&search=${encodeURIComponent(search)}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load team leave queue');
      setTeamRequests(json.data || []);
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setIsLoadingTeam(false);
    }
  }, [statusFilter, search]);

  const fetchMyLeaves = useCallback(async () => {
    setIsLoadingMy(true);
    try {
      const [sumRes, reqRes] = await Promise.all([
        fetch('/api/employee/leaves/summary', { headers: { 'Cache-Control': 'no-cache' } }),
        fetch('/api/employee/leaves', { headers: { 'Cache-Control': 'no-cache' } })
      ]);

      if (sumRes.ok) setSummaryData(await sumRes.json());
      if (reqRes.ok) setMyRequests((await reqRes.json()).data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load my leave data');
    } finally {
      setIsLoadingMy(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'team') fetchTeamLeaves();
    else fetchMyLeaves();
  }, [activeTab, fetchTeamLeaves, fetchMyLeaves]);

  // HR Review execution
  const handleReviewSubmit = async ({ action, note }) => {
    if (!reviewingRequest) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/hrm/leaves/${reviewingRequest.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note })
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error('Concurrency conflict: This request was already processed by another reviewer.');
          setReviewingRequest(null);
          fetchTeamLeaves();
          return;
        }
        throw new Error(json.error || 'Review failed');
      }

      toast.success(
        action === 'recommend'
          ? 'Leave request recommended and forwarded to Admin'
          : 'Leave request rejected'
      );
      setReviewingRequest(null);
      if (showDrawer) setShowDrawer(false);
      fetchTeamLeaves();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Self leave submission (HR manager direct request to admin)
  const handleSelfSubmit = async (formData) => {
    setSubmittingSelf(true);
    try {
      const res = await fetch('/api/employee/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Leave submission failed');

      toast.success('Your leave request has been submitted directly to Admin for confirmation.');
      setShowSelfModal(false);
      fetchMyLeaves();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingSelf(false);
    }
  };

  const activePolicies = summaryData?.active_policies || [];
  const balances = summaryData?.balances || {};
  const holidays = summaryData?.holidays || [];

  const pendingCount = teamRequests.filter(r => r.status === 'pending_hr_review').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50/50 dark:bg-slate-950 font-[family-name:var(--font-outfit)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            HR Manager Leave Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review workforce leave requests or submit your own leave directly to Admin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={activeTab === 'team' ? fetchTeamLeaves : fetchMyLeaves}
            aria-label="Refresh leave requests"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={16} className={(isLoadingTeam || isLoadingMy) ? 'animate-spin' : ''} />
          </button>

          {activeTab === 'my_leave' && (
            <button
              onClick={() => setShowSelfModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus size={16} /> Request My Leave (Direct Admin)
            </button>
          )}
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('team')}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'team'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Team Approvals {pendingCount > 0 && <span className="ml-1.5 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px]">{pendingCount}</span>}
        </button>

        <button
          onClick={() => setActiveTab('my_leave')}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'my_leave'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          My Leave & Balances
        </button>
      </div>

      {/* TAB 1: TEAM APPROVALS */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          {/* Sub Filter & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['pending_hr_review', 'pending_admin_confirmation', 'approved', 'rejected_by_hr', 'all'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap capitalize transition-all ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <div className="relative max-w-xs w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search employee..."
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <LeaveRequestTable
            requests={teamRequests}
            isLoading={isLoadingTeam}
            userRole="hr_manager"
            onSelectRequest={(req) => {
              setSelectedRequest(req);
              setShowDrawer(true);
            }}
            onReviewRequest={(req) => setReviewingRequest(req)}
          />
        </div>
      )}

      {/* TAB 2: MY LEAVE */}
      {activeTab === 'my_leave' && (
        <div className="space-y-6">
          <div className="p-4 bg-purple-50 border border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 rounded-xl text-xs text-purple-900 dark:text-purple-300 flex items-start gap-3">
            <Info size={18} className="shrink-0 text-purple-600 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">HR Manager Self-Leave Policy</h3>
              <p className="mt-0.5">
                HR Managers cannot approve or review their own leave requests. Any time off requested by an HR Manager will go directly to <strong>Admin Confirmation</strong>.
              </p>
            </div>
          </div>

          {/* Balances */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activePolicies.map(pol => (
              <LeaveBalanceCard
                key={pol.id}
                policy={pol}
                balance={balances[pol.leave_type_key]}
              />
            ))}
          </div>

          {/* My Requests Table */}
          <LeaveRequestTable
            requests={myRequests}
            isLoading={isLoadingMy}
            onSelectRequest={(req) => {
              setSelectedRequest(req);
              setShowDrawer(true);
            }}
          />
        </div>
      )}

      {/* HR Review Modal */}
      <LeaveReviewDialog
        isOpen={!!reviewingRequest}
        onClose={() => setReviewingRequest(null)}
        request={reviewingRequest}
        mode="hr"
        onSubmitReview={handleReviewSubmit}
        submitting={submittingReview}
      />

      {/* Detail Drawer */}
      <LeaveRequestDetailDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        request={selectedRequest}
        userRole="hr_manager"
        onOpenReview={(req) => setReviewingRequest(req)}
      />

      {/* Self Leave Modal */}
      <Dialog
        isOpen={showSelfModal}
        onClose={() => setShowSelfModal(false)}
        title="Submit HR Manager Leave Request"
        description="Your request will be routed directly to Admin for confirmation."
      >
        <LeaveRequestForm
          activePolicies={activePolicies}
          balances={balances}
          holidays={holidays}
          isHRManager={true}
          onSubmit={handleSelfSubmit}
          submitting={submittingSelf}
        />
      </Dialog>
    </div>
  );
}
