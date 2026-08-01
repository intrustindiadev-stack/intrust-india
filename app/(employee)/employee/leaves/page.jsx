'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Calendar, XCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

import BalanceCard from '@/components/hrm/BalanceCard';
import StatusBadge from '@/components/hrm/StatusBadge';
import DataTable from '@/components/hrm/DataTable';
import Dialog from '@/components/hrm/Dialog';
import DateRangeBreakdown from '@/components/hrm/DateRangeBreakdown';
import { CANONICAL_LEAVE_TYPES, LEAVE_TYPE_LABELS } from '@/lib/hrm/validation';
import { formatDateIST } from '@/lib/hrm/date';

export default function EmployeeLeavesPage() {
  const [summaryData, setSummaryData] = useState(null);
  const [leavesData, setLeavesData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  // Form state
  const [form, setForm] = useState({
    leave_type: 'casual',
    from_date: '',
    to_date: '',
    reason: ''
  });

  const [previewBreakdown, setPreviewBreakdown] = useState(null);

  const fetchSummaryAndLeaves = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sumRes, levRes] = await Promise.all([
        fetch('/api/employee/leaves/summary', { headers: { 'Cache-Control': 'no-cache' } }),
        fetch('/api/employee/leaves', { headers: { 'Cache-Control': 'no-cache' } })
      ]);

      if (sumRes.ok) {
        const sumJson = await sumRes.json();
        setSummaryData(sumJson);
      }

      if (levRes.ok) {
        const levJson = await levRes.json();
        setLeavesData(levJson.data || []);
        setPagination(levJson.pagination || null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load leave data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaryAndLeaves();
  }, [fetchSummaryAndLeaves]);

  // Compute breakdown preview on date selection
  useEffect(() => {
    if (form.from_date && form.to_date && form.to_date >= form.from_date) {
      const start = new Date(form.from_date);
      const end = new Date(form.to_date);

      let calDays = 0;
      let weekendDays = 0;
      let holidayDays = 0;
      let chargeableDays = 0;

      const holidays = summaryData?.holidays || [];
      const holidayNames = [];

      const curr = new Date(start);
      while (curr <= end) {
        calDays++;
        const dateStr = curr.toISOString().split('T')[0];
        const dow = curr.getDay(); // 0=Sun, 6=Sat

        const matchedHol = holidays.find((h) => h.holiday_date === dateStr);
        if (matchedHol) {
          holidayDays++;
          holidayNames.push({ date: dateStr, name: matchedHol.name });
        } else if (dow === 0 || dow === 6) {
          weekendDays++;
        } else {
          chargeableDays++;
        }
        curr.setDate(curr.getDate() + 1);
      }

      setPreviewBreakdown({
        calendar_days: calDays,
        weekend_days: weekendDays,
        holiday_days: holidayDays,
        chargeable_days: chargeableDays,
        holidays: holidayNames,
        weekends: []
      });
    } else {
      setPreviewBreakdown(null);
    }
  }, [form.from_date, form.to_date, summaryData]);

  const handleSubmit = async () => {
    if (!form.from_date || !form.to_date) {
      toast.error('Please select valid start and end dates');
      return;
    }
    if (form.to_date < form.from_date) {
      toast.error('End date cannot be earlier than start date');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/employee/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Leave submission failed');

      toast.success('Time off request submitted successfully');
      setShowModal(false);
      setForm({ leave_type: 'casual', from_date: '', to_date: '', reason: '' });
      fetchSummaryAndLeaves();
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
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
      fetchSummaryAndLeaves();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  const balances = summaryData?.balances || {};
  const todayStr = new Date().toISOString().split('T')[0];

  const columns = [
    {
      header: 'Submitted',
      key: 'created_at',
      render: (row) => (
        <span className="font-mono text-slate-500 text-xs">{formatDateIST(row.created_at)}</span>
      )
    },
    {
      header: 'Leave Type',
      key: 'leave_type',
      render: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {LEAVE_TYPE_LABELS[row.leave_type] || row.leave_type}
        </span>
      )
    },
    {
      header: 'Date Range',
      key: 'dates',
      render: (row) => (
        <span className="font-mono text-slate-700 dark:text-slate-300">
          {row.from_date} → {row.to_date}
        </span>
      )
    },
    {
      header: 'Chargeable Days',
      key: 'chargeable_days',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
          {row.chargeable_days ?? row.requested_days ?? '—'}
        </span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} type="leave" />
    },
    {
      header: 'Review Note',
      key: 'review_note',
      render: (row) => (
        <span className="text-xs text-slate-500 truncate max-w-xs">{row.review_note || '—'}</span>
      )
    },
    {
      header: 'Action',
      key: 'action',
      render: (row) => row.status === 'pending' ? (
        <button
          onClick={() => handleCancel(row.id)}
          disabled={cancellingId === row.id}
          className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-800 transition-colors"
        >
          {cancellingId === row.id ? 'Cancelling...' : 'Cancel'}
        </button>
      ) : <span className="text-xs text-slate-400">—</span>
    }
  ];

  const mobileCardRender = (row) => (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="font-bold text-slate-900">{LEAVE_TYPE_LABELS[row.leave_type] || row.leave_type}</span>
        <StatusBadge status={row.status} type="leave" />
      </div>
      <div className="text-slate-600">Range: <strong className="font-mono text-slate-900">{row.from_date} → {row.to_date}</strong></div>
      <div className="text-slate-600">Days: <strong className="font-mono text-slate-900">{row.chargeable_days ?? '—'}</strong></div>
      {row.status === 'pending' && (
        <div className="pt-2">
          <button onClick={() => handleCancel(row.id)} className="w-full py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
            Cancel Request
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50/50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Time Off & Leave Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Policy Year: <strong className="font-mono text-slate-700 dark:text-slate-300">{summaryData?.policy_year || new Date().getFullYear()}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSummaryAndLeaves}
            disabled={isLoading}
            aria-label="Refresh leave summary"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-xs"
          >
            <Plus size={14} /> Request Time Off
          </button>
        </div>
      </div>

      {/* Leave Balance Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BalanceCard leaveType="casual" balance={balances['casual']} />
        <BalanceCard leaveType="sick" balance={balances['sick']} />
        <BalanceCard leaveType="earned" balance={balances['earned']} />
      </div>

      {/* Leave Request Dialog */}
      <Dialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Request Time Off"
        description="Select canonical leave type and dates for policy breakdown."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Leave Type
            </label>
            <select
              value={form.leave_type}
              onChange={(e) => setForm((p) => ({ ...p, leave_type: e.target.value }))}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              {CANONICAL_LEAVE_TYPES.map((lt) => (
                <option key={lt} value={lt}>{LEAVE_TYPE_LABELS[lt]}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                min={todayStr}
                value={form.from_date}
                onChange={(e) => setForm((p) => ({ ...p, from_date: e.target.value }))}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                End Date
              </label>
              <input
                type="date"
                min={form.from_date || todayStr}
                value={form.to_date}
                onChange={(e) => setForm((p) => ({ ...p, to_date: e.target.value }))}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <DateRangeBreakdown breakdown={previewBreakdown} />

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Reason <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              placeholder="Reason for time off request..."
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </Dialog>

      {/* History Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Leave History</h2>
        <DataTable
          columns={columns}
          data={leavesData}
          isLoading={isLoading}
          emptyMessage="No leave requests submitted yet."
          mobileCardRender={mobileCardRender}
          pagination={pagination}
          onPageChange={() => fetchSummaryAndLeaves()}
        />
      </div>
    </div>
  );
}
