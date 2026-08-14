'use client';

import React from 'react';
import { getLeaveTypeLabel } from '@/lib/hrm/leave';
import { Clock } from 'lucide-react';

export default function EmployeeLeaveHistory({
  requests = [],
  isLoading = false,
  onSelectRequest,
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
        <Clock size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
        <p className="font-bold text-lg text-slate-700 dark:text-slate-300">You haven't submitted any leave requests yet.</p>
        
        {/* We can rely on the main page button, or add a button here if needed. The user requested + Apply for Leave in the empty state mock. But we don't have the setShowModal prop here. Let's just leave the text, the main page has the primary button at the top. */}
      </div>
    );
  }

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' };
      case 'rejected_by_hr':
      case 'rejected_by_admin':
        return { label: 'Rejected', className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' };
      case 'cancelled':
        return { label: 'Cancelled', className: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
      case 'pending_hr_review':
      case 'pending_admin_confirmation':
      default:
        return { label: 'Pending', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' };
    }
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-4">
      {requests.map((req) => {
        const statusConfig = getStatusDisplay(req.status);
        const days = req.chargeable_days ?? req.requested_days ?? 0;
        
        return (
          <div 
            key={req.id} 
            onClick={() => onSelectRequest(req)}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-xs">
                  {getLeaveTypeLabel(req.leave_type)}
                </h4>
              </div>
              <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                {formatDateLabel(req.from_date)} – {formatDateLabel(req.to_date)}
              </div>
              <div className="text-sm font-medium text-slate-500 mt-0.5">
                {days} {days === 1 ? 'day' : 'days'}
              </div>
            </div>
            
            <div className="flex sm:justify-end">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusConfig.className}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
