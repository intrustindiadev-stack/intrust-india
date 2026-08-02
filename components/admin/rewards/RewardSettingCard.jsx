import React from 'react';

export function RewardSettingCard({ icon: Icon, title, description, children, iconBgClass, iconTextClass }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${iconBgClass || 'bg-gray-50 dark:bg-gray-700'} rounded-xl flex items-center justify-center`}>
                        {Icon && <Icon size={18} className={iconTextClass || 'text-gray-600 dark:text-gray-300'} />}
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900 dark:text-white">{title}</h2>
                        {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
                    </div>
                </div>
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    );
}
