'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, RefreshCw, MapPin, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

import MetricCard from '@/components/hrm/MetricCard';
import StatusBadge from '@/components/hrm/StatusBadge';
import DataTable from '@/components/hrm/DataTable';
import { formatTimeIST, formatDateIST, calculateDuration, calculateElapsedTime } from '@/lib/hrm/date';
import { getLocationStatusBadge } from '@/lib/hrm/attendance';

export default function EmployeeAttendancePage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [now, setNow] = useState(new Date());
  const abortControllerRef = useRef(null);

  // Live timer for active shift duration
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSummary = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    try {
      const res = await fetch('/api/employee/attendance/summary', {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error('Failed to load attendance summary');
      const json = await res.json();
      setData(json);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
        toast.error('Unable to fetch attendance summary');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchSummary]);

  const getCoordinates = () => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const handleClockIn = async () => {
    setClocking(true);
    try {
      const coords = await getCoordinates();
      const res = await fetch('/api/employee/attendance/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: coords?.lat ?? null, lng: coords?.lng ?? null })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Clock in failed');

      toast.success(result.record?.is_onsite ? 'Clocked in (On-Site)' : 'Clocked in (Off-Site/WFH)');
      fetchSummary();
    } catch (err) {
      toast.error(err.message || 'Clock in failed');
    } finally {
      setClocking(false);
    }
  };

  const handleClockOut = async () => {
    setClocking(true);
    try {
      const coords = await getCoordinates();
      const res = await fetch('/api/employee/attendance/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: coords?.lat ?? null, lng: coords?.lng ?? null })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Clock out failed');

      toast.success('Shift completed. Clocked out successfully!');
      fetchSummary();
    } catch (err) {
      toast.error(err.message || 'Clock out failed');
    } finally {
      setClocking(false);
    }
  };

  const handleReconcileStale = async () => {
    setClocking(true);
    try {
      const res = await fetch('/api/employee/attendance/force-close', { method: 'POST' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Reconciliation failed');
      toast.success('Stale shift auto-reconciled.');
      fetchSummary();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setClocking(false);
    }
  };

  const openShift = data?.open_shift;
  const metrics = data?.metrics;
  const history = data?.history || [];
  const timezone = data?.timezone || 'Asia/Kolkata';

  // Desktop Table Columns
  const columns = [
    {
      header: 'Work Date',
      key: 'work_date',
      render: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
          {formatDateIST(row.work_date || row.date)}
        </span>
      )
    },
    {
      header: 'Check In',
      key: 'check_in',
      render: (row) => (
        <span className="font-mono text-slate-700 dark:text-slate-300">
          {formatTimeIST(row.check_in)}
        </span>
      )
    },
    {
      header: 'Check Out',
      key: 'check_out',
      render: (row) => (
        <span className="font-mono text-slate-700 dark:text-slate-300">
          {row.check_out ? formatTimeIST(row.check_out) : <span className="text-amber-600 font-bold text-xs">Active Shift</span>}
        </span>
      )
    },
    {
      header: 'Duration',
      key: 'duration',
      render: (row) => (
        <span className="font-mono text-slate-600 dark:text-slate-400">
          {calculateDuration(row.check_in, row.check_out)}
        </span>
      )
    },
    {
      header: 'Location Mode',
      key: 'location',
      render: (row) => {
        const badge = getLocationStatusBadge(row);
        return (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${badge.cls}`}>
            <MapPin size={10} /> {badge.label}
          </span>
        );
      }
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} type="attendance" />
    },
    {
      header: 'Review State',
      key: 'needs_review',
      render: (row) => row.needs_review ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle size={10} /> Needs Review
        </span>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      )
    }
  ];

  // Mobile Stacked Card View
  const mobileCardRender = (row) => {
    const locBadge = getLocationStatusBadge(row);
    return (
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="font-bold text-slate-900">{formatDateIST(row.work_date || row.date)}</span>
          <StatusBadge status={row.status} type="attendance" />
        </div>
        <div className="grid grid-cols-2 gap-2 text-slate-600">
          <div>Check In: <strong className="font-mono text-slate-900">{formatTimeIST(row.check_in)}</strong></div>
          <div>Check Out: <strong className="font-mono text-slate-900">{row.check_out ? formatTimeIST(row.check_out) : 'Active'}</strong></div>
          <div>Duration: <strong className="font-mono text-slate-900">{calculateDuration(row.check_in, row.check_out)}</strong></div>
          <div>Mode: <span className={`font-bold ${locBadge.cls}`}>{locBadge.label}</span></div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50/50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Attendance Log
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative time-tracking system · Business Timezone: <strong className="font-mono text-slate-700 dark:text-slate-300">{timezone}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSummary}
            disabled={isLoading}
            aria-label="Refresh attendance summary"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Current Shift Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Shift</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${openShift ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {openShift ? '● Active Shift' : 'Idle'}
              </span>
            </div>

            {openShift ? (
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-semibold font-mono text-slate-900 dark:text-slate-100">
                    {calculateElapsedTime(openShift.check_in, now)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    (Clocked in at {formatTimeIST(openShift.check_in)})
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" /> Server Verified Location: <strong className="font-semibold">{openShift.is_onsite ? 'On-Site Office HQ' : 'Off-Site / WFH'}</strong>
                </p>
              </div>
            ) : (
              <div>
                <div className="text-3xl font-semibold font-mono text-slate-900 dark:text-slate-100">
                  {now.toLocaleTimeString('en-IN', { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </div>
                <p className="text-xs text-slate-500 mt-1">Ready to start your work shift.</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {openShift ? (
              <button
                onClick={handleClockOut}
                disabled={clocking}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2 shadow-xs"
              >
                {clocking ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Clock Out'}
              </button>
            ) : (
              <button
                onClick={handleClockIn}
                disabled={clocking}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-xs"
              >
                {clocking ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Clock In'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Attendance Rate" value={`${metrics?.attendanceRatePct || 100}%`} accentColor="emerald" />
        <MetricCard label="Present Days" value={metrics?.presentDays || 0} accentColor="blue" />
        <MetricCard label="Late Arrivals" value={metrics?.lateDays || 0} accentColor="amber" />
        <MetricCard label="Total Logged" value={metrics?.totalRecords || 0} accentColor="indigo" />
      </div>

      {/* History Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Attendance Log History (30 Days)</h2>
        <DataTable
          columns={columns}
          data={history}
          isLoading={isLoading}
          emptyMessage="No attendance records recorded yet. Clock in to begin."
          mobileCardRender={mobileCardRender}
          pagination={data?.pagination}
          onPageChange={(page) => fetchSummary()}
        />
      </div>
    </div>
  );
}
