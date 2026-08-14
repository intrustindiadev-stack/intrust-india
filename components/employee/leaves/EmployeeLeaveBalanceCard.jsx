'use client';

import React from 'react';
import { getLeaveTypeLabel, computeAvailableLeaveDays } from '@/lib/hrm/leave';

export default function EmployeeLeaveBalanceCard({ balance, policy, onClick }) {
  if (!balance && !policy) return null;

  const displayName = policy?.display_name || getLeaveTypeLabel(balance?.leave_type || 'leave');
  const requiresBalance = policy ? policy.requires_balance : true;
  
  const entitled = Number(balance?.entitled_days ?? policy?.annual_entitlement ?? 0);
  const carried = Number(balance?.carried_forward_days ?? 0);
  const adjustment = Number(balance?.adjustment_days ?? 0);
  const used = Number(balance?.used_days ?? 0);

  const available = balance?.available_days !== undefined
    ? Number(balance.available_days)
    : computeAvailableLeaveDays(balance || { entitled_days: entitled }, policy?.allow_negative_balance);

  const total = entitled + carried + adjustment;

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 ${onClick ? 'cursor-pointer' : 'min-w-[280px] w-full shrink-0 snap-start'}`}
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {displayName}
        </h3>
        
        <div className="mt-1">
          <span className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tighter">
            {requiresBalance ? available : '∞'}
          </span>
          <span className="ml-2 text-sm font-semibold text-slate-500">
            days available
          </span>
        </div>

        {requiresBalance && (
          <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">
              Used {used} / {total} days
            </span>
            
            <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  available <= 0 ? 'bg-rose-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, total > 0 ? (used / total) * 100 : 0)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
