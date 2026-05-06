'use client';

import { cn } from '@/lib/utils';

export default function Skeleton({ className, variant = 'rectangle', ...props }) {
    return (
        <div
            className={cn(
                "animate-pulse bg-gray-200 dark:bg-gray-700",
                variant === 'circle' && "rounded-full",
                variant === 'rectangle' && "rounded-2xl",
                className
            )}
            {...props}
        />
    );
}
