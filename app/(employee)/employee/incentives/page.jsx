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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50 font-[family-name:var(--font-outfit)]">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Gift className="text-indigo-600" size={26} /> My Bonuses & Incentives
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track performance awards, spot bonuses, and festival incentives awarded to you.
          </p>
        </div>
        <button
          onClick={fetchIncentives}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Summary Cards */}
      <EmployeeIncentiveSummary summary={data.summary} />

      {/* Award History List */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
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
