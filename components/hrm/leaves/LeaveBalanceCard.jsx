'use client';

import React from 'react';
import { getLeaveTypeLabel, computeAvailableLeaveDays } from '@/lib/hrm/leave';

export default function LeaveBalanceCard({ balance, policy, onClick }) {
  if (!balance && !policy) return null;

  const displayName = policy?.display_name || getLeaveTypeLabel(balance?.leave_type || 'leave');
  const isPaid = policy ? policy.is_paid : true;
  const requiresBalance = policy ? policy.requires_balance : true;
  
  const entitled = Number(balance?.entitled_days ?? policy?.annual_entitlement ?? 0);
  const carried = Number(balance?.carried_forward_days ?? 0);
  const accrued = Number(balance?.accrued_days ?? 0);
  const adjustment = Number(balance?.adjustment_days ?? 0);
  const used = Number(balance?.used_days ?? 0);
  const reserved = Number(balance?.reserved_days ?? 0);

  const available = balance?.available_days !== undefined
    ? Number(balance.available_days)
    : computeAvailableLeaveDays(balance || { entitled_days: entitled }, policy?.allow_negative_balance);

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {displayName}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
              isPaid
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }`}>
              {isPaid ? 'Paid' : 'Unpaid'}
            </span>
            {!requiresBalance && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                Benefit / No Cap
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {requiresBalance ? available : '∞'}
          </span>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Available
          </span>
        </div>
      </div>

      {requiresBalance && (
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
          <div>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase">Entitled</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{entitled}</span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase">Reserved</span>
            <span className={`font-mono font-bold ${reserved > 0 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}`}>{reserved}</span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase">Used</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{used}</span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase">Adj / Carry</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{(adjustment + carried)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
