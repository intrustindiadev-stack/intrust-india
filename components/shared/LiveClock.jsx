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
        <div className={`hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-100 ${className}`}>
            {/* Pulsing LIVE dot */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">LIVE</span>
            <span className="w-px h-3.5 bg-gray-200 shrink-0" />
            {/* Time */}
            <span className="text-sm font-mono font-bold text-gray-800 tabular-nums">
                {formatTime(now)}
            </span>
            <span className="w-px h-3.5 bg-gray-200 shrink-0" />
            {/* Date */}
            <span className="text-xs font-semibold text-gray-500">
                {formatDate(now)}
            </span>
        </div>
    );
}
