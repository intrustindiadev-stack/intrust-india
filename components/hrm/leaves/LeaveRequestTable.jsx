'use client';

import React from 'react';
import StatusBadge from '@/components/hrm/StatusBadge';
import { getLeaveTypeLabel, canEmployeeCancel } from '@/lib/hrm/leave';
import { formatDateIST } from '@/lib/hrm/date';
import { Eye, Clock } from 'lucide-react';

export default function LeaveRequestTable({
  requests = [],
  isLoading = false,
  onSelectRequest,
  onCancelRequest,
  onReviewRequest,
  userRole,
  userId
}) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500 space-y-3">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Loading leave requests...</p>
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
        <Clock size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
        <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No leave requests found</p>
        <p className="text-xs text-slate-400 mt-1">Leave requests matching your filter criteria will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Leave Type</th>
              <th className="py-3 px-4">Date Range</th>
              <th className="py-3 px-4">Days</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {requests.map((req) => {
              const canCancel = req.employee_id === userId && canEmployeeCancel(req.status);
              const isHRReviewable = userRole === 'hr_manager' && req.status === 'pending_hr_review' && req.employee_id !== userId && req.requester_role_snapshot !== 'hr_manager';
              const isAdminReviewable = ['admin', 'super_admin'].includes(userRole) && req.status === 'pending_admin_confirmation';

              return (
                <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      {req.user_profiles?.full_name || 'Employee'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {req.user_profiles?.department || 'Workforce'}
                      {req.requester_role_snapshot === 'hr_manager' && (
                        <span className="ml-1 text-[10px] bg-purple-50 text-purple-700 px-1 py-0.2 rounded border border-purple-200">HR Direct</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                    {getLeaveTypeLabel(req.leave_type)}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                    {req.from_date} → {req.to_date}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {req.chargeable_days ?? req.requested_days ?? '—'}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={req.status} type="leave" />
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => onSelectRequest(req)}
                      aria-label="View request details"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>

                    {canCancel && (
                      <button
                        onClick={() => onCancelRequest(req.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                    )}

                    {isHRReviewable && (
                      <button
                        onClick={() => onReviewRequest(req, 'hr')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-xs"
                      >
                        Review
                      </button>
                    )}

                    {isAdminReviewable && (
                      <button
                        onClick={() => onReviewRequest(req, 'admin')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-xs"
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {requests.map((req) => {
          const canCancel = req.employee_id === userId && canEmployeeCancel(req.status);
          const isHRReviewable = userRole === 'hr_manager' && req.status === 'pending_hr_review' && req.employee_id !== userId;
          const isAdminReviewable = ['admin', 'super_admin'].includes(userRole) && req.status === 'pending_admin_confirmation';

          return (
            <div key={req.id} className="p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {req.user_profiles?.full_name || 'Employee'}
                </span>
                <StatusBadge status={req.status} type="leave" />
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                Type: <strong>{getLeaveTypeLabel(req.leave_type)}</strong>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                Range: <span className="font-mono">{req.from_date} → {req.to_date}</span> ({req.chargeable_days ?? '?'}d)
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => onSelectRequest(req)}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-md"
                >
                  Details
                </button>
                {canCancel && (
                  <button
                    onClick={() => onCancelRequest(req.id)}
                    className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 font-semibold rounded-md"
                  >
                    Cancel
                  </button>
                )}
                {isHRReviewable && (
                  <button
                    onClick={() => onReviewRequest(req, 'hr')}
                    className="px-3 py-1 bg-indigo-600 text-white font-semibold rounded-md"
                  >
                    Review
                  </button>
                )}
                {isAdminReviewable && (
                  <button
                    onClick={() => onReviewRequest(req, 'admin')}
                    className="px-3 py-1 bg-emerald-600 text-white font-semibold rounded-md"
                  >
                    Review
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
