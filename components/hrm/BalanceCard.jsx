import React from 'react';
import { getLeaveTypeLabel } from '@/lib/hrm/leave';

export default function BalanceCard({ leaveType, balance }) {
  const label = getLeaveTypeLabel(leaveType);

  if (!balance) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-t-2 border-t-slate-300 rounded-xl p-5 shadow-xs">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 w-fit">
          Balance Unavailable
        </p>
        <p className="text-[11px] text-slate-400 mt-2">Contact HR to configure policy entitlement.</p>
      </div>
    );
  }

  const entitled = Number(balance.entitled_days) || 0;
  const carried = Number(balance.carried_forward_days) || 0;
  const accrued = Number(balance.accrued_days) || 0;
  const adjustment = Number(balance.adjustment_days) || 0;
  const totalAllocated = entitled + carried + accrued + adjustment;

  const used = Number(balance.used_days) || 0;
  const reserved = Number(balance.reserved_days) || 0;
  const available = Math.max(0, totalAllocated - (used + reserved));

  const pct = totalAllocated > 0 ? Math.min(100, Math.round((available / totalAllocated) * 100)) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-t-2 border-t-emerald-500 rounded-xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
          {reserved > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
              {reserved} Pending
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-semibold text-slate-900 dark:text-slate-100 font-mono tracking-tight">{available}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">/ {totalAllocated} days available</span>
        </div>
      </div>

      <div>
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Used: <strong className="text-slate-700 dark:text-slate-200 font-mono">{used}</strong></span>
          <span>Reserved: <strong className="text-slate-700 dark:text-slate-200 font-mono">{reserved}</strong></span>
        </div>
      </div>
    </div>
  );
}
