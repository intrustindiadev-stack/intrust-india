"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { getAdminSettings, updateAdminSettings, getPricingSettings } from "./actions";

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const [generalSettings, setGeneralSettings] = useState({
        siteName: "InTrust India",
        supportEmail: "support@intrust.in",
        businessPhone: "",
        businessAddress: "",
        businessGstin: "",
        businessPan: "",
        businessWebsite: "",
    });

    const [notificationSettings, setNotificationSettings] = useState({
        emailAlerts: true,
        smsAlerts: false,
    });

    const [securitySettings, setSecuritySettings] = useState({
        twoFactorAuth: false,
    });

    const [pricingSettings, setPricingSettings] = useState({
        sub1m: 499,
        sub6m: 1999,
        sub12m: 3999,
        autoFirst: 999,
        autoRenewal: 1999,
    });

    useEffect(() => {
        async function loadSettings() {
            try {
                const data = await getAdminSettings();
                if (data) {
                    setGeneralSettings(prev => ({
                        ...prev,
                        siteName: data.business_name || prev.siteName,
                        supportEmail: data.business_email || prev.supportEmail,
                        businessPhone: data.business_phone || "",
                        businessAddress: data.business_address || "",
                        businessGstin: data.business_gstin || "",
                        businessPan: data.business_pan || "",
                        businessWebsite: data.business_website || "",
                    }));
                    
                    setNotificationSettings({
                        emailAlerts: data.notification_email_alerts === 'true' || data.notification_email_alerts === true,
                        smsAlerts: data.notification_sms_alerts === 'true' || data.notification_sms_alerts === true,
                    });
                    
                    setSecuritySettings({
                        twoFactorAuth: data.security_2fa_enabled === 'true' || data.security_2fa_enabled === true,
                    });

                    const pricing = await getPricingSettings();
                    setPricingSettings(pricing);
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage({ text: '', type: '' });

        const payload = {
            business_name: generalSettings.siteName,
            business_email: generalSettings.supportEmail,
            business_phone: generalSettings.businessPhone,
            business_address: generalSettings.businessAddress,
            business_gstin: generalSettings.businessGstin,
            business_pan: generalSettings.businessPan,
            business_website: generalSettings.businessWebsite,
            notification_email_alerts: notificationSettings.emailAlerts ? 'true' : 'false',
            notification_sms_alerts: notificationSettings.smsAlerts ? 'true' : 'false',
            security_2fa_enabled: securitySettings.twoFactorAuth ? 'true' : 'false',
            merchant_sub_price_1m:   String(pricingSettings.sub1m),
            merchant_sub_price_6m:   String(pricingSettings.sub6m),
            merchant_sub_price_12m:  String(pricingSettings.sub12m),
            auto_mode_price_first:   String(pricingSettings.autoFirst),
            auto_mode_price_renewal: String(pricingSettings.autoRenewal),
        };

        const result = await updateAdminSettings(payload);

        if (result.success) {
            setMessage({ text: 'Settings saved successfully!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } else {
            setMessage({ text: result.error || 'Failed to save settings.', type: 'error' });
        }
        
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8 pb-20 flex items-center justify-center">
                <div className="text-gray-500 animate-pulse flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    Loading settings...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8 pb-20">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage platform configurations and preferences.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {message.text && (
                            <span className={`text-sm font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {message.text}
                            </span>
                        )}
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors shadow-sm ${saving ? 'bg-gray-600 cursor-not-allowed' : 'bg-black hover:bg-gray-800'}`}
                        >
                            <Save size={16} />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* General Settings */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
                            <p className="text-sm text-gray-500">Basic platform information.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Site Name
                                    </label>
                                    <input
                                        type="text"
                                        value={generalSettings.siteName}
                                        onChange={(e) =>
                                            setGeneralSettings({ ...generalSettings, siteName: e.target.value })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Support Email
                                    </label>
                                    <input
                                        type="email"
                                        value={generalSettings.supportEmail}
                                        onChange={(e) =>
                                            setGeneralSettings({
                                                ...generalSettings,
                                                supportEmail: e.target.value,
                                            })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Business Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={generalSettings.businessPhone}
                                        onChange={(e) =>
                                            setGeneralSettings({ ...generalSettings, businessPhone: e.target.value })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Business Website
                                    </label>
                                    <input
                                        type="url"
                                        value={generalSettings.businessWebsite}
                                        onChange={(e) =>
                                            setGeneralSettings({ ...generalSettings, businessWebsite: e.target.value })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Business Address
                                    </label>
                                    <textarea
                                        value={generalSettings.businessAddress}
                                        onChange={(e) =>
                                            setGeneralSettings({ ...generalSettings, businessAddress: e.target.value })
                                        }
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        GSTIN
                                    </label>
                                    <input
                                        type="text"
                                        value={generalSettings.businessGstin}
                                        onChange={(e) =>
                                            setGeneralSettings({ ...generalSettings, businessGstin: e.target.value })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        PAN
                                    </label>
                                    <input
                                        type="text"
                                        value={generalSettings.businessPan}
                                        onChange={(e) =>
                                            setGeneralSettings({ ...generalSettings, businessPan: e.target.value })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all uppercase"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notification Settings */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                            <p className="text-sm text-gray-500">Manage how you receive alerts.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900">Email Alerts</p>
                                    <p className="text-sm text-gray-500">Receive critical system updates via email.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings.emailAlerts}
                                        onChange={(e) =>
                                            setNotificationSettings({
                                                ...notificationSettings,
                                                emailAlerts: e.target.checked,
                                            })
                                        }
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900">SMS Alerts</p>
                                    <p className="text-sm text-gray-500">Receive urgent notifications via SMS.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings.smsAlerts}
                                        onChange={(e) =>
                                            setNotificationSettings({
                                                ...notificationSettings,
                                                smsAlerts: e.target.checked,
                                            })
                                        }
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Security Settings */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
                            <p className="text-sm text-gray-500">Protect your admin account.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900">Two-Factor Authentication (2FA)</p>
                                    <p className="text-sm text-gray-500">Add an extra layer of security to your account.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={securitySettings.twoFactorAuth}
                                        onChange={(e) =>
                                            setSecuritySettings({
                                                ...securitySettings,
                                                twoFactorAuth: e.target.checked,
                                            })
                                        }
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Merchant Pricing */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-semibold text-gray-900">Merchant Pricing</h2>
                            <p className="text-sm text-gray-500">Configure subscription and Auto Mode prices (INR).</p>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subscription — 1 Month (₹)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={pricingSettings.sub1m}
                                        onChange={(e) => setPricingSettings({ ...pricingSettings, sub1m: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subscription — 6 Months (₹)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={pricingSettings.sub6m}
                                        onChange={(e) => setPricingSettings({ ...pricingSettings, sub6m: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subscription — 12 Months (₹)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={pricingSettings.sub12m}
                                        onChange={(e) => setPricingSettings({ ...pricingSettings, sub12m: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Auto Mode — First Month (₹)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={pricingSettings.autoFirst}
                                        onChange={(e) => setPricingSettings({ ...pricingSettings, autoFirst: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Auto Mode — Renewal (₹)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={pricingSettings.autoRenewal}
                                        onChange={(e) => setPricingSettings({ ...pricingSettings, autoRenewal: Number(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
