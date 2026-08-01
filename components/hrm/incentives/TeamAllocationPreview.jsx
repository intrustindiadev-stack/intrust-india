'use client';

import { useState, useEffect } from 'react';
import { Users, AlertCircle, CheckCircle, Info, Loader2 } from 'lucide-react';
import { formatPaiseToINR } from '@/lib/hrm/incentives';

export default function TeamAllocationPreview({ teamId, allocationMode, amount, includeLead }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!teamId || !amount || parseFloat(amount) <= 0) {
      setPreview(null);
      setError('');
      return;
    }

    let isMounted = true;
    const fetchPreview = async () => {
      setLoading(true);
      setError('');
      try {
        const url = `/api/hrm/incentives/teams/${teamId}/preview?allocation_mode=${allocationMode}&amount=${amount}&include_lead=${includeLead}`;
        const res = await fetch(url);
        const data = await res.json();
        if (isMounted) {
          if (!res.ok || !data.success) {
            setError(data.error || 'Failed to calculate preview');
            setPreview(null);
          } else {
            setPreview(data);
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPreview();
    return () => { isMounted = false; };
  }, [teamId, allocationMode, amount, includeLead]);

  if (loading) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-xs text-slate-500">
        <Loader2 size={16} className="animate-spin" />
        Calculating team allocation preview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
        <AlertCircle size={16} className="shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
      <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
          <Users size={14} className="text-slate-500" />
          {preview.team_name} Breakdown
        </span>
        <span className="text-[11px] font-medium bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
          {allocationMode === 'per_person' ? 'Per Person' : 'Total Pool Split'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600">
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Eligible Members</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5">{preview.eligible_count}</p>
        </div>
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Excluded</p>
          <p className="text-sm font-bold text-rose-600 mt-0.5">{preview.excluded_count}</p>
        </div>
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Per Person</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5">{formatPaiseToINR(preview.per_person_amount_paise)}</p>
        </div>
        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Cost</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5">{formatPaiseToINR(preview.total_cost_paise)}</p>
        </div>
      </div>

      {preview.remainder_paise > 0 && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex items-center gap-1.5">
          <Info size={14} className="shrink-0" />
          <span>Pool remainder of {formatPaiseToINR(preview.remainder_paise)} will be distributed deterministically (+₹0.01 per member).</span>
        </div>
      )}

      {/* Eligible Recipients List Preview */}
      <div className="pt-1">
        <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Recipients Preview ({preview.eligible_members?.length || 0}):</p>
        <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
          {preview.eligible_members?.map((m) => (
            <div key={m.id} className="flex justify-between items-center py-1 px-2 bg-white rounded border border-slate-100 text-slate-700">
              <span className="font-medium text-slate-900">{m.name}</span>
              <span className="text-[11px] font-mono text-slate-500">{m.code ? `#${m.code}` : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
