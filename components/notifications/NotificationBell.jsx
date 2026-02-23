'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';

/**
 * @typedef {{ id: string; title: string; body: string; type: string; read: boolean; reference_id: string | null; reference_type: string | null; created_at: string }} Notification
 */

/**
 * @param {{ apiPath: string }} props
 */
export default function NotificationBell({ apiPath }) {
    const [open, setOpen] = useState(false);
    /** @type {[Notification[], React.Dispatch<React.SetStateAction<Notification[]>>]} */
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [pos, setPos] = useState({ top: 0, right: 0 });
    const [mounted, setMounted] = useState(false);
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);
    const pollRef = useRef(null);

    useEffect(() => { setMounted(true); }, []);

    const fetchNotifications = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch(apiPath, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch {
            // silently fail on poll
        }
    }, [apiPath]);

    useEffect(() => {
        fetchNotifications();
        pollRef.current = setInterval(fetchNotifications, 30000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [fetchNotifications]);

    // Close on outside click
    useEffect(() => {
        /** @param {MouseEvent} e */
        function handleOutside(e) {
            const target = /** @type {Node} */ (e.target);
            if (
                dropdownRef.current && !dropdownRef.current.contains(target) &&
                buttonRef.current && !buttonRef.current.contains(target)
            ) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener('mousedown', handleOutside);
            return () => document.removeEventListener('mousedown', handleOutside);
        }
    }, [open]);

    const markRead = async (/** @type {string | null} */ id) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const body = id ? { id } : { all: true };
            await fetch(apiPath, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(body),
            });
            fetchNotifications();
        } catch {
            // ignore
        }
    };

    const handleOpen = () => {
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPos({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            });
        }
        setOpen(prev => !prev);
    };

    /** @param {string} type */
    const typeIcon = (type) => {
        if (type === 'success') return 'check_circle';
        if (type === 'error') return 'cancel';
        if (type === 'warning') return 'warning';
        return 'info';
    };

    /** @param {string} type */
    const typeColor = (type) => {
        if (type === 'success') return 'text-emerald-500';
        if (type === 'error') return 'text-red-500';
        if (type === 'warning') return 'text-amber-500';
        return 'text-blue-400';
    };

    const dropdown = open && mounted ? createPortal(
        <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 99999 }}
            className="w-80 sm:w-96 bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">Notifications</span>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={() => markRead(null)}
                            className="text-xs text-[#D4AF37] hover:underline font-semibold"
                        >
                            Mark all read
                        </button>
                    )}
                    <button onClick={fetchNotifications} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className={`material-icons-round text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
                {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                        <span className="material-icons-round text-slate-300 dark:text-slate-600 text-4xl">notifications_none</span>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">No notifications yet</p>
                    </div>
                ) : (
                    notifications.map((n) => (
                        <button
                            key={n.id}
                            onClick={() => { if (!n.read) markRead(n.id); }}
                            className={`w-full text-left px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors flex gap-3 items-start ${!n.read ? 'bg-[#D4AF37]/5' : ''}`}
                        >
                            <span className={`material-icons-round text-lg mt-0.5 flex-shrink-0 ${typeColor(n.type)}`}>
                                {typeIcon(n.type)}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm font-semibold ${!n.read ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>{n.title}</p>
                                    {!n.read && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#D4AF37] mt-1" />}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.body}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                    {new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <>
            <button
                ref={buttonRef}
                onClick={handleOpen}
                className="relative p-2.5 rounded-xl bg-white/40 dark:bg-white/5 border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Notifications"
            >
                <span className="material-icons-round text-slate-600 dark:text-slate-300 text-xl">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
            {dropdown}
        </>
    );
}
