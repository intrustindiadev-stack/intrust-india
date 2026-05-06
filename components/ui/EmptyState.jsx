'use client';

import { FileQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function EmptyState({ 
    icon: Icon = FileQuestion, 
    title = "No data found", 
    description = "There are no records to display at the moment.", 
    className,
    action
}) {
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 dark:bg-gray-800/30 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-700",
                className
            )}
        >
            <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-3xl flex items-center justify-center shadow-sm mb-6 text-gray-400">
                <Icon size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
                {title}
            </h3>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-xs mb-8">
                {description}
            </p>
            {action && (
                <div>{action}</div>
            )}
        </motion.div>
    );
}
