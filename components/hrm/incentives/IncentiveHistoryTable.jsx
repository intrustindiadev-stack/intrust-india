'use client';

import { useState } from 'react';
import { Eye, ArrowUpDown, ChevronLeft, ChevronRight, User, Users } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import IncentiveStatusBadge from './IncentiveStatusBadge';
import { formatPaiseToINR, INCENTIVE_TYPE_LABELS } from '@/lib/hrm/incentives';

export default function IncentiveHistoryTable({ data = [], meta, onPageChange }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'amount') {
      valA = a.total_amount_paise || 0;
      valB = b.total_amount_paise || 0;
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="divide-y divide-gray-100 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {sortedData.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No incentive records match the current filters.
          </div>
        ) : (
          sortedData.map((batch) => {
            const isIndividual = batch.recipient_mode === 'individual';
            const recipientName = isIndividual
              ? batch.allocations?.[0]?.employee_name_snapshot || 'Individual Employee'
              : batch.team_name_snapshot || 'Team';

            return (
              <div
                key={batch.id}
                onClick={() => {
                  const slug = recipientName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  router.push(`${pathname}/${batch.id}-${slug}`);
                }}
                className="p-5 bg-white hover:bg-gray-50 border border-transparent hover:border-gray-200 hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group active:scale-[0.99]"
              >
                <div className="flex items-center gap-4 flex-1">
                  {isIndividual ? (
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold shadow-inner shrink-0">
                      <User size={20} />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-600 font-bold shadow-inner shrink-0">
                      <Users size={20} />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900 text-base group-hover:text-indigo-600 transition-colors">{recipientName}</p>
                    {!isIndividual && (
                      <p className="text-xs text-gray-400 font-medium tracking-wide mt-0.5">
                        {batch.eligible_member_count} members ({batch.allocation_mode === 'per_person' ? 'Per Person' : 'Total Pool'})
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 sm:gap-10 w-full sm:w-auto overflow-x-auto hide-scrollbar">
                  <div className="shrink-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Type & Mode</p>
                    <p className="text-sm font-semibold text-gray-700">
                      {INCENTIVE_TYPE_LABELS[batch.incentive_type] || batch.incentive_type}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{batch.recipient_mode}</p>
                  </div>
                  <div className="shrink-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Effective Date</p>
                    <p className="text-sm font-semibold text-gray-700">{batch.effective_date}</p>
                  </div>
                  <div className="shrink-0 pr-4 sm:pr-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Amount</p>
                    <p className="text-lg font-black text-gray-900 font-mono">{formatPaiseToINR(batch.total_amount_paise)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-4 sm:pt-0 border-t border-gray-100 sm:border-0 mt-2 sm:mt-0 shrink-0">
                  <IncentiveStatusBadge status={batch.status} />
                  
                  <button
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        const slug = recipientName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        router.push(`${pathname}/${batch.id}-${slug}`); 
                    }}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shrink-0"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-between items-center px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
          <span>
            Page <strong className="text-slate-900">{meta.page}</strong> of <strong className="text-slate-900">{meta.totalPages}</strong> ({meta.total} awards)
          </span>
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
