'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Calendar, AlertCircle, Info, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

import EmployeeLeaveRequestForm from '@/components/employee/leaves/EmployeeLeaveRequestForm';
import EmployeeLeaveHistory from '@/components/employee/leaves/EmployeeLeaveHistory';
import EmployeeLeaveDetailModal from '@/components/employee/leaves/EmployeeLeaveDetailModal';
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Leave
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your time off and track your leave requests.
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
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm flex items-center gap-2 transition-colors"
            >
              <Plus size={18} /> Apply for Leave
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





      {/* Request History */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-tight">My Leave Requests</h3>
        <EmployeeLeaveHistory
          requests={requests}
          isLoading={isLoading}
          onSelectRequest={(req) => {
            setSelectedRequest(req);
            setShowDrawer(true);
          }}
        />
      </div>

      {/* Submit Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <EmployeeLeaveRequestForm
              activePolicies={activePolicies}
              balances={balances}
              onSubmit={handleSubmitLeave}
              submitting={submitting}
              onCancel={() => setShowModal(false)}
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDrawer && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <EmployeeLeaveDetailModal
              request={selectedRequest}
              onClose={() => setShowDrawer(false)}
              onCancel={handleCancelRequest}
              userId={summaryData?.employee_id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
