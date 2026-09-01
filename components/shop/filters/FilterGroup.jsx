'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function FilterGroup({ title, children, defaultExpanded = true }) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="py-5 border-t border-gray-200 dark:border-white/10 first:border-0 first:pt-0">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between w-full text-left"
            >
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    {title}
                </h3>
                {isExpanded ? (
                    <ChevronUp size={16} className="text-gray-500" />
                ) : (
                    <ChevronDown size={16} className="text-gray-500" />
                )}
            </button>
            
            {isExpanded && (
                <div className="mt-4">
                    {children}
                </div>
            )}
        </div>
    );
}
