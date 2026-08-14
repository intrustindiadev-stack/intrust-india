'use client';

import React from 'react';
import { getLeaveTypeLabel, canEmployeeCancel } from '@/lib/hrm/leave';

export default function EmployeeLeaveDetailModal({
  request,
  onClose,
  onCancel,
  userId
}) {
  if (!request) return null;

  const showCancel = request.employee_id === userId && canEmployeeCancel(request.status);

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', className: 'bg-emerald-100 text-emerald-800' };
      case 'rejected_by_hr':
      case 'rejected_by_admin':
        return { label: 'Rejected', className: 'bg-rose-100 text-rose-800' };
      case 'cancelled':
        return { label: 'Cancelled', className: 'bg-slate-100 text-slate-800' };
      case 'pending_hr_review':
      case 'pending_admin_confirmation':
      default:
        return { label: 'Pending', className: 'bg-amber-100 text-amber-800' };
    }
  };

  const statusConfig = getStatusDisplay(request.status);

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const appliedOn = request.created_at ? new Date(request.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const days = request.chargeable_days ?? request.requested_days ?? 0;

  // Extract comments
  let approverComment = null;
  let rejectionReason = null;

  if (request.leave_request_actions && request.leave_request_actions.length > 0) {
    const sortedActions = [...request.leave_request_actions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const rejectAction = sortedActions.find(a => a.action_type === 'rejected' || a.action_type === 'reject');
    if (rejectAction) {
      rejectionReason = rejectAction.note;
    } else {
      const approveAction = sortedActions.find(a => a.action_type === 'approved' || a.action_type === 'approve');
      if (approveAction) {
        approverComment = approveAction.note;
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden max-h-[90vh]">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-2">
            Leave Details
          </h2>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 overflow-y-auto flex-1 space-y-6">
        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
          <div>
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Leave Type</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{getLeaveTypeLabel(request.leave_type)}</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Duration</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{days} {days === 1 ? 'day' : 'days'}</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatDateLabel(request.from_date)}</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">End Date</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatDateLabel(request.to_date)}</span>
          </div>
          {appliedOn && (
            <div className="col-span-2">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Applied On</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{appliedOn}</span>
            </div>
          )}
        </div>

        {request.reason && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reason</span>
            <p className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">
              {request.reason}
            </p>
          </div>
        )}

        {rejectionReason && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">Rejection Reason</span>
            <p className="text-sm text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-100 dark:border-rose-900/50">
              {rejectionReason}
            </p>
          </div>
        )}

        {!rejectionReason && approverComment && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Approver Comment</span>
            <p className="text-sm text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
              {approverComment}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-950/50">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          Close
        </button>
        {showCancel && (
          <button
            onClick={() => onCancel(request.id)}
            className="px-6 py-3 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-sm font-bold transition-colors"
          >
            Cancel Request
          </button>
        )}
      </div>
    </div>
  );
}
