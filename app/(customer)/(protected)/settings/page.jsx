'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
    Settings, 
    User, 
    Bell, 
    Shield, 
    ShieldCheck, 
    Smartphone, 
    Moon, 
    Sun, 
    Store, 
    Lock, 
    PhoneCall, 
    ChevronRight, 
    Check, 
    ExternalLink,
    LogOut,
    HelpCircle,
    ArrowRight
} from 'lucide-react';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { createClient } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

export default function CustomerSettingsPage() {
    const router = useRouter();
    const { user, profile, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const supabase = createClient();

    const [whatsappAlerts, setWhatsappAlerts] = useState(() => {
        if (typeof window === 'undefined') return true;
        try {
            const saved = localStorage.getItem('intrust_notification_preferences');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.whatsappAlerts === 'boolean') return parsed.whatsappAlerts;
            }
        } catch {}
        return true;
    });

    const [orderSmsAlerts, setOrderSmsAlerts] = useState(() => {
        if (typeof window === 'undefined') return true;
        try {
            const saved = localStorage.getItem('intrust_notification_preferences');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.orderSmsAlerts === 'boolean') return parsed.orderSmsAlerts;
            }
        } catch {}
        return true;
    });

    const [promoNotifications, setPromoNotifications] = useState(() => {
        if (typeof window === 'undefined') return false;
        try {
            const saved = localStorage.getItem('intrust_notification_preferences');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.promoNotifications === 'boolean') return parsed.promoNotifications;
            }
        } catch {}
        return false;
    });

    const [fetchedKycStatus, setFetchedKycStatus] = useState(null);
    const kycStatus = fetchedKycStatus || profile?.kyc_status || 'pending';
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        if (!user) return;

        const loadSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('kyc_status, phone')
                    .eq('id', user.id)
                    .maybeSingle();

                if (error) {
                    console.error('Failed to load user settings:', error);
                    return;
                }

                if (data?.kyc_status) {
                    setFetchedKycStatus(data.kyc_status);
                }
            } catch (err) {
                console.error('Failed to load user settings:', err);
            }
        };

        loadSettings();
    }, [user, supabase]);

    const savePreferences = (updated) => {
        try {
            localStorage.setItem('intrust_notification_preferences', JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to save notification preferences:', e);
        }
    };

    const handleToggleWhatsapp = async () => {
        const nextVal = !whatsappAlerts;
        setWhatsappAlerts(nextVal);
        savePreferences({ whatsappAlerts: nextVal, orderSmsAlerts, promoNotifications });
        toast.success(nextVal ? 'WhatsApp order updates enabled' : 'WhatsApp updates muted');
    };

    const handleToggleOrderSms = async () => {
        const nextVal = !orderSmsAlerts;
        setOrderSmsAlerts(nextVal);
        savePreferences({ whatsappAlerts, orderSmsAlerts: nextVal, promoNotifications });
        toast.success(nextVal ? 'SMS delivery alerts enabled' : 'SMS alerts disabled');
    };

    const handleTogglePromo = async () => {
        const nextVal = !promoNotifications;
        setPromoNotifications(nextVal);
        savePreferences({ whatsappAlerts, orderSmsAlerts, promoNotifications: nextVal });
        toast.success(nextVal ? 'Deal alerts enabled' : 'Deal alerts disabled');
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            window.location.href = '/login';
        } catch (err) {
            toast.error('Failed to log out');
        }
    };

    const isDark = theme === 'dark';

    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
            {/* Breadcrumbs & Header */}
            <div>
                <CustomerBreadcrumbs items={[{ label: 'Settings' }]} className="mb-3" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-on-surface tracking-tight">
                            Account &amp; App Settings
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-on-surface-variant font-medium mt-1">
                            Manage your notifications, security, preferences, and verified status
                        </p>
                    </div>

                    <button
                        onClick={handleSignOut}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 transition-all self-start sm:self-auto"
                    >
                        <LogOut size={14} />
                        <span>Log Out</span>
                    </button>
                </div>
            </div>

            {/* Quick Profile Summary Banner */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-surface-container-lowest border border-slate-200 dark:border-outline-variant/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-primary flex items-center justify-center font-black text-xl border border-blue-600/20">
                        {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-on-surface">
                                {profile?.full_name || user?.email?.split('@')[0] || 'InTrust Customer'}
                            </h2>
                            {kycStatus === 'verified' && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase flex items-center gap-1">
                                    <ShieldCheck size={12} /> Verified
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-on-surface-variant font-medium mt-0.5">
                            {user?.email || 'Registered via Mobile'} • {profile?.phone || 'No phone linked'}
                        </p>
                    </div>
                </div>

                <Link
                    href="/profile"
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-surface-container-low hover:bg-slate-200 dark:hover:bg-surface-container-high text-xs font-bold text-slate-800 dark:text-on-surface flex items-center gap-1.5 transition-all self-start sm:self-auto"
                >
                    <span>Edit Profile Details</span>
                    <ChevronRight size={14} />
                </Link>
            </div>

            {/* Settings Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Theme & Interface Preferences */}
                <div className="p-6 rounded-3xl bg-white dark:bg-surface-container-lowest border border-slate-200 dark:border-outline-variant/30 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-outline-variant/15">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            {isDark ? <Moon size={18} /> : <Sun size={18} />}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-on-surface">Appearance &amp; Theme</h3>
                            <p className="text-[11px] text-slate-500 dark:text-on-surface-variant">Customize light or dark portal modes</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-on-surface">Dark Mode</p>
                            <p className="text-[11px] text-slate-500 dark:text-on-surface-variant">Toggle high-contrast nighttime palette</p>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${isDark ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                {/* 2. Notification Preferences */}
                <div className="p-6 rounded-3xl bg-white dark:bg-surface-container-lowest border border-slate-200 dark:border-outline-variant/30 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-outline-variant/15">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-primary flex items-center justify-center">
                            <Bell size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-on-surface">Order &amp; Alert Notifications</h3>
                            <p className="text-[11px] text-slate-500 dark:text-on-surface-variant">Manage how InTrust reaches you</p>
                        </div>
                    </div>

                    <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-on-surface">WhatsApp Order Tracking</p>
                                <p className="text-[11px] text-slate-500 dark:text-on-surface-variant">Live order dispatch &amp; invoice alerts</p>
                            </div>
                            <button
                                onClick={handleToggleWhatsapp}
                                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${whatsappAlerts ? 'bg-emerald-600' : 'bg-slate-200'}`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${whatsappAlerts ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-on-surface">SMS Critical Alerts</p>
                                <p className="text-[11px] text-slate-500 dark:text-on-surface-variant">OTP login &amp; wallet security notifications</p>
                            </div>
                            <button
                                onClick={handleToggleOrderSms}
                                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${orderSmsAlerts ? 'bg-emerald-600' : 'bg-slate-200'}`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${orderSmsAlerts ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-on-surface">Promotions &amp; Flash Sales</p>
                                <p className="text-[11px] text-slate-500 dark:text-on-surface-variant">Exclusive tech deals &amp; double reward days</p>
                            </div>
                            <button
                                onClick={handleTogglePromo}
                                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${promoNotifications ? 'bg-emerald-600' : 'bg-slate-200'}`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${promoNotifications ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. KYC Verification & Security */}
                <div className="p-6 rounded-3xl bg-white dark:bg-surface-container-lowest border border-slate-200 dark:border-outline-variant/30 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-outline-variant/15">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <Shield size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-on-surface">Identity &amp; Compliance</h3>
                            <p className="text-[11px] text-slate-500 dark:text-on-surface-variant">Aadhaar / PAN verification &amp; transaction tiers</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-container-low border border-slate-100 dark:border-outline-variant/10">
                        <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-on-surface">KYC Status</p>
                            <p className="text-[11px] text-slate-500 dark:text-on-surface-variant">
                                {kycStatus === 'verified' ? 'Higher limits unlocked' : 'Submit ID to unlock higher limits'}
                            </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            kycStatus === 'verified'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                            {kycStatus}
                        </span>
                    </div>

                    <Link
                        href="/profile/kyc"
                        className="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-on-surface dark:text-surface text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    >
                        <span>{kycStatus === 'verified' ? 'View KYC Certificate' : 'Complete Verification'}</span>
                        <ArrowRight size={14} />
                    </Link>
                </div>

                {/* 4. Merchant Partner Opportunity (Direct Merchant Apply) */}
                <div className="p-6 rounded-3xl bg-white dark:bg-surface-container-lowest border border-slate-200 dark:border-outline-variant/30 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-outline-variant/15">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Store size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-on-surface">Merchant Partner Program</h3>
                            <p className="text-[11px] text-slate-500 dark:text-on-surface-variant">List your store &amp; sell across Bhopal</p>
                        </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-on-surface-variant leading-relaxed">
                        Do you run an offline retail store in Bhopal? Onboard your shop to InTrust to reach 50,000+ local buyers with automated billing and 0% gateway fees.
                    </p>

                    <Link
                        href="/merchant-apply"
                        className="w-full py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                        <Store size={14} />
                        <span>Register as a Merchant</span>
                    </Link>
                </div>
            </div>

            {/* Support Hotline */}
            <div className="p-6 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                        <PhoneCall size={22} className="text-amber-400" />
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-white">Need Help with Your Account?</h4>
                        <p className="text-xs text-slate-300 mt-0.5">Direct toll-free customer &amp; merchant helpline: Mon–Sat, 9 AM – 7 PM</p>
                    </div>
                </div>

                <a
                    href="tel:18002030052"
                    className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-all flex items-center gap-2 shadow-sm shrink-0"
                >
                    <PhoneCall size={14} />
                    <span>Call 1800-889-0199</span>
                </a>
            </div>
        </div>
    );
}
