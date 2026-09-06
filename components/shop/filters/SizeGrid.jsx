'use client';

import React from 'react';

export default function SizeGrid({ label, isSelected, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center justify-center w-full h-8 text-xs font-semibold rounded-lg border transition-all cursor-pointer outline-none ${
                isSelected
                    ? 'bg-sky-500 text-white border-sky-500 shadow-xs font-bold'
                    : 'bg-white dark:bg-[#12141c] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-sky-300 hover:text-sky-600 dark:hover:border-sky-500/50 dark:hover:text-sky-400'
            }`}
        >
            {label}
        </button>
    );
}

