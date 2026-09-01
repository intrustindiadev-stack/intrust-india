'use client';

import React from 'react';

export default function SizeGrid({ label, isSelected, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center w-full aspect-square md:aspect-auto md:h-10 text-xs font-bold rounded-lg border transition-all cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-[#151822] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400'
            }`}
        >
            {label}
        </button>
    );
}
