'use client';

import React from 'react';
import { CheckCircle2, XCircle, Clock, ShieldCheck, UserCheck } from 'lucide-react';
import { formatDateIST } from '@/lib/hrm/date';

export default function LeaveWorkflowTimeline({ request }) {
  if (!request) return null;

  const isHRManagerRequest = request.requester_role_snapshot === 'hr_manager';
  const actions = request.leave_request_actions || [];

  return (
    <div className="space-y-4 py-2">
      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
        Approval Workflow Progress
      </h4>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">

        {/* Step 1: Submission */}
        <div className="relative flex items-start gap-3">
          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={12} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                1. Request Submitted
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {formatDateIST(request.created_at)}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Submitted by <strong className="text-slate-800 dark:text-slate-200">{request.user_profiles?.full_name || 'Employee'}</strong>
              {isHRManagerRequest && <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-purple-50 text-purple-700 border border-purple-200 rounded">HR Manager Direct</span>}
            </p>
            {request.reason && (
              <p className="text-xs italic text-slate-500 mt-1 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">
                &quot;{request.reason}&quot;
              </p>
            )}
          </div>
        </div>

        {/* Step 2: HR Review (Skipped for HR manager self-request) */}
        {isHRManagerRequest ? (
          <div className="relative flex items-start gap-3">
            <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/60 border border-purple-400 flex items-center justify-center text-purple-600">
              <ShieldCheck size={12} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  2. HR Stage Bypassed
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                HR Manager requests go directly to Admin confirmation (Self-review restricted).
              </p>
            </div>
          </div>
        ) : (
          <div className="relative flex items-start gap-3">
            <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
              request.status === 'pending_hr_review'
                ? 'bg-amber-100 border border-amber-500 text-amber-600 animate-pulse'
                : request.status === 'rejected_by_hr'
                ? 'bg-rose-100 border border-rose-500 text-rose-600'
                : 'bg-emerald-100 border border-emerald-500 text-emerald-600'
            }`}>
              {request.status === 'pending_hr_review' ? <Clock size={12} /> : request.status === 'rejected_by_hr' ? <XCircle size={12} /> : <UserCheck size={12} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  2. HR Manager Review
                </span>
                {request.hr_reviewed_at && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {formatDateIST(request.hr_reviewed_at)}
                  </span>
                )}
              </div>

              {request.status === 'pending_hr_review' && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 font-medium">
                  Awaiting HR Manager recommendation or rejection...
                </p>
              )}

              {request.status === 'rejected_by_hr' && (
                <div className="mt-1 space-y-1">
                  <p className="text-xs font-semibold text-rose-700">Rejected by HR</p>
                  {request.hr_review_note && (
                    <p className="text-xs text-slate-600 bg-rose-50 border border-rose-200 p-2 rounded">
                      Note: &quot;{request.hr_review_note}&quot;
                    </p>
                  )}
                </div>
              )}

              {['pending_admin_confirmation', 'approved', 'rejected_by_admin'].includes(request.status) && (
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    Recommended to Admin {request.hr_reviewer?.full_name ? `by ${request.hr_reviewer.full_name}` : ''}
                  </p>
                  {request.hr_review_note && (
                    <p className="text-xs italic text-slate-500 bg-slate-50 dark:bg-slate-900 p-2 rounded">
                      &quot;{request.hr_review_note}&quot;
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Admin Confirmation */}
        {request.status !== 'rejected_by_hr' && request.status !== 'cancelled' && (
          <div className="relative flex items-start gap-3">
            <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
              request.status === 'pending_admin_confirmation'
                ? 'bg-indigo-100 border border-indigo-500 text-indigo-600 animate-pulse'
                : request.status === 'approved'
                ? 'bg-emerald-100 border border-emerald-500 text-emerald-600'
                : 'bg-rose-100 border border-rose-500 text-rose-600'
            }`}>
              {request.status === 'pending_admin_confirmation' ? <Clock size={12} /> : request.status === 'approved' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  3. Admin Final Confirmation
                </span>
                {request.admin_reviewed_at && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {formatDateIST(request.admin_reviewed_at)}
                  </span>
                )}
              </div>

              {request.status === 'pending_admin_confirmation' && (
                <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5 font-medium">
                  Awaiting final Admin approval or rejection...
                </p>
              )}

              {request.status === 'approved' && (
                <div className="mt-1 space-y-1">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Approved by Admin {request.admin_reviewer?.full_name ? `(${request.admin_reviewer.full_name})` : ''}
                  </p>
                  {request.admin_review_note && (
                    <p className="text-xs text-slate-600 bg-emerald-50 border border-emerald-200 p-2 rounded">
                      Note: &quot;{request.admin_review_note}&quot;
                    </p>
                  )}
                </div>
              )}

              {request.status === 'rejected_by_admin' && (
                <div className="mt-1 space-y-1">
                  <p className="text-xs font-semibold text-rose-700">
                    Rejected by Admin
                  </p>
                  {request.admin_review_note && (
                    <p className="text-xs text-slate-600 bg-rose-50 border border-rose-200 p-2 rounded">
                      Note: &quot;{request.admin_review_note}&quot;
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step Cancelled */}
        {request.status === 'cancelled' && (
          <div className="relative flex items-start gap-3">
            <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-slate-100 border border-slate-400 flex items-center justify-center text-slate-600">
              <XCircle size={12} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Request Cancelled
                </span>
                {request.cancelled_at && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {formatDateIST(request.cancelled_at)}
                  </span>
                )}
              </div>
              {request.cancel_reason && (
                <p className="text-xs text-slate-500 italic mt-0.5">&quot;{request.cancel_reason}&quot;</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
