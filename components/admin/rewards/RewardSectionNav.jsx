import React from 'react';
import { motion } from 'framer-motion';

export function RewardSectionNav({ sections, activeSection, onSectionChange }) {
    return (
        <div className="flex overflow-x-auto lg:flex-col gap-2 pb-4 lg:pb-0 hide-scrollbar sticky top-24 z-10 bg-gray-50 dark:bg-gray-900 pt-4 lg:pt-0">
            {sections.map(section => {
                const isActive = activeSection === section.id;
                const Icon = section.icon;
                
                return (
                    <button
                        key={section.id}
                        onClick={() => onSectionChange(section.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap text-left flex-shrink-0 lg:flex-shrink ${
                            isActive 
                                ? 'bg-white dark:bg-gray-800 shadow-sm border-l-4 border-violet-500 text-gray-900 dark:text-white font-bold' 
                                : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        <Icon size={18} className={isActive ? 'text-violet-600 dark:text-violet-400' : ''} />
                        <span>{section.label}</span>
                        {section.isDirty && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 ml-auto" title="Unsaved changes"></span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
