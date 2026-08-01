'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, DollarSign, RotateCcw, Shield, Clock, FileText, User } from 'lucide-react';
import IncentiveStatusBadge from './IncentiveStatusBadge';
import { formatPaiseToINR, INCENTIVE_TYPE_LABELS } from '@/lib/hrm/incentives';

export default function IncentiveDetailsDrawer({ batchId, onClose, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [actionModal, setActionModal] = useState(null); // { action, label, requireReason }
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
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (!batchId) return null;

  const batch = data?.batch;
  const capabilities = data?.capabilities;
  const auditLogs = data?.audit_logs || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Incentive Award Details</h2>
              {batch && <IncentiveStatusBadge status={batch.status} />}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">ID: {batchId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading award details...</div>
          ) : batch ? (
            <>
              {/* Primary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Award Type</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{INCENTIVE_TYPE_LABELS[batch.incentive_type] || batch.incentive_type}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Recipient Mode</p>
                  <p className="font-semibold text-slate-900 mt-0.5 capitalize">{batch.recipient_mode}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Total Amount</p>
                  <p className="font-semibold text-slate-900 mt-0.5 text-sm font-mono">{formatPaiseToINR(batch.total_amount_paise)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Effective Date</p>
                  <p className="font-medium text-slate-700 mt-0.5">{batch.effective_date}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Payroll Period</p>
                  <p className="font-medium text-slate-700 mt-0.5">
                    {batch.payroll_month && batch.payroll_year ? `${batch.payroll_month}/${batch.payroll_year}` : 'Next Available'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Version</p>
                  <p className="font-medium text-slate-700 mt-0.5 font-mono">v{batch.version}</p>
                </div>
              </div>

              {/* Description & Internal Notes */}
              <div className="space-y-3">
                {batch.description && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Reason / Description</h4>
                    <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">{batch.description}</p>
                  </div>
                )}
                {batch.internal_note && (
                  <div>
                    <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Shield size={13} /> Internal Note (HR Confidential)
                    </h4>
                    <p className="text-xs text-slate-700 bg-amber-50/50 p-3 rounded-lg border border-amber-200/60">{batch.internal_note}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons Toolbar */}
              {capabilities && (
                <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-b border-slate-200 py-4">
                  {capabilities.canApprove && (
                    <button
                      onClick={() => setActionModal({ action: 'approve', label: 'Approve Award', requireReason: false })}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 size={14} /> Approve
                    </button>
                  )}

                  {capabilities.canReject && (
                    <button
                      onClick={() => setActionModal({ action: 'reject', label: 'Reject Award', requireReason: true })}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  )}

                  {capabilities.canCancel && (
                    <button
                      onClick={() => setActionModal({ action: 'cancel', label: 'Cancel Award', requireReason: true })}
                      className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <AlertTriangle size={14} /> Cancel
                    </button>
                  )}

                  {capabilities.canMarkPaid && (
                    <button
                      onClick={() => setActionModal({ action: 'mark_paid', label: 'Mark as Paid', requireReason: false })}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <DollarSign size={14} /> Mark Paid
                    </button>
                  )}

                  {capabilities.canReverse && (
                    <button
                      onClick={() => setActionModal({ action: 'reverse', label: 'Reverse Paid Award', requireReason: true })}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <RotateCcw size={14} /> Reverse
                    </button>
                  )}
                </div>
              )}

              {/* Recipient Allocations */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recipient Allocations ({batch.allocations?.length || 0})</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {batch.allocations?.map((alloc) => (
                    <div key={alloc.id} className="p-3 bg-white flex justify-between items-center text-xs">
                      <div>
                        <p className="font-semibold text-slate-900">{alloc.employee_name_snapshot}</p>
                        <p className="text-[11px] text-slate-400">{alloc.employee_code_snapshot ? `#${alloc.employee_code_snapshot}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 font-mono">{formatPaiseToINR(alloc.amount_paise)}</p>
                        <IncentiveStatusBadge status={alloc.status} className="mt-0.5 text-[10px] px-2 py-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit Trail Timeline */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} /> Audit History & Actions
                </h4>
                <div className="space-y-2 border-l-2 border-slate-200 ml-2 pl-4 text-xs">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative group">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 group-hover:bg-slate-900 transition-colors" />
                      <p className="font-semibold text-slate-800">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-[11px] text-slate-500">
                        By {log.actor_name || 'System'} · {new Date(log.created_at).toLocaleString('en-IN')}
                      </p>
                      {log.new_data?.reason && (
                        <p className="text-[11px] text-slate-600 bg-slate-100 p-1.5 rounded mt-1 italic">&quot;{log.new_data.reason}&quot;</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Dialog for Transition Reason Confirmation */}
        {actionModal && (
          <div className="fixed inset-0 z-60 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
              <h3 className="text-base font-bold text-slate-900">{actionModal.label}</h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to execute {actionModal.action} on this award batch?
              </p>

              {actionModal.requireReason && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Reason (Required)</label>
                  <textarea
                    rows={3}
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter explicit reason for audit log..."
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTransition}
                  disabled={processing || (actionModal.requireReason && reason.trim().length < 3)}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
