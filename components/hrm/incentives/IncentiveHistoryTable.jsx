'use client';

import { useState } from 'react';
import { Eye, ArrowUpDown, ChevronLeft, ChevronRight, User, Users } from 'lucide-react';
import IncentiveStatusBadge from './IncentiveStatusBadge';
import { formatPaiseToINR, INCENTIVE_TYPE_LABELS } from '@/lib/hrm/incentives';

export default function IncentiveHistoryTable({ data = [], meta, onPageChange, onSelectRow }) {
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
      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Recipient / Target</th>
              <th className="px-5 py-3.5">Mode & Type</th>
              <th className="px-5 py-3.5 cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                <div className="flex items-center gap-1">
                  <span>Amount</span>
                  <ArrowUpDown size={12} className="text-slate-400" />
                </div>
              </th>
              <th className="px-5 py-3.5 cursor-pointer select-none" onClick={() => toggleSort('effective_date')}>
                <div className="flex items-center gap-1">
                  <span>Effective Date</span>
                  <ArrowUpDown size={12} className="text-slate-400" />
                </div>
              </th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-10 text-slate-400">
                  No incentive records match the current filters.
                </td>
              </tr>
            ) : (
              sortedData.map((batch) => {
                const isIndividual = batch.recipient_mode === 'individual';
                const recipientName = isIndividual
                  ? batch.allocations?.[0]?.employee_name_snapshot || 'Individual Employee'
                  : batch.team_name_snapshot || 'Team';

                return (
                  <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        {isIndividual ? (
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                            <User size={14} />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <Users size={14} />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">{recipientName}</p>
                          {!isIndividual && (
                            <p className="text-[11px] text-slate-400 font-normal">
                              {batch.eligible_member_count} members ({batch.allocation_mode === 'per_person' ? 'Per Person' : 'Total Pool'})
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-slate-800 font-medium">
                        {INCENTIVE_TYPE_LABELS[batch.incentive_type] || batch.incentive_type}
                      </p>
                      <p className="text-[11px] text-slate-400 capitalize">{batch.recipient_mode}</p>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900 font-mono text-xs">
                      {formatPaiseToINR(batch.total_amount_paise)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {batch.effective_date}
                    </td>
                    <td className="px-5 py-3.5">
                      <IncentiveStatusBadge status={batch.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => onSelectRow(batch.id)}
                        className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards View */}
      <div className="md:hidden space-y-3">
        {sortedData.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
            No records found.
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
                onClick={() => onSelectRow(batch.id)}
                className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs active:bg-slate-50 cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {INCENTIVE_TYPE_LABELS[batch.incentive_type] || batch.incentive_type}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-0.5">{recipientName}</h3>
                  </div>
                  <IncentiveStatusBadge status={batch.status} />
                </div>

                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Amount</p>
                    <p className="font-bold text-slate-900 font-mono text-sm">{formatPaiseToINR(batch.total_amount_paise)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Effective Date</p>
                    <p className="font-medium text-slate-700">{batch.effective_date}</p>
                  </div>
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
