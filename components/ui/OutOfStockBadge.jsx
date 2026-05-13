'use client';

import { PackageX } from 'lucide-react';
import { OOS_LABEL } from '@/lib/shopping/stock';
import { useTheme } from '@/lib/contexts/ThemeContext';

const OutOfStockBadge = ({ size = 'md', variant = 'solid', className = '', icon = true }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const sizeMap = {
        sm: {
            pill: 'px-2 py-0.5 text-[10px]',
            icon: 10
        },
        md: {
            pill: 'px-2.5 py-1 text-[11px]',
            icon: 12
        },
        lg: {
            pill: 'px-3 py-1.5 text-xs',
            icon: 14
        }
    };

    const variantMap = {
        solid: {
            light: 'bg-red-600 text-white',
            dark: 'bg-red-600 text-white'
        },
        soft: {
            light: 'bg-red-50 text-red-600 border border-red-100',
            dark: 'bg-red-900/20 text-red-400 border border-red-800/30'
        }
    };

    const currentSize = sizeMap[size] || sizeMap.md;
    const currentVariant = variantMap[variant] || variantMap.solid;
    const variantClasses = isDark ? currentVariant.dark : currentVariant.light;

    return (
        <span className={`inline-flex items-center gap-1 rounded-full font-black uppercase tracking-wider ${currentSize.pill} ${variantClasses} ${className}`}>
            {icon && <PackageX size={currentSize.icon} strokeWidth={2.5} className="shrink-0" />}
            {OOS_LABEL}
        </span>
    );
};

export default OutOfStockBadge;
