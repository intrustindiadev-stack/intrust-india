import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down';
  };
}

export default function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
      <div>
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-600" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-gray-500 mt-4">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>

      {trend && (
        <div className="flex items-center gap-1 mt-2 text-xs">
          {trend.direction === 'up' ? (
            <ArrowUpRight className="w-3 h-3 text-green-600" aria-hidden="true" />
          ) : (
            <ArrowDownRight className="w-3 h-3 text-red-600" aria-hidden="true" />
          )}
          <span
            className={
              trend.direction === 'up' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
            }
          >
            {trend.value}% {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}
