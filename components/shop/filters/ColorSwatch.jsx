'use client';

import React from 'react';
import { Check } from 'lucide-react';

export default function ColorSwatch({ label, hex, isSelected, onClick }) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-1 dark:focus:ring-offset-[#080a10] ${
                isSelected ? 'border-indigo-600 scale-110 shadow-md' : 'border-transparent hover:scale-110'
            }`}
        >
            <span
                className="w-full h-full rounded-full border border-black/10 dark:border-white/10"
                style={{ backgroundColor: hex }}
            />
            {isSelected && (
                <div className={`absolute inset-0 flex items-center justify-center ${['#ffffff', 'white'].includes(hex.toLowerCase()) ? 'text-black' : 'text-white'}`}>
                    <Check size={14} strokeWidth={4} />
                </div>
            )}
        </button>
    );
}
