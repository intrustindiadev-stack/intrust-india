'use client';

import { FileText, Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import IncentiveStatusBadge from '@/components/hrm/incentives/IncentiveStatusBadge';
import { formatPaiseToINR, INCENTIVE_TYPE_LABELS } from '@/lib/hrm/incentives';

export default function EmployeeIncentiveHistory({ data = [], meta, onPageChange }) {
  return (
    <div className="space-y-4 font-[family-name:var(--font-outfit)]">
      <div className="bg-white dark:bg-slate-900/50 rounded-3xl shadow-xl shadow-slate-200/20 dark:shadow-black/20 border border-slate-200 dark:border-slate-800/60 overflow-hidden backdrop-blur-xl">
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2.5">
            <Gift size={18} className="text-indigo-500" /> Award & Bonus History
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{meta?.total || data.length} Total Awards</span>
        </div>

        {data.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-400 dark:text-slate-500">
            No bonuses or financial awards recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {data.map((alloc) => {
              const batch = alloc.batch || {};
              const typeLabel = INCENTIVE_TYPE_LABELS[batch.incentive_type] || batch.incentive_type || 'Bonus';
              const reason = batch.description || 'Employee Award';

              return (
                <div key={alloc.id} className="p-5 sm:p-6 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-5 group">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-900 dark:text-white text-sm sm:text-base">{typeLabel}</span>
                      <IncentiveStatusBadge status={alloc.status} />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">{reason}</p>
                    <div className="flex flex-wrap items-center gap-4 text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 pt-1 uppercase tracking-wider">
                      <span>Effective: {batch.effective_date || 'N/A'}</span>
                      {alloc.paid_at && <span>Paid: {new Date(alloc.paid_at).toLocaleDateString('en-IN')}</span>}
                      {batch.payroll_month && batch.payroll_year && (
                        <span>Period: {batch.payroll_month}/{batch.payroll_year}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-0 border-slate-100 dark:border-slate-800/60 pt-4 sm:pt-0 mt-1 sm:mt-0">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {formatPaiseToINR(alloc.amount_paise)}
                    </span>
                    {alloc.salary_record_id ? (
                      <a
                        href="/employee/payslips"
                        className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-100 dark:border-indigo-800/50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <FileText size={14} /> View Payslip
                      </a>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 px-3 py-1.5 rounded-lg">Payroll Pending</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-between items-center px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
          <span>Page {meta.page} of {meta.totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={meta.page <= 1}
              onClick={() => onPageChange(meta.page - 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={meta.page >= meta.totalPages}
              onClick={() => onPageChange(meta.page + 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
