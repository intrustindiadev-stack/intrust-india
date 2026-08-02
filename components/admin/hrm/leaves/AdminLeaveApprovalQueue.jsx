'use client';

import React from 'react';
import StatusBadge from '@/components/hrm/StatusBadge';
import { getLeaveTypeLabel } from '@/lib/hrm/leave';
import { formatDateIST } from '@/lib/hrm/date';
import { ShieldCheck, UserCheck, Eye, CheckCircle2, XCircle } from 'lucide-react';

export default function AdminLeaveApprovalQueue({
  requests = [],
  isLoading = false,
  onSelectRequest,
  onOpenReview
}) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500 space-y-3">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Loading confirmation queue...</p>
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
        <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-3" />
        <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No pending admin confirmation requests</p>
        <p className="text-xs text-slate-400 mt-1">All leave requests requiring final admin approval have been processed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const isHRManagerRequest = req.requester_role_snapshot === 'hr_manager';

        return (
          <div
            key={req.id}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {req.user_profiles?.full_name || 'Employee'}
                </span>
                <StatusBadge status={req.status} type="leave" />
                <span className="text-xs font-semibold text-slate-500">
                  ({getLeaveTypeLabel(req.leave_type)})
                </span>

                {/* Queue Source Badge */}
                {isHRManagerRequest ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                    <ShieldCheck size={11} /> HR Manager Direct Request
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                    <UserCheck size={11} /> HR Recommended
                  </span>
                )}
              </div>

              <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                Range: <strong className="text-slate-900 dark:text-slate-100">{req.from_date} → {req.to_date}</strong> · Chargeable Days: <strong>{req.chargeable_days ?? '?'}</strong>
              </div>

              {req.hr_review_note && (
                <div className="text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/30 p-2 rounded border border-indigo-100 dark:border-indigo-900/40">
                  HR Note: &quot;{req.hr_review_note}&quot;
                </div>
              )}

              {req.reason && !req.hr_review_note && (
                <p className="text-xs italic text-slate-500">&quot;{req.reason}&quot;</p>
              )}
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => onSelectRequest(req)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors"
              >
                <Eye size={13} /> View Timeline
              </button>
              <button
                onClick={() => onOpenReview(req, 'admin')}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-xs"
              >
                Review Request
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
