'use client';

import React, { useState } from 'react';
import { getLeaveTypeLabel } from '@/lib/hrm/leave';

export default function EmployeeLeaveRequestForm({
  activePolicies = [],
  balances = {},
  onSubmit,
  submitting = false,
  onCancel
}) {
  const defaultType = activePolicies.length > 0 ? activePolicies[0].leave_type_key : 'casual';

  const [form, setForm] = useState({
    leave_type: defaultType,
    from_date: '',
    to_date: '',
    reason: ''
  });

  const selectedPolicy = activePolicies.find(p => p.leave_type_key === form.leave_type);
  const displayName = selectedPolicy?.display_name || getLeaveTypeLabel(form.leave_type);

  // Calculate days for the simple summary
  let requestedDays = 0;
  if (form.from_date && form.to_date && form.to_date >= form.from_date) {
    const parseLocalDate = (s) => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    const start = parseLocalDate(form.from_date);
    const end = parseLocalDate(form.to_date);
    requestedDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.from_date || !form.to_date) return;
    onSubmit(form);
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden max-h-[90vh]">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Apply for Leave
        </h2>
      </div>

      {/* Scrollable Body */}
      <div className="p-6 overflow-y-auto flex-1 space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Leave Type
          </label>
          <div className="relative">
            <select
              value={form.leave_type}
              onChange={e => setForm(prev => ({ ...prev, leave_type: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer text-slate-900 dark:text-slate-100"
            >
              {activePolicies.length > 0 ? (
                activePolicies.map(pol => (
                  <option key={pol.id} value={pol.leave_type_key}>
                    {pol.display_name}
                  </option>
                ))
              ) : (
                <option value="casual">Casual Leave</option>
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={form.from_date}
              onChange={e => setForm(prev => ({ ...prev, from_date: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-slate-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              min={form.from_date}
              value={form.to_date}
              onChange={e => setForm(prev => ({ ...prev, to_date: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-slate-100"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Reason (Optional)
          </label>
          <textarea
            rows={3}
            value={form.reason}
            onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="Why do you need time off?"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>

        {requestedDays > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
            <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-2">Request Summary</h4>
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{displayName}</p>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                  {formatDateLabel(form.from_date)} → {formatDateLabel(form.to_date)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-indigo-700 dark:text-indigo-400">{requestedDays}</p>
                <p className="text-xs font-semibold text-indigo-600/70 dark:text-indigo-400/70">days</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-950/50">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !form.from_date || !form.to_date || form.to_date < form.from_date}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] flex justify-center"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Submit Leave Request'
          )}
        </button>
      </div>
    </form>
  );
}
