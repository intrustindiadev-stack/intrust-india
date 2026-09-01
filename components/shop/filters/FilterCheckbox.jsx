'use client';

import React from 'react';

export default function FilterCheckbox({ label, isChecked, onChange }) {
    return (
        <label className="flex items-center gap-3 group cursor-pointer py-1.5">
            <div className="relative flex items-center justify-center w-5 h-5">
                <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={onChange}
                    className="peer appearance-none w-5 h-5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#151822] checked:bg-indigo-600 checked:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                />
                <svg
                    className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            </div>
            <span className={`text-sm transition-colors ${isChecked ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200'}`}>
                {label}
            </span>
        </label>
    );
}
