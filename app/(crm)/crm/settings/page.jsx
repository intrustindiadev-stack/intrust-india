'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { Settings, Shield, Bell, Lock, Key } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CRMSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('security');

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };
        fetchUser();
    }, []);

    const handleResetPassword = async () => {
        try {
            const supabase = createClient();
            const { error } = await supabase.auth.resetPasswordForEmail(user?.email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/crm/settings`,
            });
            if (error) throw error;
            toast.success('Password reset email sent!');
        } catch (error) {
            toast.error(error.message || 'Failed to send reset email');
        }
    };

    const tabs = [
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-900/5 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-4">
                    <Settings size={12} />
                    System Preferences
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    Account <span className="text-indigo-600">Settings</span>
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Manage your security and notification preferences.</p>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl w-fit border border-black/5 dark:border-white/5 overflow-x-auto shadow-sm">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all focus:outline-none whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                        >
                            <Icon size={16} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] border border-slate-100 dark:border-white/10 p-6 sm:p-8 shadow-2xl">
                {activeTab === 'security' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                            <Shield className="text-indigo-500" size={24} />
                            Security Settings
                        </h2>

                        <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Key size={16} className="text-slate-400" />
                                        Password & Authentication
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1 font-medium">
                                        Update your password or enable two-factor authentication.
                                    </p>
                                </div>
                                <button 
                                    onClick={handleResetPassword}
                                    className="px-6 py-3 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-xl font-bold hover:bg-indigo-200 dark:hover:bg-indigo-500/20 transition-all flex-shrink-0"
                                >
                                    Reset Password
                                </button>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Lock size={16} className="text-slate-400" />
                                        Active Sessions
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1 font-medium">
                                        Manage your currently logged in devices.
                                    </p>
                                </div>
                                <button 
                                    className="px-6 py-3 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-white/20 transition-all flex-shrink-0"
                                >
                                    Sign out all devices
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'notifications' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                            <Bell className="text-indigo-500" size={24} />
                            Notification Preferences
                        </h2>
                        
                        <div className="space-y-4">
                            {[
                                { id: 'email', label: 'Email Notifications', desc: 'Receive daily digests and important updates via email.' },
                                { id: 'push', label: 'Push Notifications', desc: 'Receive real-time alerts in your browser.' },
                                { id: 'sms', label: 'SMS Alerts', desc: 'Receive critical system alerts via SMS.' }
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 group hover:border-indigo-500/30 transition-colors">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">{item.label}</p>
                                        <p className="text-sm text-slate-500 mt-1 font-medium">{item.desc}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked={item.id !== 'sms'} />
                                        <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
