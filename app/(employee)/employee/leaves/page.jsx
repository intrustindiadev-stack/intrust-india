'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Calendar, AlertCircle, Info, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

import LeaveBalanceCard from '@/components/hrm/leaves/LeaveBalanceCard';
import LeaveRequestForm from '@/components/hrm/leaves/LeaveRequestForm';
import LeaveRequestTable from '@/components/hrm/leaves/LeaveRequestTable';
import LeaveRequestDetailDrawer from '@/components/hrm/leaves/LeaveRequestDetailDrawer';
import Dialog from '@/components/hrm/Dialog';

export default function EmployeeLeavesPage() {
  const [summaryData, setSummaryData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  // Drawer state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Filter
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sumRes, reqRes] = await Promise.all([
        fetch('/api/employee/leaves/summary', { headers: { 'Cache-Control': 'no-cache' } }),
        fetch(`/api/employee/leaves?status=${statusFilter}`, { headers: { 'Cache-Control': 'no-cache' } })
      ]);

      if (sumRes.ok) {
        const sumJson = await sumRes.json();
        setSummaryData(sumJson);
      }

      if (reqRes.ok) {
        const reqJson = await reqRes.json();
        setRequests(reqJson.data || []);
        setPagination(reqJson.pagination || null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load leave data');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitLeave = async (formData) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/employee/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Leave submission failed');

      toast.success('Time off request submitted successfully');
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (id) => {
    setCancellingId(id);
    try {
      const res = await fetch(`/api/employee/leaves/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by employee' })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Cancellation failed');

      toast.success('Leave request cancelled');
      if (showDrawer) setShowDrawer(false);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  const isConfigured = summaryData?.is_policy_configured ?? true;
  const activePolicies = summaryData?.active_policies || [];
  const balances = summaryData?.balances || {};
  const holidays = summaryData?.holidays || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50/50 dark:bg-slate-950 font-[family-name:var(--font-outfit)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            My Time Off & Leaves
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Request leave, check live entitlement balances, and track approval progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            aria-label="Refresh leave data"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {isConfigured && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus size={16} /> Request Time Off
            </button>
          )}
        </div>
      </div>

      {/* Non-configured Alert */}
      {!isConfigured && (
        <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 rounded-xl p-5 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">Leave Policy Not Configured</h3>
            <p className="mt-1">
              Leave policy has not yet been configured or published by the Admin for the current policy year. You will be able to request time off as soon as HR publishes the policy.
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Balance Cards Grid */}
      {isConfigured && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activePolicies.map(pol => (
            <LeaveBalanceCard
              key={pol.id}
              policy={pol}
              balance={balances[pol.leave_type_key]}
            />
          ))}
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', 'pending_hr_review', 'pending_admin_confirmation', 'approved', 'rejected_by_hr', 'rejected_by_admin', 'cancelled'].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap capitalize transition-all ${
              statusFilter === st
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Request History Table */}
      <LeaveRequestTable
        requests={requests}
        isLoading={isLoading}
        onSelectRequest={(req) => {
          setSelectedRequest(req);
          setShowDrawer(true);
        }}
        onCancelRequest={handleCancelRequest}
      />

      {/* Submit Leave Modal */}
      <Dialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Request Time Off"
        description="Select leave type and dates to submit for multi-stage approval."
      >
        <LeaveRequestForm
          activePolicies={activePolicies}
          balances={balances}
          holidays={holidays}
          onSubmit={handleSubmitLeave}
          submitting={submitting}
        />
      </Dialog>

      {/* Detail Drawer */}
      <LeaveRequestDetailDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        request={selectedRequest}
        onCancel={handleCancelRequest}
      />
    </div>
  );
}
