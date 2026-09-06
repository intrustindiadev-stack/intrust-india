'use client';

import React from 'react';

export default function FilterCheckbox({ label, isChecked, onChange }) {
    return (
        <label className="flex items-center justify-between group cursor-pointer py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
            <div className="flex items-center gap-2.5">
                <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
                    <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={onChange}
                        className="peer appearance-none w-4 h-4 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-[#151822] checked:bg-sky-500 checked:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all cursor-pointer"
                    />
                    <svg
                        className="absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
                <span className={`text-xs transition-colors select-none ${
                    isChecked 
                        ? 'text-sky-600 dark:text-sky-400 font-semibold' 
                        : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 font-medium'
                }`}>
                    {label}
                </span>
            </div>
            {isChecked && (
                <span className="text-[11px] font-bold text-sky-500 dark:text-sky-400 select-none">
                    ✓
                </span>
            )}
        </label>
    );
}

