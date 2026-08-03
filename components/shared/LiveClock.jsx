'use client';

import { useState, useEffect } from 'react';

/**
 * LiveClock — Real-time IST clock with pulsing LIVE indicator.
 * Displays: animated dot + "LIVE" label + current time + current date.
 * Updates every second via setInterval.
 */
export default function LiveClock({ className = '' }) {
    const [now, setNow] = useState(null);

    useEffect(() => {
        // Set initial time immediately on client
        setNow(new Date());
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        if (!date) return '--:--:--';
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Kolkata',
        });
    };

    const formatDate = (date) => {
        if (!date) return '---';
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'Asia/Kolkata',
        });
    };

    return (
        <div className={`flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-100 ${className}`}>
            {/* Pulsing LIVE dot */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">LIVE</span>
            <span className="w-px h-3.5 bg-gray-200 shrink-0" />

            <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Time */}
                <span className="font-mono text-xs sm:text-sm font-bold text-gray-800 tracking-tight tabular-nums mt-0.5">
                    {formatTime(now)}
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
                {/* Date */}
                <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {formatDate(now)}
                </span>
            </div>
        </div>
    );
}
