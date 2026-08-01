import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export default function DataTable({
  columns,
  data,
  isLoading,
  emptyMessage = 'No records found',
  mobileCardRender,
  pagination,
  onPageChange
}) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 dark:border-t-slate-100 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-medium text-slate-500">Loading data...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
        <Inbox size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Card List View */}
      {mobileCardRender && (
        <div className="block md:hidden space-y-3">
          {data.map((item, idx) => (
            <div key={item.id || idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              {mobileCardRender(item)}
            </div>
          ))}
        </div>
      )}

      {/* Desktop Table View */}
      <div className={`${mobileCardRender ? 'hidden md:block' : 'block'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                {columns.map((col) => (
                  <th key={col.key || col.header} className={`px-5 py-3.5 ${col.className || ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {data.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key || col.header} className={`px-5 py-3.5 ${col.className || ''}`}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.total > pagination.limit && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-500">
          <span>
            Showing <strong className="font-semibold text-slate-700 dark:text-slate-300">{(pagination.page - 1) * pagination.limit + 1}</strong> to <strong className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(pagination.total, pagination.page * pagination.limit)}</strong> of <strong className="font-semibold text-slate-700 dark:text-slate-300">{pagination.total}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange && onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              aria-label="Previous page"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-mono text-slate-700 dark:text-slate-300">{pagination.page}</span>
            <button
              onClick={() => onPageChange && onPageChange(pagination.page + 1)}
              disabled={!pagination.has_more}
              aria-label="Next page"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
