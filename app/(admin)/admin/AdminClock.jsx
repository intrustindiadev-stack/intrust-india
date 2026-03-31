"use client";

import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';

export default function AdminClock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="flex flex-col sm:items-end gap-1">
            <div className="flex items-center gap-2 bg-slate-900/5 dark:bg-white/5 px-4 py-2 rounded-2xl border border-slate-200/50 dark:border-white/5 backdrop-blur-sm shadow-sm transition-all hover:bg-slate-900/10 dark:hover:bg-white/10 group">
                <Clock className="w-4 h-4 text-blue-600 group-hover:rotate-12 transition-transform" />
                <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {formatTime(time)}
                </span>
            </div>
            <div className="flex items-center gap-1.5 px-2">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {formatDate(time)}
                </span>
            </div>
        </div>
    );
}
