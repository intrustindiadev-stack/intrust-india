// app/(admin)/marketing/daily-quotes/page.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00')); // force local parse
}

function todayISO() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    scheduled: 'bg-blue-50 text-blue-700 ring-blue-200',
    sent: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    archived: 'bg-slate-100 text-slate-500 ring-slate-200',
  };
  const label = {
    scheduled: '⏰ Scheduled',
    sent: '✅ Sent',
    archived: '🗄 Archived',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${map[status] ?? map.archived}`}>
      {label[status] ?? status}
    </span>
  );
}

function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <svg className={`animate-spin ${s} text-slate-400`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ── Add Quote Form ────────────────────────────────────────────────────────────

function AddQuoteForm({ onSuccess }) {
  const [form, setForm] = useState({ scheduled_date: '', quote_text: '', author_or_source: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setForm({ scheduled_date: '', quote_text: '', author_or_source: '' });
    setError(null);
    setSuccess(false);
  };

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.scheduled_date || !form.quote_text.trim()) {
      setError('Date and Quote text are required.');
      return;
    }
    setLoading(true);
    const { error: dbErr } = await supabase.from('daily_quotes').insert([{
      scheduled_date: form.scheduled_date,
      quote_text: form.quote_text.trim(),
      author_or_source: form.author_or_source.trim() || null,
      status: 'scheduled',
    }]);
    setLoading(false);
    if (dbErr) {
      setError(
        dbErr.code === '23505'
          ? 'A quote is already scheduled for this date. Please pick a different date.'
          : dbErr.message
      );
    } else {
      setSuccess(true);
      reset();
      onSuccess?.();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-xl">🌅</div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">Schedule a Quote</h2>
          <p className="text-sm text-slate-500">
            Sent at <strong>8:00 AM IST</strong> on the selected date via WhatsApp.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        {/* Date + Author row */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="scheduled_date" className="mb-1.5 block text-sm font-medium text-slate-700">
              Broadcast Date <span className="text-red-500">*</span>
            </label>
            <input
              id="scheduled_date"
              name="scheduled_date"
              type="date"
              required
              min={todayISO()}
              value={form.scheduled_date}
              onChange={handleChange}
              className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label htmlFor="author_or_source" className="mb-1.5 block text-sm font-medium text-slate-700">
              Author / Source <span className="text-slate-400 text-xs font-normal">(admin reference only)</span>
            </label>
            <input
              id="author_or_source"
              name="author_or_source"
              type="text"
              value={form.author_or_source}
              onChange={handleChange}
              placeholder="e.g. Mahatma Gandhi, Anonymous"
              className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Quote textarea */}
        <div>
          <label htmlFor="quote_text" className="mb-1.5 block text-sm font-medium text-slate-700">
            Quote / Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="quote_text"
            name="quote_text"
            rows={3}
            required
            value={form.quote_text}
            onChange={handleChange}
            placeholder="Enter an inspirational quote or morning message…"
            className="block w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Live WhatsApp preview */}
        {form.quote_text.trim() && (
          <div className="rounded-xl border border-slate-100 bg-[#f0f2f5] px-4 py-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              WhatsApp Preview
            </p>
            {/* Bubble */}
            <div className="inline-block max-w-xs rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
              <p className="text-sm text-slate-800">
                🌅 Good morning, <span className="font-semibold">{'{{Name}}'}</span>!
              </p>
              <p className="mt-1 text-sm text-slate-600 italic">"{form.quote_text.trim()}"</p>
              <p className="mt-1.5 text-sm text-slate-700">— Have a wonderful day! ✨</p>
              <p className="mt-2 border-t border-slate-100 pt-1.5 text-xs text-slate-400">InTrust India</p>
            </div>
          </div>
        )}

        {/* Feedback */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="mt-0.5">⚠️</span><span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <span>✅</span><span>Quote scheduled successfully!</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            Clear
          </button>
          <button
            id="submit-daily-quote-btn"
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:opacity-60 transition"
          >
            {loading && <Spinner size="sm" />}
            {loading ? 'Scheduling…' : 'Schedule Quote'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, note }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-0.5 text-2xl font-bold text-slate-800">{value}</p>
          {note && <p className="text-xs text-slate-400">{note}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Quotes Table ──────────────────────────────────────────────────────────────

const TABS = [
  { key: 'scheduled', label: 'Upcoming', icon: '⏰' },
  { key: 'sent', label: 'Sent History', icon: '✅' },
  { key: 'archived', label: 'Archived', icon: '🗄' },
];

function QuotesTable({ rows, loading }) {
  if (loading) {
    return (
      <div className="flex h-44 items-center justify-center gap-2 text-sm text-slate-500">
        <Spinner /> Loading quotes…
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-slate-400">
        No quotes found for this view.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead>
          <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Quote</th>
            <th className="px-4 py-3">Author</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-center">Delivered</th>
            <th className="px-4 py-3 text-center">Failed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                {formatDate(row.scheduled_date)}
              </td>
              <td className="max-w-xs px-4 py-3">
                <span className="block truncate text-slate-700" title={row.quote_text}>
                  "{row.quote_text}"
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                {row.author_or_source ?? <span className="italic text-slate-300">—</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-center">
                {row.status === 'sent'
                  ? <span className="font-semibold text-emerald-600">{row.delivered ?? 0}</span>
                  : <span className="text-slate-300">—</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-center">
                {row.status === 'sent'
                  ? <span className={`font-semibold ${(row.failed ?? 0) > 0 ? 'text-red-500' : 'text-slate-300'}`}>{row.failed ?? 0}</span>
                  : <span className="text-slate-300">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DailyQuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scheduled');

  const fetchQuotes = useCallback(async () => {
    setTableLoading(true);
    const { data, error } = await supabase
      .from('quote_delivery_summary')
      .select('*');
    if (!error && data) setQuotes(data);
    setTableLoading(false);
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const byStatus = (s) => quotes.filter((q) => q.status === s);
  const sentRows = byStatus('sent');
  const totalDelivered = sentRows.reduce((a, q) => a + (q.delivered || 0), 0);

  const tabRows = {
    scheduled: byStatus('scheduled'),
    sent: sentRows,
    archived: byStatus('archived'),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto max-w-5xl flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🌅</span>
              <h1 className="text-xl font-bold text-slate-900">Daily Good Morning</h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">WhatsApp</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Schedule and manage the daily inspirational quote broadcast.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Cron: 8:00 AM IST daily
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon="⏰" label="Upcoming Quotes" value={byStatus('scheduled').length} note="Scheduled & ready" />
          <StatCard icon="📤" label="Broadcasts Sent" value={sentRows.length} note="Total broadcast days" />
          <StatCard icon="👥" label="Total Delivered" value={totalDelivered.toLocaleString('en-IN')} note="Across all broadcasts" />
        </div>

        {/* Add Form */}
        <AddQuoteForm onSuccess={fetchQuotes} />

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Tabs header */}
          <div className="border-b border-slate-100 px-6 pt-5">
            <h2 className="mb-4 text-base font-semibold text-slate-800">Quote Schedule</h2>
            <div className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  id={`tab-quotes-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.icon} {tab.label}
                  {tab.key === 'scheduled' && tabRows.scheduled.length > 0 && (
                    <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700">
                      {tabRows.scheduled.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <QuotesTable rows={tabRows[activeTab] ?? []} loading={tableLoading} />

          {!tableLoading && tabRows[activeTab]?.length > 0 && (
            <div className="border-t border-slate-100 px-6 py-3">
              <p className="text-xs text-slate-400">
                Showing {tabRows[activeTab].length} record{tabRows[activeTab].length !== 1 ? 's' : ''}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
