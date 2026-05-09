'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function MerchantWhatsAppConnect({ notifSettings, setNotifSettings }) {
    // — Status fetch —
    const [status, setStatus] = useState(null);
    const [statusLoading, setStatusLoading] = useState(true);

    // — Step 1: Send OTP —
    const [sending, setSending] = useState(false);

    const [errorMsg, setErrorMsg] = useState('');

    // — Step 2: OTP entry —
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    const cooldownRef = useRef(null);
    const otpInputRef = useRef(null);
    const redirectTimerRef = useRef(null);

    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        fetchStatus();
    }, []);

    useEffect(() => {
        if (otpSent) {
            startCooldown();
        }
        return () => clearInterval(cooldownRef.current);
    }, [otpSent]);

    useEffect(() => {
        if (otpSent && otpInputRef.current) {
            otpInputRef.current.focus();
        }
    }, [otpSent]);

    useEffect(() => {
        return () => {
            if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
        };
    }, []);

    async function fetchStatus() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/whatsapp/status', {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await res.json();
            setStatus(data);
        } catch {
            setStatus({ linked: false });
        } finally {
            setStatusLoading(false);
        }
    }

    function startCooldown() {
        clearInterval(cooldownRef.current);
        setCooldown(60);
        cooldownRef.current = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(cooldownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }

    const handleSendOtp = async () => {
        setSending(true);
        setErrorMsg('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/whatsapp/link-phone', { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await res.json();

            if (!res.ok) {
                setErrorMsg(data.error || 'Something went wrong. Please try again.');
            } else {
                setErrorMsg('');
                setOtp('');
                setOtpSent(true);
            }
        } catch {
            setErrorMsg('Network error. Please check your connection.');
        } finally {
            setSending(false);
        }
    };

    const handleResendOtp = async () => {
        setOtp('');
        setErrorMsg('');
        await handleSendOtp();
        startCooldown();
    };

    const handleVerifyOtp = async () => {
        if (otp.length !== 6 || verifying) return;

        setVerifying(true);
        setErrorMsg('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/whatsapp/verify-otp', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ otp }),
            });
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 400) setOtp('');
                setErrorMsg(data.error || 'Verification failed. Please try again.');
            } else {
                toast.success('WhatsApp connected successfully!');
                setErrorMsg('');
                setOtpSent(false);
                clearInterval(cooldownRef.current);
                await fetchStatus();

                // G11: auto-redirect only when on the standalone /merchant/whatsapp page
                if (pathname === '/merchant/whatsapp') {
                    const params = new URLSearchParams(window.location.search);
                    const redirectTo = params.get('redirect') || '/merchant/dashboard';
                    redirectTimerRef.current = setTimeout(() => {
                        router.push(redirectTo);
                    }, 1500);
                }
            }
        } catch {
            setErrorMsg('Network error. Please check your connection.');
        } finally {
            setVerifying(false);
        }
    };

    const handleOtpKeyDown = (e) => {
        if (e.key === 'Enter') handleVerifyOtp();
    };

    const handleCancelOtp = () => {
        setOtpSent(false);
        setOtp('');
        setErrorMsg('');
        clearInterval(cooldownRef.current);
        setCooldown(0);
    };

    const handleDisconnect = async () => {
        setDisconnecting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/merchant/whatsapp/status', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await res.json();

            if (res.ok) {
                await fetchStatus();
                toast.success('WhatsApp disconnected');
                setShowDisconnectModal(false);
            } else {
                toast.error(data.error || 'Failed to disconnect. Please try again.');
            }
        } catch (error) {
            toast.error('Network error. Please try again.');
        } finally {
            setDisconnecting(false);
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const masterOn = notifSettings?.whatsapp_notifications ?? false;

    const ALERT_CATEGORIES = [
        { id: 'whatsapp_order_alerts',        label: 'Order Alerts',        desc: 'New orders, cancellations, fulfillment requests', group: 'transactional' },
        { id: 'whatsapp_payout_alerts',        label: 'Payout Alerts',       desc: 'Payout status updates',                          group: 'transactional' },
        { id: 'whatsapp_store_credit_alerts',  label: 'Store Credit Alerts', desc: 'Store credit requests and payments',               group: 'transactional' },
        { id: 'whatsapp_kyc_alerts',           label: 'KYC Alerts',          desc: 'Bank verification and account approval',           group: 'transactional' },
        { id: 'whatsapp_subscription_alerts',  label: 'Subscription Alerts', desc: 'Subscription status changes',                     group: 'transactional' },
        { id: 'whatsapp_product_alerts',       label: 'Product Alerts',      desc: 'Product approval notifications',                  group: 'transactional' },
        { id: 'whatsapp_marketing',            label: 'Marketing',           desc: 'Future marketing campaigns',                      group: 'marketing'     },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between p-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 group hover:bg-black/[0.08] dark:hover:bg-white/10 transition-colors shadow-sm">
                <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <span className="material-icons-round text-[#25D366] mr-2 text-sm">mark_chat_unread</span>
                        Enable WhatsApp Alerts
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Receive important order alerts, payouts, and customer inquiries directly on WhatsApp.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notifSettings?.whatsapp_notifications ?? false}
                        onChange={async (e) => {
                            const newVal = e.target.checked;
                            setNotifSettings(prev => ({ ...prev, whatsapp_notifications: newVal }));

                            try {
                                const { data: { session } } = await supabase.auth.getSession();
                                const res = await fetch('/api/merchant/notification-settings', {
                                    method: 'PATCH',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${session?.access_token}`
                                    },
                                    body: JSON.stringify({ whatsapp_notifications: newVal })
                                });

                                const result = await res.json();
                                if (!result.success) throw new Error(result.error || 'Failed to save');
                                // Sync fan-out from server (all 7 sub-flags may have changed)
                                if (result.settings) {
                                    setNotifSettings(prev => ({ ...prev, ...result.settings }));
                                }
                                toast.success('WhatsApp preferences saved');
                            } catch (err) {
                                setNotifSettings(prev => ({ ...prev, whatsapp_notifications: !newVal }));
                                toast.error(err.message || 'Failed to update preferences');
                            }
                        }}
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25D366]"></div>
                </label>
            </div>

            {/* Alert Categories */}
            <div className="p-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center">
                    <span className="material-icons-round text-slate-500 mr-2 text-sm">playlist_add_check</span>
                    Alert Categories
                </h3>

                {!masterOn && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 font-medium flex items-center gap-1">
                        <span className="material-icons-round text-xs">info</span>
                        Enable WhatsApp Alerts to configure categories
                    </p>
                )}

                <div className={`mt-4 space-y-1 ${!masterOn ? 'opacity-50 pointer-events-none' : ''}`}>
                    {['transactional', 'marketing'].map((group) => (
                        <div key={group}>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 pt-3 pb-2">
                                {group === 'transactional' ? 'Transactional' : 'Marketing'}
                            </p>
                            {ALERT_CATEGORIES.filter(c => c.group === group).map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                >
                                    <div>
                                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{item.label}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            disabled={!masterOn}
                                            checked={notifSettings?.[item.id] ?? (item.group === 'marketing' ? false : true)}
                                            onChange={async (e) => {
                                                const newVal = e.target.checked;
                                                setNotifSettings(prev => ({ ...prev, [item.id]: newVal }));

                                                try {
                                                    const { data: { session } } = await supabase.auth.getSession();
                                                    const res = await fetch('/api/merchant/notification-settings', {
                                                        method: 'PATCH',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${session?.access_token}`
                                                        },
                                                        body: JSON.stringify({ [item.id]: newVal })
                                                    });

                                                    const result = await res.json();
                                                    if (!result.success) throw new Error(result.error || 'Failed to save');
                                                    toast.success('WhatsApp preferences saved');
                                                } catch (err) {
                                                    setNotifSettings(prev => ({ ...prev, [item.id]: !newVal }));
                                                    toast.error(err.message || 'Failed to update preferences');
                                                }
                                            }}
                                        />
                                        <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25D366]"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                    <span className="material-icons-round text-slate-500 mr-2 text-sm">phonelink_ring</span>
                    Connection Status
                </h3>
                
                {statusLoading ? (
                    <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4 py-1">
                            <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-3/4"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded"></div>
                            </div>
                        </div>
                    </div>
                ) : status?.linked ? (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wider flex items-center">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
                                Connected
                            </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 font-medium">
                            <strong className="text-slate-800 dark:text-slate-200">{status.phone}</strong>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mb-6">
                            Linked on {formatDate(status.linkedAt)}
                        </p>
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
                            <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                                Your merchant WhatsApp is successfully connected. You will receive important alerts here.
                            </p>
                        </div>

                        <button
                            onClick={() => setShowDisconnectModal(true)}
                            disabled={disconnecting}
                            className="border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl px-5 py-2.5 font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <span className="material-icons-round text-sm">link_off</span>
                            Disconnect WhatsApp
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full text-xs font-bold uppercase tracking-wider flex items-center">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-2"></span>
                                Not Connected
                            </span>
                        </div>

                        {!otpSent ? (
                            <>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium">
                                    Link your business phone number to start receiving WhatsApp alerts. We'll send an OTP to verify your number.
                                </p>
                                
                                <button
                                    onClick={handleSendOtp}
                                    disabled={sending}
                                    className="px-6 py-3 bg-[#25D366] text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-[#25D366]/20 w-full sm:w-auto justify-center"
                                >
                                    {sending ? (
                                        <>
                                            <span className="material-icons-round animate-spin text-sm">autorenew</span>
                                            <span>Sending OTP...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons-round text-sm">send</span>
                                            <span>Send OTP to WhatsApp</span>
                                        </>
                                    )}
                                </button>
                                
                                {errorMsg && (
                                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                                        <span className="material-icons-round text-sm">error</span>
                                        {errorMsg}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                    A 6-digit code has been sent to your WhatsApp. Enter it below to complete linking.
                                </p>
                                
                                <div>
                                    <input
                                        ref={otpInputRef}
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        pattern="[0-9]{6}"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        onKeyDown={handleOtpKeyDown}
                                        disabled={verifying}
                                        placeholder="••••••"
                                        className="w-full sm:w-48 px-5 py-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] text-slate-800 dark:text-slate-100 font-mono text-center text-2xl tracking-[0.2em] transition-all"
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                                    <button
                                        onClick={handleVerifyOtp}
                                        disabled={otp.length !== 6 || verifying}
                                        className="px-8 py-3 bg-[#25D366] text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20"
                                    >
                                        {verifying ? 'Verifying...' : 'Verify & Connect'}
                                    </button>
                                    
                                    <button
                                        onClick={handleCancelOtp}
                                        className="px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all flex items-center justify-center"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                
                                <div className="mt-4 flex items-center text-sm text-slate-500">
                                    <span>Didn't get the code?</span>
                                    <button
                                        onClick={handleResendOtp}
                                        disabled={cooldown > 0 || sending}
                                        className="ml-2 font-bold text-[#D4AF37] hover:text-[#B8860B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
                                    </button>
                                </div>

                                {errorMsg && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                                        <span className="material-icons-round text-sm">error</span>
                                        {errorMsg}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={showDisconnectModal}
                onConfirm={handleDisconnect}
                onCancel={() => setShowDisconnectModal(false)}
                title="Disconnect WhatsApp?"
                message={`Disconnecting will stop all WhatsApp alerts to ${status?.phone}. You can re-link anytime.`}
                confirmLabel="Confirm Disconnect"
                cancelLabel="Cancel"
            />
        </div>
    );
}
