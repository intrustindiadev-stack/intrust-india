import React from 'react';

export interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  delivered: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Delivered' },
  processing: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Processing' },
  shipped: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Shipped' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Cancelled' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500', label: 'Pending' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = (status || '').toLowerCase().trim();
  const config = statusConfig[normalizedStatus] || {
    ...statusConfig.pending,
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
