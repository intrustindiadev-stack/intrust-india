'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import MerchantWhatsAppConnect from '@/components/merchant/MerchantWhatsAppConnect';

export default function MerchantWhatsAppPage() {
    const [notifSettings, setNotifSettings] = useState({
        email_notifications: true,
        purchase_notifications: true,
        sale_notifications: true,
        marketing_updates: false,
        whatsapp_notifications: true,
        whatsapp_order_alerts: true,
        whatsapp_payout_alerts: true,
        whatsapp_store_credit_alerts: true,
        whatsapp_kyc_alerts: true,
        whatsapp_subscription_alerts: true,
        whatsapp_product_alerts: true,
        whatsapp_marketing: false,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifSettings();
    }, []);

    const fetchNotifSettings = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/merchant/notification-settings', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            const notifData = await response.json();
            if (notifData.success) {
                setNotifSettings(notifData.settings);
            }
        } catch (err) {
            console.error('Error fetching notification settings:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-5 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link 
                        href="/merchant/settings?tab=whatsapp"
                        className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-2 mb-4 transition-colors"
                    >
                        <span className="material-icons-round text-sm">arrow_back</span>
                        Back to Settings
                    </Link>
                    
                    <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 flex items-center border-b border-black/5 dark:border-white/5 pb-4">
                        <span className="material-icons-round text-[#25D366] mr-3">chat</span>
                        WhatsApp Notifications
                    </h2>
                </div>

                <div className="max-w-2xl">
                    {loading ? (
                        <div className="animate-pulse space-y-6">
                            <div className="h-24 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10"></div>
                            <div className="h-48 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10"></div>
                        </div>
                    ) : (
                        <MerchantWhatsAppConnect 
                            notifSettings={notifSettings} 
                            setNotifSettings={setNotifSettings} 
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
