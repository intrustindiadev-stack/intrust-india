'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FilterGroup({ title, children, defaultExpanded = true, count = null }) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="py-4 border-t border-slate-100 dark:border-white/5 first:border-0 first:pt-0">
            <button 
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between w-full text-left group py-0.5 focus:outline-none"
            >
                <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {title}
                    </h3>
                    {count !== null && count !== undefined && (
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 font-mono">
                            {count}
                        </span>
                    )}
                </div>
                <ChevronDown 
                    size={15} 
                    className={`text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                    }`} 
                />
            </button>
            
            {isExpanded && (
                <div className="mt-3">
                    {children}
                </div>
            )}
        </div>
    );
}

