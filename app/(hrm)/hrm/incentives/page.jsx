'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, Clock, CheckCircle2, DollarSign, Gift } from 'lucide-react';
import AwardIncentiveModal from './AwardIncentiveModal';
import IncentiveMetricCard from '@/components/hrm/incentives/IncentiveMetricCard';
import IncentiveHistoryTable from '@/components/hrm/incentives/IncentiveHistoryTable';
import IncentiveDetailsDrawer from '@/components/hrm/incentives/IncentiveDetailsDrawer';
import { CANONICAL_INCENTIVE_TYPES, INCENTIVE_TYPE_LABELS, formatPaiseToINR } from '@/lib/hrm/incentives';

export default function IncentivesPage() {
  const [batches, setBatches] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    incentive_type: '',
    recipient_mode: '',
    page: 1,
    limit: 15,
  });

  // Metrics State
  const [metrics, setMetrics] = useState({
    pendingCount: 0,
    pendingTotalPaise: 0,
    approvedCount: 0,
    approvedTotalPaise: 0,
    paidMonthCount: 0,
    paidMonthTotalPaise: 0,
    totalAwardedPaise: 0,
  });

  const fetchIncentives = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', filters.page.toString());
      params.set('limit', filters.limit.toString());
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.incentive_type) params.set('incentive_type', filters.incentive_type);
      if (filters.recipient_mode) params.set('recipient_mode', filters.recipient_mode);

      const res = await fetch(`/api/hrm/incentives?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setBatches(data.data || []);
        setMeta(data.meta);

        // Compute metrics from current data
        const list = data.data || [];
        let pendingCnt = 0, pendingSum = 0;
        let appCnt = 0, appSum = 0;
        let paidCnt = 0, paidSum = 0;
        let totalSum = 0;

        list.forEach((b) => {
          const paise = b.total_amount_paise || 0;
          totalSum += paise;
          if (b.status === 'pending') {
            pendingCnt++;
            pendingSum += paise;
          } else if (b.status === 'approved') {
            appCnt++;
            appSum += paise;
          } else if (b.status === 'paid') {
            paidCnt++;
            paidSum += paise;
          }
        });

        setMetrics({
          pendingCount: pendingCnt,
          pendingTotalPaise: pendingSum,
          approvedCount: appCnt,
          approvedTotalPaise: appSum,
          paidMonthCount: paidCnt,
          paidMonthTotalPaise: paidSum,
          totalAwardedPaise: totalSum,
        });
      }
    } catch (err) {
      console.error('Fetch incentives error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchIncentives();
  }, [fetchIncentives]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-[family-name:var(--font-outfit)]">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><Gift size={24} /></div>
              Incentives & Bonuses
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Enterprise HRMS management of individual and team performance awards.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchIncentives}
              className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
              title="Refresh Incentives"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <AwardIncentiveModal onSuccess={fetchIncentives} />
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <IncentiveMetricCard
            label="Pending Approval"
            value={formatPaiseToINR(metrics.pendingTotalPaise)}
            subtext={`${metrics.pendingCount} awards awaiting review`}
            icon={Clock}
            bgClass="from-amber-500 to-orange-500"
          />
          <IncentiveMetricCard
            label="Approved (Payroll)"
            value={formatPaiseToINR(metrics.approvedTotalPaise)}
            subtext={`${metrics.approvedCount} awards ready for payout`}
            icon={CheckCircle2}
            bgClass="from-indigo-500 to-purple-600"
          />
          <IncentiveMetricCard
            label="Paid"
            value={formatPaiseToINR(metrics.paidMonthTotalPaise)}
            subtext={`${metrics.paidMonthCount} awards paid`}
            icon={DollarSign}
            bgClass="from-emerald-500 to-teal-600"
          />
          <IncentiveMetricCard
            label="Total Awarded"
            value={formatPaiseToINR(metrics.totalAwardedPaise)}
            subtext="Period summary"
            icon={Gift}
            bgClass="from-sky-500 to-blue-600"
          />
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                placeholder="Search award reason, team..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 text-xs"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 text-xs text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="reversed">Reversed</option>
            </select>

            {/* Type Filter */}
            <select
              value={filters.incentive_type}
              onChange={(e) => setFilters({ ...filters, incentive_type: e.target.value, page: 1 })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 text-xs text-slate-700"
            >
              <option value="">All Types</option>
              {CANONICAL_INCENTIVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {INCENTIVE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>

            {/* Mode Filter */}
            <select
              value={filters.recipient_mode}
              onChange={(e) => setFilters({ ...filters, recipient_mode: e.target.value, page: 1 })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 text-xs text-slate-700"
            >
              <option value="">All Recipient Modes</option>
              <option value="individual">Individual</option>
              <option value="team">Team</option>
            </select>
          </div>
        </div>

        {/* History Data Table & Stacked Mobile Cards */}
        {loading ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
            Loading incentive records...
          </div>
        ) : (
          <IncentiveHistoryTable
            data={batches}
            meta={meta}
            onPageChange={(p) => setFilters({ ...filters, page: p })}
          />
        )}

      </div>
    </div>
  );
}
