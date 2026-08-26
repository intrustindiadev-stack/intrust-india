'use client';

import { motion } from 'framer-motion';

export default function DashboardTabs({ tabs, activeTab, onChange }) {
    return (
        <div className="flex p-1 space-x-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-x-auto no-scrollbar max-w-full w-fit">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`relative flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm font-bold rounded-xl outline-none transition-colors whitespace-nowrap ${
                            isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-700/30'
                        }`}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="active-tab"
                                className="absolute inset-0 bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600 rounded-xl"
                                initial={false}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            {Icon && <Icon size={16} className={isActive ? 'text-cyan-600 dark:text-cyan-400' : ''} />}
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
