'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X, CheckCircle2, XCircle, AlertTriangle, DollarSign, RotateCcw, Shield, Clock, FileText, User, ArrowLeft } from 'lucide-react';
import IncentiveStatusBadge from '@/components/hrm/incentives/IncentiveStatusBadge';
import { formatPaiseToINR, INCENTIVE_TYPE_LABELS } from '@/lib/hrm/incentives';

export default function IncentiveDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const idParam = params.id || '';
  const batchId = idParam.slice(0, 36); // Extract UUID from slug

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [actionModal, setActionModal] = useState(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/hrm/incentives/${batchId}`);
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch details');
      }
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleTransition = async () => {
    if (!actionModal || !data) return;
    setProcessing(true);
    setError('');
    try {
      const res = await fetch(`/api/hrm/incentives/${batchId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionModal.action,
          expectedStatus: data.batch.status,
          expectedVersion: data.batch.version,
          reason: reason.trim() || null,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Transition failed');
      }

      setActionModal(null);
      setReason('');
      fetchDetails();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const batch = data?.batch;
  const capabilities = data?.capabilities;
  const auditLogs = data?.audit_logs || [];

  if (loading) {
      return (
          <div className="p-8 max-w-6xl mx-auto min-h-screen">
              <div className="animate-pulse flex flex-col gap-8">
                  <div className="h-32 bg-slate-200 rounded-[2.5rem]"></div>
                  <div className="h-64 bg-slate-200 rounded-[2.5rem]"></div>
              </div>
          </div>
      );
  }

  if (!batch) {
      return (
          <div className="p-8 text-center text-slate-500 min-h-screen flex items-center justify-center">
              Award not found.
          </div>
      );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 min-h-screen font-[family-name:var(--font-outfit)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button 
                onClick={() => router.back()}
                className="flex w-fit items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Incentives
            </button>
        </div>

        {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
                {error}
            </div>
        )}

        {/* Primary Header Card */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner shrink-0">
                    <FileText size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        Incentive Award
                        <IncentiveStatusBadge status={batch.status} />
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 font-mono text-sm">ID: {batchId}</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
                {/* Primary Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div>
                        <p className="text-xs uppercase font-semibold text-slate-400">Award Type</p>
                        <p className="font-bold text-slate-900 mt-1">{INCENTIVE_TYPE_LABELS[batch.incentive_type] || batch.incentive_type}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase font-semibold text-slate-400">Recipient Mode</p>
                        <p className="font-bold text-slate-900 mt-1 capitalize">{batch.recipient_mode}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase font-semibold text-slate-400">Total Amount</p>
                        <p className="font-bold text-emerald-600 mt-1 text-lg font-mono">{formatPaiseToINR(batch.total_amount_paise)}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase font-semibold text-slate-400">Effective Date</p>
                        <p className="font-semibold text-slate-700 mt-1">{batch.effective_date}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase font-semibold text-slate-400">Payroll Period</p>
                        <p className="font-semibold text-slate-700 mt-1">
                        {batch.payroll_month && batch.payroll_year ? `${batch.payroll_month}/${batch.payroll_year}` : 'Next Available'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs uppercase font-semibold text-slate-400">Version</p>
                        <p className="font-semibold text-slate-700 mt-1 font-mono">v{batch.version}</p>
                    </div>
                </div>

                {/* Description & Internal Notes */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
                    {batch.description && (
                        <div>
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Reason / Description</h4>
                        <p className="text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-100">{batch.description}</p>
                        </div>
                    )}
                    {batch.internal_note && (
                        <div>
                        <h4 className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Shield size={16} /> Internal Note (HR Confidential)
                        </h4>
                        <p className="text-sm text-slate-700 bg-amber-50/50 p-4 rounded-xl border border-amber-200/60">{batch.internal_note}</p>
                        </div>
                    )}
                </div>

                {/* Recipient Allocations */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8">
                    <h2 className="text-lg font-black text-slate-900 mb-6">Recipient Allocations ({batch.allocations?.length || 0})</h2>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {batch.allocations?.map((alloc) => (
                        <div key={alloc.id} className="p-4 bg-white flex justify-between items-center text-sm hover:bg-slate-50 transition-colors">
                        <div>
                            <p className="font-bold text-slate-900">{alloc.employee_name_snapshot}</p>
                            <p className="text-xs font-medium text-slate-400">{alloc.employee_code_snapshot ? `#${alloc.employee_code_snapshot}` : ''}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-black text-slate-900 font-mono text-base">{formatPaiseToINR(alloc.amount_paise)}</p>
                            <div className="mt-1 flex justify-end">
                                <IncentiveStatusBadge status={alloc.status} className="text-[10px] px-2 py-0.5" />
                            </div>
                        </div>
                        </div>
                    ))}
                    </div>
                </div>
            </div>

            {/* Sidebar Actions & Audit */}
            <div className="lg:col-span-1 space-y-6">
                {/* Action Buttons Toolbar */}
                {capabilities && (
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-3">
                        <h2 className="text-lg font-black text-slate-900 mb-4">Actions</h2>
                        {capabilities.canApprove && (
                        <button
                            onClick={() => setActionModal({ action: 'approve', label: 'Approve Award', requireReason: false })}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20"
                        >
                            <CheckCircle2 size={16} /> Approve
                        </button>
                        )}

                        {capabilities.canReject && (
                        <button
                            onClick={() => setActionModal({ action: 'reject', label: 'Reject Award', requireReason: true })}
                            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-rose-600/20"
                        >
                            <XCircle size={16} /> Reject
                        </button>
                        )}

                        {capabilities.canCancel && (
                        <button
                            onClick={() => setActionModal({ action: 'cancel', label: 'Cancel Award', requireReason: true })}
                            className="w-full py-3 bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-slate-700/20"
                        >
                            <AlertTriangle size={16} /> Cancel
                        </button>
                        )}

                        {capabilities.canMarkPaid && (
                        <button
                            onClick={() => setActionModal({ action: 'mark_paid', label: 'Mark as Paid', requireReason: false })}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20"
                        >
                            <DollarSign size={16} /> Mark Paid
                        </button>
                        )}

                        {capabilities.canReverse && (
                        <button
                            onClick={() => setActionModal({ action: 'reverse', label: 'Reverse Paid Award', requireReason: true })}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-purple-600/20"
                        >
                            <RotateCcw size={16} /> Reverse
                        </button>
                        )}
                        {!capabilities.canApprove && !capabilities.canReject && !capabilities.canCancel && !capabilities.canMarkPaid && !capabilities.canReverse && (
                            <p className="text-sm text-slate-400 text-center font-medium py-2">No actions available</p>
                        )}
                    </div>
                )}

                {/* Audit Trail Timeline */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                        <Clock size={18} className="text-indigo-500" /> Audit History
                    </h2>
                    <div className="space-y-4 border-l-2 border-slate-100 ml-2 pl-4">
                        {auditLogs.map((log) => (
                        <div key={log.id} className="relative group">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-slate-200 group-hover:bg-indigo-500 transition-colors border-2 border-white" />
                            <p className="font-bold text-slate-800 text-sm capitalize">{log.action.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                            By {log.actor_name || 'System'} · {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                            {log.new_data?.reason && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg mt-2 italic border border-slate-100">&quot;{log.new_data.reason}&quot;</p>
                            )}
                        </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Modal Dialog for Transition Reason Confirmation */}
        {actionModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-md p-8 space-y-6">
              <h3 className="text-xl font-black text-slate-900">{actionModal.label}</h3>
              <p className="text-sm text-slate-600 font-medium">
                Are you sure you want to execute {actionModal.action} on this award batch?
              </p>

              {actionModal.requireReason && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Reason (Required)</label>
                  <textarea
                    rows={3}
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter explicit reason for audit log..."
                    className="w-full p-4 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTransition}
                  disabled={processing || (actionModal.requireReason && reason.trim().length < 3)}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm Action'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
