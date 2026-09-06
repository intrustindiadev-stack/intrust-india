'use client';

import React from 'react';
import { Check } from 'lucide-react';

export default function ColorSwatch({ label, hex, isSelected, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            className={`relative flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all cursor-pointer outline-none ${
                isSelected 
                    ? 'border-sky-500 scale-110 shadow-xs' 
                    : 'border-transparent hover:scale-105'
            }`}
        >
            <span
                className="w-full h-full rounded-full border border-black/10 dark:border-white/15"
                style={{ backgroundColor: hex }}
            />
            {isSelected && (
                <div className={`absolute inset-0 flex items-center justify-center ${['#ffffff', 'white'].includes(hex.toLowerCase()) ? 'text-black' : 'text-white'}`}>
                    <Check size={12} strokeWidth={3.5} />
                </div>
            )}
        </button>
    );
}

