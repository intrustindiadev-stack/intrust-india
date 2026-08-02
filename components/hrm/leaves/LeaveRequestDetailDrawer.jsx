'use client';

import React, { useEffect } from 'react';
import { X, Calendar, User, Clock, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import StatusBadge from '@/components/hrm/StatusBadge';
import LeaveWorkflowTimeline from './LeaveWorkflowTimeline';
import DateRangeBreakdown from '@/components/hrm/DateRangeBreakdown';
import { getLeaveTypeLabel, canEmployeeCancel, canHRReview, canAdminReview } from '@/lib/hrm/leave';

export default function LeaveRequestDetailDrawer({
  isOpen,
  onClose,
  request,
  userRole,
  userId,
  onCancel,
  onOpenReview
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !request) return null;

  const showCancel = request.employee_id === userId && canEmployeeCancel(request.status);
  const showHRReview = canHRReview(request, userRole, userId);
  const showAdminReview = canAdminReview(request.status, userRole);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Leave Request Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                Ref ID: {request.id.slice(0, 8)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Requester Profile */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="block font-bold text-sm text-slate-900 dark:text-slate-100">
                  {request.user_profiles?.full_name || 'Employee'}
                </span>
                <span className="block text-xs text-slate-500">
                  {request.user_profiles?.department || 'Workforce'} · {request.requester_role_snapshot || 'Employee'}
                </span>
              </div>
              <StatusBadge status={request.status} type="leave" />
            </div>

            {/* Leave Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Leave Information
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="block text-slate-400 font-semibold uppercase text-[10px]">Leave Type</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{getLeaveTypeLabel(request.leave_type)}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold uppercase text-[10px]">Policy Year</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{request.policy_year || 'Current'}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold uppercase text-[10px]">From Date</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{request.from_date}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold uppercase text-[10px]">To Date</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{request.to_date}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="block text-slate-400 font-semibold uppercase text-[10px]">Chargeable Work Days</span>
                  <span className="font-mono text-lg font-black text-slate-900 dark:text-slate-100">{request.chargeable_days ?? '?'} day(s)</span>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            {request.calendar_breakdown && (
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <DateRangeBreakdown breakdown={request.calendar_breakdown} />
              </div>
            )}

            {/* Reason */}
            {request.reason && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Reason / Notes
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 italic">
                  &quot;{request.reason}&quot;
                </p>
              </div>
            )}

            {/* Workflow Timeline */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900">
              <LeaveWorkflowTimeline request={request} />
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-2">
            {showCancel && (
              <button
                onClick={() => onCancel(request.id)}
                className="w-full py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
              >
                Cancel My Request
              </button>
            )}

            {showHRReview && (
              <button
                onClick={() => onOpenReview(request, 'hr')}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
              >
                Review Request (HR Stage)
              </button>
            )}

            {showAdminReview && (
              <button
                onClick={() => onOpenReview(request, 'admin')}
                className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                Review Request (Admin Stage)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
