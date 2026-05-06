'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

/**
 * @typedef {{ id: string; title: string; body: string; type: string; read: boolean; reference_id: string | null; reference_type: string | null; created_at: string }} Notification
 */

/**
 * @param {{ apiPath: string; variant?: 'admin' | 'minimal' | 'header' | 'navbar' }} props
 */
export default function NotificationBell({ apiPath, variant = 'admin' }) {
    const [open, setOpen] = useState(false);
    /** @type {[Notification[], React.Dispatch<React.SetStateAction<Notification[]>>]} */
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [pos, setPos] = useState({ top: 0, right: 0 });
    const [mounted, setMounted] = useState(false);
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);
    const pollRef = useRef(null);
    const router = useRouter();

    useEffect(() => { setMounted(true); }, []);

    const fetchNotifications = useCallback(async (isLoadMore = false) => {
        try {
            if (isLoadMore) setLoadingMore(true);
            else setLoading(true);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const currentOffset = isLoadMore ? offset : 0;
            const res = await fetch(`${apiPath}?limit=20&offset=${currentOffset}`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });

            if (!res.ok) return;
            const data = await res.json();

            if (isLoadMore) {
                setNotifications(prev => [...prev, ...(data.notifications || [])]);
            } else {
                setNotifications(data.notifications || []);
            }

            setUnreadCount(data.unreadCount || 0);
            setHasMore(data.hasMore || false);
            if (data.notifications?.length > 0) {
                setOffset(currentOffset + data.notifications.length);
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [apiPath, offset]);

    useEffect(() => {
        fetchNotifications();

        // Polling for count primarily
        pollRef.current = setInterval(() => fetchNotifications(false), 30000);

        // Supabase Realtime subscription for instant notification updates
        let realtimeChannel = null;
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session?.user) return;
            realtimeChannel = supabase
                .channel(`notifications:${session.user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${session.user.id}`,
                    },
                    (payload) => {
                        setNotifications(prev => [payload.new, ...prev]);
                        setUnreadCount(prev => prev + 1);
                        setOffset(prev => prev + 1);
                    }
                )
                .subscribe();
        });

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (realtimeChannel) supabase.removeChannel(realtimeChannel);
        };
    }, []); // Only once on mount

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
            // Just local update to avoid full refetch
            if (id) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } else {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                setUnreadCount(0);
            }
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

    /** 
     * @param {string} type 
     * @param {string} referenceType
     */
    const typeIcon = (type, referenceType) => {
        // First priority: Specific icons for reference types
        switch (referenceType) {
            case 'chatbot_connected': return 'smart_toy';
            case 'whatsapp_connected': return 'chat';
            case 'reward_conversion': return 'redeem';
            case 'reward_adjustment': return 'account_balance_wallet';
            case 'referral_joined': return 'person_add';
            case 'referral_new_member': return 'group_add';
            case 'merchant_application': return 'storefront';
            case 'merchant_approved': return 'verified';
            case 'merchant_subscription': return 'card_membership';
            case 'order':
            case 'shopping_order': return 'shopping_bag';
            case 'wallet':
            case 'wallet_adjustment': return 'payments';
            case 'payout_request':
            case 'bank_verification': return 'account_balance';
            case 'udhari_request': return 'request_quote';
            case 'udhari_approved':
            case 'udhari_denied':
            case 'udhari_completed':
            case 'udhari_reminder': return 'credit_score';
            case 'gift_card_purchase': return 'card_giftcard';
            case 'custom_product_submission':
            case 'product_approved':
            case 'product_rejected': return 'inventory_2';
            case 'admin_task': return 'assignment';
            default: break;
        }

        // Fallback to general type icons
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

    /** @param {Notification} n */
    const handleNotificationClick = (n) => {
        if (!n.read) markRead(n.id);

        setOpen(false); // Close dropdown

        if (!n.reference_type) return;

        // Determine user context from the API path used by this bell instance
        const isAdmin = apiPath.includes('/admin');
        const isMerchant = apiPath.includes('/merchant');

        switch (n.reference_type) {
            // ── Merchant onboarding ──────────────────────────────────────────
            case 'merchant_application':
                // Admin gets notified → go to admin merchants list
                router.push('/admin/merchants');
                break;

            case 'merchant_approved':
                // Customer/user gets notified → go to subscription payment page
                router.push('/merchant-subscribe');
                break;

            case 'merchant_subscription':
                // Merchant gets notified after subscription payment
                router.push('/merchant/dashboard');
                break;

            // ── Shopping orders ──────────────────────────────────────────────
            case 'order':
            case 'shopping_order':
                if (n.reference_id) {
                    if (isAdmin) {
                        router.push(`/admin/shopping/orders/${n.reference_id}`);
                    } else if (isMerchant) {
                        router.push(`/merchant/shopping/orders`);
                    } else {
                        router.push(`/orders/${n.reference_id}`);
                    }
                } else {
                    if (isAdmin) router.push('/admin/shopping/orders');
                    else if (isMerchant) router.push('/merchant/shopping/orders');
                    else router.push('/orders');
                }
                break;

            // ── Wallet & adjustments ─────────────────────────────────────────
            case 'wallet':
            case 'wallet_adjustment':
                if (isAdmin) router.push('/admin/wallet-adjustments');
                else if (isMerchant) router.push('/merchant/wallet');
                else router.push('/wallet');
                break;

            // ── Payout requests ──────────────────────────────────────────────
            case 'payout_request':
                if (isAdmin) router.push('/admin/payouts');
                else router.push('/merchant/wallet');
                break;

            // ── Bank verification ────────────────────────────────────────────
            case 'bank_verification':
                // Merchant gets notified
                router.push('/merchant/settings');
                break;

            // ── Udhari / Store credit ────────────────────────────────────────
            case 'udhari_request':
                // Merchant gets notified of a new store credit request
                router.push('/merchant/udhari');
                break;

            case 'udhari_approved':
            case 'udhari_denied':
            case 'udhari_completed':
            case 'udhari_reminder':
            case 'udhari_overdue_alert':
                // Customer gets notified about their store credit status
                if (isMerchant) router.push('/merchant/udhari');
                else router.push('/store-credits');
                break;

            // ── Wholesale / Inventory ────────────────────────────────────────
            case 'wholesale_purchase':
            case 'wholesale_product':
            case 'merchant_inventory':
                // Merchant gets notified
                router.push('/merchant/shopping/inventory');
                break;

            case 'platform_product':
                // Admin gets notified
                if (isAdmin) router.push('/admin/shopping');
                break;

            // ── Lockin / Growth fund ─────────────────────────────────────────
            case 'lockin_balance':
                // Merchant gets notified
                router.push('/merchant/lockin');
                break;

            // ── Loans ────────────────────────────────────────────────────────
            case 'loan':
                if (isAdmin) router.push('/admin');
                else router.push('/loans/personal');
                break;

            // ── Gift cards ───────────────────────────────────────────────────
            case 'gift_card_purchase':
            case 'GIFT_CARD_PURCHASE':
                router.push('/my-giftcards');
                break;

            // ── Custom Product Approval ─────────────────────────────────────
            case 'custom_product_submission':
                if (isAdmin) router.push('/admin/shopping?tab=custom');
                break;

            case 'product_approved':
            case 'product_rejected':
                if (isMerchant) router.push('/merchant/shopping/inventory');
                break;

            // ── Admin Tasks ──────────────────────────────────────────────────
            case 'admin_task':
                if (n.reference_id) {
                    router.push(`/admin/tasks`);
                } else {
                    router.push('/admin/tasks');
                }
                break;

            // Chatbot
            case 'chatbot_connected':
                break;

            // WhatsApp
            case 'whatsapp_connected':
                router.push('/profile/whatsapp');
                break;

            // Rewards
            case 'reward_conversion':
            case 'reward_adjustment':
                if (isMerchant) router.push('/merchant/dashboard');
                else router.push('/rewards');
                break;

            // Referrals
            case 'referral_joined':
            case 'referral_new_member':
                if (isMerchant) router.push('/merchant/dashboard');
                else router.push('/refer');
                break;

            default:
                break;
        }
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
                    <button onClick={() => fetchNotifications(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className={`material-icons-round text-sm ${(loading && !loadingMore) ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-black/5 dark:divide-white/5 bg-white dark:bg-slate-900">
                {notifications.length === 0 && !loading ? (
                    <div className="py-10 text-center">
                        <span className="material-icons-round text-slate-300 dark:text-slate-600 text-4xl">notifications_none</span>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">No notifications yet</p>
                    </div>
                ) : (
                    notifications.map((n) => (
                        <button
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`w-full text-left px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors flex gap-3 items-start ${!n.read ? 'bg-[#D4AF37]/5' : ''}`}
                        >
                             <span className={`material-icons-round text-lg mt-0.5 flex-shrink-0 ${typeColor(n.type)}`}>
                                {typeIcon(n.type, n.reference_type)}
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

                {hasMore && (
                    <div className="p-3 bg-black/[0.01] dark:bg-white/[0.01]">
                        <button
                            onClick={() => fetchNotifications(true)}
                            disabled={loadingMore}
                            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-[#D4AF37] dark:text-slate-400 transition-colors flex items-center justify-center gap-2"
                        >
                            {loadingMore ? (
                                <>
                                    <span className="material-icons-round text-sm animate-spin">refresh</span>
                                    Loading...
                                </>
                            ) : (
                                'View older notifications'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    ) : null;

    const buttonClass = variant === 'navbar'
        ? 'relative p-2 rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
        : variant === 'minimal'
            ? 'relative p-2 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
            : variant === 'header'
                ? 'relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-90 duration-200'
                : 'relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors';

    return (
        <>
            <button
                ref={buttonRef}
                onClick={handleOpen}
                className={buttonClass}
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
