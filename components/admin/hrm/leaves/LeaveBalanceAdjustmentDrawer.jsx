'use client';

import React, { useState } from 'react';
import { X, Sliders, AlertCircle } from 'lucide-react';
import { getLeaveTypeLabel } from '@/lib/hrm/leave';

export default function LeaveBalanceAdjustmentDrawer({
  isOpen,
  onClose,
  balanceRecord,
  onApplyAdjustment,
  submitting = false
}) {
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setDelta('');
    setReason('');
    setError('');
    onClose();
  };

  if (!isOpen || !balanceRecord) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const numDelta = Number(delta);
    if (!delta || isNaN(numDelta) || numDelta === 0) {
      setError('Please enter a valid non-zero adjustment delta.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Adjustment reason is mandatory (minimum 3 characters).');
      return;
    }

    onApplyAdjustment(balanceRecord.id, numDelta, reason.trim());
  };

  const currentAvailable = Number(balanceRecord.available_days ?? 0);
  const projectedAvailable = currentAvailable + (Number(delta) || 0);

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
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <Sliders size={16} className="text-indigo-600" />
                Adjust Employee Leave Balance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {balanceRecord.user_profiles?.full_name || 'Employee'} · {getLeaveTypeLabel(balanceRecord.leave_type)}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* Current Metrics */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Current Accounting Metrics
              </span>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="block text-slate-400 text-[10px] uppercase font-semibold">Entitled</span>
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">{balanceRecord.entitled_days}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="block text-slate-400 text-[10px] uppercase font-semibold">Current Adj</span>
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">{balanceRecord.adjustment_days || 0}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="block text-slate-400 text-[10px] uppercase font-semibold">Used / Reserved</span>
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">{balanceRecord.used_days} / {balanceRecord.reserved_days}</span>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <span className="block text-indigo-600 dark:text-indigo-400 text-[10px] uppercase font-bold">Net Available</span>
                  <span className="font-mono text-base font-black text-indigo-700 dark:text-indigo-300">{currentAvailable}</span>
                </div>
              </div>
            </div>

            {/* Delta Input */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Adjustment Delta Days (+ / -)
              </label>
              <input
                type="number"
                step="0.5"
                value={delta}
                onChange={e => setDelta(e.target.value)}
                placeholder="e.g. +2.5 or -1.0"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Positive values add days; negative values deduct days.
              </p>
            </div>

            {/* Projected result preview */}
            {delta && !isNaN(Number(delta)) && Number(delta) !== 0 && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 flex items-center justify-between">
                <span className="font-semibold">Projected Net Available:</span>
                <span className="font-mono font-black text-sm">{projectedAvailable} day(s)</span>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Mandatory Reason / Audit Note
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Provide explicit operational reason for this adjustment..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Applying...' : 'Apply Adjustment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
