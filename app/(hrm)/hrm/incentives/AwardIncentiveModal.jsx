'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plus, User, Users, ShieldAlert, Sparkles } from 'lucide-react';
import RecipientCombobox from '@/components/hrm/incentives/RecipientCombobox';
import TeamAllocationPreview from '@/components/hrm/incentives/TeamAllocationPreview';
import { CANONICAL_INCENTIVE_TYPES, INCENTIVE_TYPE_LABELS } from '@/lib/hrm/incentives';
import { v4 as uuidv4 } from 'uuid';

export default function AwardIncentiveModal({ onSuccess }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [idempotencyKey, setIdempotencyKey] = useState('');

  const [formData, setFormData] = useState({
    recipient_mode: 'individual', // 'individual' | 'team'
    employee_id: '',
    team_id: '',
    allocation_mode: 'per_person', // 'per_person' | 'total_pool'
    incentive_type: 'performance_bonus',
    amount: '',
    include_lead: true,
    effective_date: new Date().toISOString().split('T')[0],
    description: '',
    internal_note: '',
  });

  const openModal = () => {
    setIdempotencyKey(uuidv4());
    setError('');
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setError('');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        recipient_mode: formData.recipient_mode,
        incentive_type: formData.incentive_type,
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        internal_note: formData.internal_note.trim() || undefined,
        effective_date: formData.effective_date,
        idempotency_key: idempotencyKey,
      };

      if (formData.recipient_mode === 'individual') {
        if (!formData.employee_id) {
          throw new Error('Please select an employee recipient.');
        }
        payload.employee_id = formData.employee_id;
      } else {
        if (!formData.team_id) {
          throw new Error('Please select a target team.');
        }
        payload.team_id = formData.team_id;
        payload.allocation_mode = formData.allocation_mode;
        payload.include_lead = formData.include_lead;
      }

      const res = await fetch('/api/hrm/incentives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to award incentive');
      }

      closeModal();
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
      >
        <Plus size={15} /> Award Incentive
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div>
                <h3 id="modal-title" className="text-base font-bold text-slate-900">
                  Award Financial Incentive
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Award bonuses to an individual employee or an entire team.</p>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                  {error}
                </div>
              )}

              {/* Mode Segmented Control */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Recipient Mode</label>
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recipient_mode: 'individual' })}
                    className={`py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                      formData.recipient_mode === 'individual' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                    }`}
                  >
                    <User size={14} /> Individual Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recipient_mode: 'team' })}
                    className={`py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                      formData.recipient_mode === 'team' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                    }`}
                  >
                    <Users size={14} /> Team Award
                  </button>
                </div>
              </div>

              {/* Recipient Selection */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {formData.recipient_mode === 'individual' ? 'Select Employee' : 'Select Target Team'}
                </label>
                <RecipientCombobox
                  mode={formData.recipient_mode}
                  value={formData.recipient_mode === 'individual' ? formData.employee_id : formData.team_id}
                  onChange={(id) => {
                    if (formData.recipient_mode === 'individual') {
                      setFormData({ ...formData, employee_id: id });
                    } else {
                      setFormData({ ...formData, team_id: id });
                    }
                  }}
                  placeholder={`Search active ${formData.recipient_mode === 'individual' ? 'employee' : 'team'}...`}
                />
              </div>

              {/* Team Allocation Mode Controls */}
              {formData.recipient_mode === 'team' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Allocation Logic</label>
                    <select
                      value={formData.allocation_mode}
                      onChange={(e) => setFormData({ ...formData, allocation_mode: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="per_person">Per Person Amount</option>
                      <option value="total_pool">Total Financial Pool Split</option>
                    </select>
                  </div>
                  <div className="space-y-1 flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 pb-2">
                      <input
                        type="checkbox"
                        checked={formData.include_lead}
                        onChange={(e) => setFormData({ ...formData, include_lead: e.target.checked })}
                        className="rounded text-slate-900 focus:ring-slate-900 h-4 w-4"
                      />
                      <span>Include Team Lead</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Team Allocation Live Preview */}
              {formData.recipient_mode === 'team' && formData.team_id && formData.amount && (
                <TeamAllocationPreview
                  teamId={formData.team_id}
                  allocationMode={formData.allocation_mode}
                  amount={formData.amount}
                  includeLead={formData.include_lead}
                />
              )}

              {/* Award Type & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Incentive Type</label>
                  <select
                    required
                    value={formData.incentive_type}
                    onChange={(e) => setFormData({ ...formData, incentive_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {CANONICAL_INCENTIVE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {INCENTIVE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {formData.recipient_mode === 'team' && formData.allocation_mode === 'per_person'
                      ? 'Amount Per Member (₹)'
                      : 'Amount (₹)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10000000"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Effective Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Effective Date</label>
                <input
                  type="date"
                  required
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Description / Reason (Employee Visible) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Award Reason / Description <span className="text-slate-400 font-normal">(Employee Visible)</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                  placeholder="e.g. Q3 Sales Target Achievement Bonus"
                />
              </div>

              {/* Internal Note (HR Confidential) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <ShieldAlert size={13} className="text-amber-600" /> Internal Note <span className="text-slate-400 font-normal">(HR Confidential)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.internal_note}
                  onChange={(e) => setFormData({ ...formData, internal_note: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                  placeholder="Notes for HR/Admin approval context..."
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? 'Processing...' : 'Award Incentive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
