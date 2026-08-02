'use client';

import React, { useState } from 'react';
import { Calendar, Plus, CheckCircle, Lock, AlertTriangle } from 'lucide-react';
import Dialog from '@/components/hrm/Dialog';

export default function LeavePolicyYearSelector({
  policyYears = [],
  selectedYear,
  onSelectYear,
  onCreateYear,
  onPublishYear,
  publishing = false
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const [newYearForm, setNewYearForm] = useState({
    policy_year: new Date().getFullYear() + 1,
    name: `${new Date().getFullYear() + 1} Annual Leave Policy`,
    effective_from: `${new Date().getFullYear() + 1}-01-01`,
    effective_to: `${new Date().getFullYear() + 1}-12-31`
  });

  const selectedYearData = policyYears.find(y => y.policy_year === selectedYear);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    onCreateYear(newYearForm);
    setShowCreateModal(false);
  };

  const handlePublishConfirm = () => {
    if (selectedYearData) {
      onPublishYear(selectedYearData.id);
      setShowPublishModal(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Year Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
          Policy Year:
        </span>
        {policyYears.map((py) => (
          <button
            key={py.id}
            onClick={() => onSelectYear(py.policy_year)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              selectedYear === py.policy_year
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Calendar size={13} />
            <span>{py.policy_year}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
              py.status === 'published'
                ? 'bg-emerald-500/20 text-emerald-300'
                : py.status === 'draft'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-slate-500/20 text-slate-300'
            }`}>
              {py.status}
            </span>
          </button>
        ))}

        <button
          onClick={() => setShowCreateModal(true)}
          className="p-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:border-indigo-400 text-xs font-semibold flex items-center gap-1 shrink-0"
        >
          <Plus size={14} /> New Year
        </button>
      </div>

      {/* Publish Action */}
      {selectedYearData && (
        <div className="flex items-center gap-3">
          {selectedYearData.status === 'draft' ? (
            <button
              onClick={() => setShowPublishModal(true)}
              disabled={publishing}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <CheckCircle size={14} /> Publish {selectedYearData.policy_year} Policy
            </button>
          ) : (
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <Lock size={12} /> Active Published Policy
            </span>
          )}
        </div>
      )}

      {/* Create Year Modal */}
      <Dialog
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Leave Policy Year"
        description="Define a new policy year for entitlement configuration."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Policy Year
            </label>
            <input
              type="number"
              min={2020}
              max={2100}
              value={newYearForm.policy_year}
              onChange={e => setNewYearForm(prev => ({
                ...prev,
                policy_year: parseInt(e.target.value, 10),
                name: `${e.target.value} Annual Leave Policy`,
                effective_from: `${e.target.value}-01-01`,
                effective_to: `${e.target.value}-12-31`
              }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Policy Name
            </label>
            <input
              type="text"
              value={newYearForm.name}
              onChange={e => setNewYearForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Effective From
              </label>
              <input
                type="date"
                value={newYearForm.effective_from}
                onChange={e => setNewYearForm(prev => ({ ...prev, effective_from: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Effective To
              </label>
              <input
                type="date"
                value={newYearForm.effective_to}
                onChange={e => setNewYearForm(prev => ({ ...prev, effective_to: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow-xs"
            >
              Create Draft Year
            </button>
          </div>
        </form>
      </Dialog>

      {/* Publish Confirmation Modal */}
      <Dialog
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title={`Publish ${selectedYearData?.policy_year} Policy Year`}
        description="Publishing makes this policy active for employee leave requests."
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle size={16} className="text-amber-600" />
              <span>Important Publishing Notice</span>
            </div>
            <p>
              Publishing will initialize entitlement balances for all active employees for <strong>{selectedYearData?.policy_year}</strong>. Existing used, reserved, or manually adjusted days will not be overwritten.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowPublishModal(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePublishConfirm}
              disabled={publishing}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold shadow-xs disabled:opacity-50"
            >
              {publishing ? 'Publishing...' : 'Confirm & Publish Policy Year'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
