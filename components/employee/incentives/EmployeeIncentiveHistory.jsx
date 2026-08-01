'use client';

import { FileText, Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import IncentiveStatusBadge from '@/components/hrm/incentives/IncentiveStatusBadge';
import { formatPaiseToINR, INCENTIVE_TYPE_LABELS } from '@/lib/hrm/incentives';

export default function EmployeeIncentiveHistory({ data = [], meta, onPageChange }) {
  return (
    <div className="space-y-4 font-[family-name:var(--font-outfit)]">
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Gift size={16} className="text-slate-600" /> Award & Bonus History
          </h3>
          <span className="text-xs text-slate-500 font-medium">{meta?.total || data.length} Total Awards</span>
        </div>

        {data.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No bonuses or financial awards recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.map((alloc) => {
              const batch = alloc.batch || {};
              const typeLabel = INCENTIVE_TYPE_LABELS[batch.incentive_type] || batch.incentive_type || 'Bonus';
              const reason = batch.description || 'Employee Award';

              return (
                <div key={alloc.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{typeLabel}</span>
                      <IncentiveStatusBadge status={alloc.status} />
                    </div>
                    <p className="text-xs text-slate-600">{reason}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                      <span>Effective: {batch.effective_date || 'N/A'}</span>
                      {alloc.paid_at && <span>Paid: {new Date(alloc.paid_at).toLocaleDateString('en-IN')}</span>}
                      {batch.payroll_month && batch.payroll_year && (
                        <span>Period: {batch.payroll_month}/{batch.payroll_year}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-0 border-slate-100 pt-3 sm:pt-0">
                    <span className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                      {formatPaiseToINR(alloc.amount_paise)}
                    </span>
                    {alloc.salary_record_id ? (
                      <a
                        href="/employee/payslips"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors"
                      >
                        <FileText size={13} /> View Payslip
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">Payroll Pending</span>
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
