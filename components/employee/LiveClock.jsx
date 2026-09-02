'use client';

import { useState, useEffect } from 'react';
import { calculateElapsedTime } from '@/lib/hrm/date';

/**
 * Isolated live digital clock component.
 * Encapsulates 1-second interval timer state to prevent re-rendering parent pages.
 */
export function LiveClock({ timezone = 'Asia/Kolkata', className = '' }) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <span className={className}>
            {time.toLocaleTimeString('en-IN', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
            })}
        </span>
    );
}

/**
 * Isolated live shift elapsed duration timer.
 * Encapsulates 1-second interval timer state to prevent re-rendering parent pages.
 */
export function LiveShiftDuration({ checkInTime, className = '' }) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!checkInTime) return null;

    return (
        <span className={className}>
            {calculateElapsedTime(checkInTime, now)}
        </span>
    );
}
