'use client';

import { Clock, Calendar, FileText, CheckCircle2, ChevronRight, TrendingUp, Star, Bell } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { motion } from 'framer-motion';

export default function EmployeeDashboard() {
    const { user, profile } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [clockInTime, setClockInTime] = useState(null);
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        const h = new Date().getHours();
        setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
        return () => clearInterval(timer);
    }, []);

    const handleClockToggle = () => {
        if (!isClockedIn) {
            setClockInTime(new Date());
            setIsClockedIn(true);
        } else {
            setIsClockedIn(false);
            setClockInTime(null);
        }
    };

    const getElapsedTime = () => {
        if (!clockInTime) return '';
        const diff = Math.floor((currentTime - clockInTime) / 1000);
        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const quickLinks = [
        { label: 'My Leaves', sub: 'Apply & track time off', href: '/employee/leaves', icon: Calendar, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
        { label: 'Payslips', sub: 'View salary slips', href: '/employee/payslips', icon: FileText, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        { label: 'Training', sub: 'Learning & development', href: '/employee/training', icon: Star, iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            {/* Greeting */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    {greeting}, {profile?.full_name?.split(' ')[0] || 'there'} 👋
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </motion.div>

            {/* Attendance Hero */}
            <motion.div
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
                className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl transition-all duration-700 ${isClockedIn ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30' : 'bg-gradient-to-br from-slate-800 to-gray-900 shadow-gray-900/30'}`}
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="text-center sm:text-left">
                        <p className="text-white/60 text-sm font-medium uppercase tracking-widest mb-1">Current Time</p>
                        <div className="text-5xl sm:text-6xl font-black tracking-tight font-mono">
                            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-sm justify-center sm:justify-start">
                            {isClockedIn ? (
                                <span className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full font-medium">
                                    <CheckCircle2 size={14} />
                                    Clocked in · {getElapsedTime()}
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full font-medium">
                                    <Clock size={14} />
                                    Not clocked in
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleClockToggle}
                        className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center gap-2 shadow-2xl transition-all hover:scale-105 active:scale-95 font-black text-lg tracking-wide ${isClockedIn ? 'bg-white text-emerald-600 shadow-emerald-500/30' : 'bg-white text-gray-800 shadow-black/20'}`}
                    >
                        <Clock size={32} className={isClockedIn ? 'text-emerald-500' : 'text-gray-700'} />
                        {isClockedIn ? 'CLOCK OUT' : 'CLOCK IN'}
                    </button>
                </div>
            </motion.div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {quickLinks.map((item, i) => (
                    <motion.div key={item.href} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                        <Link href={item.href} className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-violet-100 hover:-translate-y-0.5 transition-all group">
                            <div className={`w-12 h-12 rounded-2xl ${item.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                <item.icon size={22} className={item.iconColor} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 text-sm">{item.label}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                            </div>
                            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Upcoming Notice Banner */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <Bell size={20} className="text-amber-600 flex-shrink-0" />
                <div>
                    <p className="font-semibold text-amber-800 text-sm">April Payslip Available</p>
                    <p className="text-xs text-amber-600">Your salary slip for April 2026 has been generated. View it in Payslips.</p>
                </div>
                <Link href="/employee/payslips" className="ml-auto flex-shrink-0 text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2">View →</Link>
            </motion.div>
        </div>
    );
}
