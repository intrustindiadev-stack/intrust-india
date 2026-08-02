'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import Dialog from '@/components/hrm/Dialog';
import StatusBadge from '@/components/hrm/StatusBadge';
import LeaveWorkflowTimeline from './LeaveWorkflowTimeline';
import { getLeaveTypeLabel } from '@/lib/hrm/leave';

export default function LeaveReviewDialog({
  isOpen,
  onClose,
  request,
  mode = 'hr', // 'hr' or 'admin'
  onSubmitReview,
  submitting = false
}) {
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');

  if (!request) return null;

  const isHRMode = mode === 'hr';

  const handleAction = (action) => {
    setNoteError('');
    if (action === 'reject' && !note.trim()) {
      setNoteError('Rejection note is mandatory to explain reason to employee.');
      return;
    }
    onSubmitReview({ action, note: note.trim() || null });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isHRMode ? 'HR Manager Review' : 'Admin Final Confirmation'}
      description={`Review leave request for ${request.user_profiles?.full_name || 'Employee'}`}
    >
      <div className="space-y-4">
        {/* Detail Box */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {request.user_profiles?.full_name || 'Employee'}
            </span>
            <StatusBadge status={request.status} type="leave" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 pt-1">
            <div>Leave Type: <strong className="text-slate-900 dark:text-slate-100">{getLeaveTypeLabel(request.leave_type)}</strong></div>
            <div>Department: <strong className="text-slate-900 dark:text-slate-100">{request.user_profiles?.department || '—'}</strong></div>
            <div>Date Range: <strong className="font-mono text-slate-900 dark:text-slate-100">{request.from_date} → {request.to_date}</strong></div>
            <div>Chargeable Days: <strong className="font-mono text-slate-900 dark:text-slate-100">{request.chargeable_days ?? '?'} day(s)</strong></div>
          </div>

          {request.reason && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <span className="block font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Reason:</span>
              <p className="italic text-slate-700 dark:text-slate-300 mt-0.5">&quot;{request.reason}&quot;</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900">
          <LeaveWorkflowTimeline request={request} />
        </div>

        {/* Note input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Reviewer Note {isHRMode ? '(Required for Rejection)' : '(Required for Rejection)'}
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (e.target.value.trim()) setNoteError('');
            }}
            placeholder={isHRMode ? "Add note for Admin/Employee..." : "Add note for Employee..."}
            className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 text-xs focus:ring-2 outline-none resize-none ${
              noteError
                ? 'border-rose-400 focus:ring-rose-500'
                : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
            }`}
          />
          {noteError && (
            <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> {noteError}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleAction('reject')}
            disabled={submitting}
            className="flex-1 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 disabled:opacity-50"
          >
            <XCircle size={14} /> Reject
          </button>

          {isHRMode ? (
            <button
              type="button"
              onClick={() => handleAction('recommend')}
              disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-indigo-700 shadow-xs disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ArrowRight size={14} /> Recommend to Admin
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleAction('approve')}
              disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-700 shadow-xs disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={14} /> Final Approve
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
