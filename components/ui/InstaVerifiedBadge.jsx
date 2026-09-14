'use client';

import React from 'react';

/**
 * Authentic Instagram-style verified badge (blue scalloped circle with white checkmark)
 */
export default function InstaVerifiedBadge({ size = 'md', className = '', title = 'KYC Verified' }) {
    const sizeClasses = {
        xs: 'w-3.5 h-3.5',
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
        xl: 'w-8 h-8',
    };

    const dimension = sizeClasses[size] || sizeClasses.md;

    return (
        <span 
            title={title} 
            className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
            aria-label={title}
        >
            <svg 
                className={`${dimension} text-[#0095F6] fill-[#0095F6] drop-shadow-[0_1px_2px_rgba(0,149,246,0.3)]`} 
                viewBox="0 0 24 24"
            >
                <path 
                    fillRule="evenodd" 
                    clipRule="evenodd"
                    d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" 
                />
            </svg>
        </span>
    );
}
