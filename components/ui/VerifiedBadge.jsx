
import { Check } from 'lucide-react';

export default function VerifiedBadge({ size = 'sm', className = '' }) {
    // Size variants - slightly larger for better visibility
    const sizes = {
        sm: 'w-5 h-5',
        md: 'w-6 h-6',
        lg: 'w-7 h-7',
        xl: 'w-14 h-14' // Added for the large profile view
    };

    const iconSizes = {
        sm: 12,
        md: 14,
        lg: 16,
        xl: 32
    };

    return (
        <div
            className={`
                bg-gradient-to-br from-blue-500 to-blue-600 
                text-white rounded-full flex items-center justify-center 
                shadow-sm shadow-blue-200 border border-blue-400/20
                ${sizes[size] || sizes.sm}
                ${className}
            `}
            title="Verified"
            aria-label="Verified"
        >
            <Check size={iconSizes[size] || 12} strokeWidth={3} className="drop-shadow-sm" />
        </div>
    );
}
