import React from 'react';
import { ATTENDANCE_STATUS_META } from '@/lib/hrm/attendance';
import { LEAVE_STATUS_META } from '@/lib/hrm/leave';

export default function StatusBadge({ status, type = 'attendance' }) {
  let meta = { label: status, badgeCls: 'bg-slate-100 text-slate-600 border-slate-200' };

  if (type === 'attendance' && status in ATTENDANCE_STATUS_META) {
    meta = ATTENDANCE_STATUS_META[status];
  } else if (type === 'leave' && status in LEAVE_STATUS_META) {
    meta = LEAVE_STATUS_META[status];
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.badgeCls}`}>
      {meta.label}
    </span>
  );
}
