'use client';

import { useState, useEffect, useCallback } from 'react';
import { Gift, RefreshCw } from 'lucide-react';
import EmployeeIncentiveSummary from '@/components/employee/incentives/EmployeeIncentiveSummary';
import EmployeeIncentiveHistory from '@/components/employee/incentives/EmployeeIncentiveHistory';

export default function EmployeeIncentivesPage() {
  const [data, setData] = useState({ summary: null, allocations: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchIncentives = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employee/incentives?page=${page}&limit=15`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const result = await res.json();
      if (result.success) {
        setData({
          summary: result.summary,
          allocations: result.data || [],
          meta: result.meta,
        });
      }
    } catch (err) {
      console.error('Fetch employee incentives error:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchIncentives();
  }, [fetchIncentives]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50 dark:bg-[#0a0a0a] font-[family-name:var(--font-outfit)]">
      {/* Header */}
      <div className="flex justify-between items-start relative z-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-sm">
                <Gift size={20} />
            </div>
            My Bonuses & Incentives
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
            Track performance awards, spot bonuses, and festival incentives awarded to you.
          </p>
        </div>
        <button
          onClick={fetchIncentives}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Summary Cards */}
      <EmployeeIncentiveSummary summary={data.summary} />

      {/* Award History List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900/50 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500 backdrop-blur-xl">
          Loading your incentive records...
        </div>
      ) : (
        <EmployeeIncentiveHistory
          data={data.allocations}
          meta={data.meta}
          onPageChange={(p) => setPage(p)}
        />
      )}
    </div>
  );
}
