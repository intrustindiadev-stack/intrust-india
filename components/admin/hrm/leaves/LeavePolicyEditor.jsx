'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Check, X, Shield, Info } from 'lucide-react';
import Dialog from '@/components/hrm/Dialog';

export default function LeavePolicyEditor({ policyYear, policies = [], onSavePolicy }) {
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const defaultForm = {
    policy_year_id: policyYear?.id,
    leave_type_key: 'casual',
    display_name: 'Casual Leave',
    description: '',
    annual_entitlement: 12,
    is_paid: true,
    is_active: true,
    requires_balance: true,
    allow_half_day: true,
    allow_negative_balance: false,
    max_consecutive_days: 3,
    min_notice_days: 1,
    max_carry_forward_days: 0,
    requires_attachment_after_days: null,
    sort_order: 10
  };

  const [form, setForm] = useState(defaultForm);

  const handleOpenNew = () => {
    setEditingPolicy(null);
    setForm({ ...defaultForm, policy_year_id: policyYear?.id });
    setShowModal(true);
  };

  const handleOpenEdit = (pol) => {
    setEditingPolicy(pol);
    setForm({
      policy_year_id: policyYear?.id,
      leave_type_key: pol.leave_type_key,
      display_name: pol.display_name,
      description: pol.description || '',
      annual_entitlement: pol.annual_entitlement,
      is_paid: pol.is_paid,
      is_active: pol.is_active,
      requires_balance: pol.requires_balance,
      allow_half_day: pol.allow_half_day,
      allow_negative_balance: pol.allow_negative_balance,
      max_consecutive_days: pol.max_consecutive_days || '',
      min_notice_days: pol.min_notice_days,
      max_carry_forward_days: pol.max_carry_forward_days,
      requires_attachment_after_days: pol.requires_attachment_after_days || '',
      sort_order: pol.sort_order
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSavePolicy({
      ...form,
      policy_year_id: policyYear?.id,
      annual_entitlement: Number(form.annual_entitlement),
      max_consecutive_days: form.max_consecutive_days !== '' ? Number(form.max_consecutive_days) : null,
      min_notice_days: Number(form.min_notice_days),
      max_carry_forward_days: Number(form.max_carry_forward_days),
      requires_attachment_after_days: form.requires_attachment_after_days !== '' ? Number(form.requires_attachment_after_days) : null,
      sort_order: Number(form.sort_order)
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Leave Entitlements & Policy Rules ({policyYear?.policy_year})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure available leave types, annual entitlements, notice limits, and balance requirements.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus size={14} /> Add Leave Type Rule
        </button>
      </div>

      {/* Policies Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Leave Type Key / Display</th>
                <th className="py-3 px-4">Entitlement</th>
                <th className="py-3 px-4">Paid / Balance</th>
                <th className="py-3 px-4">Notice / Limits</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {policies.length > 0 ? (
                policies.map((pol) => (
                  <tr key={pol.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{pol.display_name}</span>
                      <span className="block text-[11px] font-mono text-slate-400">key: {pol.leave_type_key}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {pol.requires_balance ? `${pol.annual_entitlement} days/yr` : 'Benefit (Uncapped)'}
                    </td>
                    <td className="py-3 px-4 space-x-1">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        pol.is_paid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {pol.is_paid ? 'Paid' : 'Unpaid'}
                      </span>
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        {pol.requires_balance ? 'Requires Bal' : 'No Cap'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                      <div>Notice: <strong>{pol.min_notice_days}d</strong></div>
                      {pol.max_consecutive_days && <div>Max Consecutive: <strong>{pol.max_consecutive_days}d</strong></div>}
                      {pol.max_carry_forward_days > 0 && <div>Carry Forward: <strong>{pol.max_carry_forward_days}d</strong></div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        pol.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {pol.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(pol)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Edit Policy"
                      >
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No leave policies configured for this year. Click &quot;Add Leave Type Rule&quot; to begin setup.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      <Dialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingPolicy ? `Edit Leave Policy (${form.display_name})` : 'New Leave Policy Rule'}
        description="Configure entitlement limits, paid status, notice days, and balance behavior."
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Leave Type Key
              </label>
              <input
                type="text"
                value={form.leave_type_key}
                disabled={!!editingPolicy}
                onChange={e => setForm(prev => ({ ...prev, leave_type_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                placeholder="e.g. casual, sick, earned"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={form.display_name}
                onChange={e => setForm(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="e.g. Casual Leave"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description for employees..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Annual Entitlement
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={form.annual_entitlement}
                onChange={e => setForm(prev => ({ ...prev, annual_entitlement: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Min Notice (Days)
              </label>
              <input
                type="number"
                min="0"
                value={form.min_notice_days}
                onChange={e => setForm(prev => ({ ...prev, min_notice_days: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Max Carry Forward
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={form.max_carry_forward_days}
                onChange={e => setForm(prev => ({ ...prev, max_carry_forward_days: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Max Consecutive Days
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={form.max_consecutive_days}
                onChange={e => setForm(prev => ({ ...prev, max_consecutive_days: e.target.value }))}
                placeholder="Optional max limit"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm(prev => ({ ...prev, sort_order: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg">
              <input
                type="checkbox"
                checked={form.is_paid}
                onChange={e => setForm(prev => ({ ...prev, is_paid: e.target.checked }))}
                className="rounded text-indigo-600"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Paid Leave</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg">
              <input
                type="checkbox"
                checked={form.requires_balance}
                onChange={e => setForm(prev => ({ ...prev, requires_balance: e.target.checked }))}
                className="rounded text-indigo-600"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Requires Balance</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg">
              <input
                type="checkbox"
                checked={form.allow_half_day}
                onChange={e => setForm(prev => ({ ...prev, allow_half_day: e.target.checked }))}
                className="rounded text-indigo-600"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Allow Half-Day</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded text-indigo-600"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Is Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow-xs"
            >
              Save Policy Rule
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
