'use client';

import React, { useState } from 'react';
import { Calendar, AlertCircle, Info, Send } from 'lucide-react';
import DateRangeBreakdown from '@/components/hrm/DateRangeBreakdown';
import { getLeaveTypeLabel } from '@/lib/hrm/leave';

export default function LeaveRequestForm({
  activePolicies = [],
  balances = {},
  holidays = [],
  onSubmit,
  submitting = false,
  isHRManager = false
}) {
  const defaultType = activePolicies.length > 0 ? activePolicies[0].leave_type_key : 'casual';

  const [form, setForm] = useState({
    leave_type: defaultType,
    from_date: '',
    to_date: '',
    reason: ''
  });

  // Selected policy details
  const selectedPolicy = activePolicies.find(p => p.leave_type_key === form.leave_type);
  const currentBalance = balances[form.leave_type];

  // Derive breakdown & warnings directly during render without useEffect
  let breakdown = null;
  let warnings = [];

  if (form.from_date && form.to_date && form.to_date >= form.from_date) {
    // Use pure date-string arithmetic to avoid JS Date timezone bugs.
    // Parsing 'YYYY-MM-DD' as local date via string split avoids UTC midnight drift.
    const parseLocalDate = (s) => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d); // local midnight, no UTC conversion
    };
    const addDays = (d, n) => {
      const r = new Date(d);
      r.setDate(r.getDate() + n);
      return r;
    };
    const toDateStr = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const start = parseLocalDate(form.from_date);
    const end = parseLocalDate(form.to_date);

    let calDays = 0;
    let weekendDays = 0;
    let holidayDays = 0;
    let chargeableDays = 0;
    const holidayNames = [];

    let curr = new Date(start);
    while (curr <= end) {
      calDays++;
      const dateStr = toDateStr(curr);
      const dow = curr.getDay(); // 0=Sun, 6=Sat (local day, no UTC drift)

      const matchedHol = holidays.find(h => h.holiday_date === dateStr && !h.is_optional);
      if (matchedHol) {
        holidayDays++;
        holidayNames.push({ date: dateStr, name: matchedHol.name });
      } else if (dow === 0 || dow === 6) {
        // Weekend (Sun=0, Sat=6) — matches organization_policy.weekend_days={0,6}
        weekendDays++;
      } else {
        chargeableDays++;
      }
      curr = addDays(curr, 1);
    }

    breakdown = {
      calendar_days: calDays,
      weekend_days: weekendDays,
      holiday_days: holidayDays,
      chargeable_days: chargeableDays,
      holidays: holidayNames,
      weekends: []
    };

    // Compute notice days using local dates
    const today = parseLocalDate(toDateStr(new Date()));
    const daysNotice = Math.round((start.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (selectedPolicy) {
      if (selectedPolicy.min_notice_days > 0 && daysNotice < selectedPolicy.min_notice_days) {
        warnings.push(`Requires at least ${selectedPolicy.min_notice_days} day(s) advance notice.`);
      }
      if (selectedPolicy.max_consecutive_days && calDays > selectedPolicy.max_consecutive_days) {
        warnings.push(`Exceeds maximum consecutive limit of ${selectedPolicy.max_consecutive_days} days.`);
      }
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.from_date || !form.to_date) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isHRManager && (
        <div className="p-3 bg-purple-50 border border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 rounded-lg text-xs text-purple-800 dark:text-purple-300 flex items-start gap-2">
          <Info size={16} className="mt-0.5 shrink-0 text-purple-600" />
          <div>
            <strong>HR Manager Self-Service Mode:</strong> Your leave request will bypass HR review and submit directly to <strong>Admin Confirmation</strong>.
          </div>
        </div>
      )}

      {/* Leave Type */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
          Leave Type
        </label>
        <select
          value={form.leave_type}
          onChange={e => setForm(prev => ({ ...prev, leave_type: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
        >
            {activePolicies.length > 0 ? (
              activePolicies.map(pol => {
                return (
                  <option key={pol.id} value={pol.leave_type_key}>
                    {pol.display_name}
                  </option>
                );
              })
          ) : (
            <option value="casual">Casual Leave</option>
          )}
        </select>

        {selectedPolicy && (
          <p className="text-[11px] text-slate-500 mt-1">
            {selectedPolicy.description || (selectedPolicy.is_paid ? 'Paid time off entitlement' : 'Unpaid leave')}
            {selectedPolicy.min_notice_days > 0 && ` · ${selectedPolicy.min_notice_days}d advance notice`}
            {selectedPolicy.max_consecutive_days && ` · Max ${selectedPolicy.max_consecutive_days} consecutive days`}
          </p>
        )}
      </div>

      {/* Dates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            From Date
          </label>
          <input
            type="date"
            value={form.from_date}
            onChange={e => setForm(prev => ({ ...prev, from_date: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            To Date
          </label>
          <input
            type="date"
            min={form.from_date}
            value={form.to_date}
            onChange={e => setForm(prev => ({ ...prev, to_date: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />
        </div>
      </div>

      {/* Breakdown preview */}
      {breakdown && (
        <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
          <DateRangeBreakdown breakdown={breakdown} />
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-1">
          {warnings.map((w, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <AlertCircle size={14} className="shrink-0 text-amber-600" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reason */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
          Reason / Context (Optional)
        </label>
        <textarea
          rows={3}
          value={form.reason}
          onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
          placeholder="State reason for time off..."
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
        />
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting || !form.from_date || !form.to_date || form.to_date < form.from_date}
          className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send size={14} /> Submit Leave Request
            </>
          )}
        </button>
      </div>
    </form>
  );
}
