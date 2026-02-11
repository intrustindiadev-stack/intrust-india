
import { Check } from 'lucide-react';

export default function VerifiedBadge({ size = 'sm', className = '' }) {
    // Size variants
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    };

    const iconSizes = {
        sm: 10,
        md: 12,
        lg: 14
    };

    return (
        <div
            className={`
                bg-blue-600 text-white rounded-full flex items-center justify-center shadow-sm
                ${sizes[size] || sizes.sm}
                ${className}
            `}
            title="Verified"
            aria-label="Verified"
        >
            <Check size={iconSizes[size] || 10} strokeWidth={4} />
        </div>
    );
}
