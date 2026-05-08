'use client';

import { useState } from 'react';
import { 
    Bell, 
    Send, 
    Users, 
    Store, 
    User, 
    ShieldCheck, 
    Briefcase, 
    BarChart,
    AlertCircle,
    CheckCircle2,
    Info,
    AlertTriangle,
    Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const targets = [
    { id: 'all', label: 'All Users', icon: Users, description: 'Everyone on the platform' },
    { id: 'customers', label: 'Customers', icon: User, description: 'Standard consumer accounts' },
    { id: 'merchants', label: 'Merchants', icon: Store, description: 'Business owners & shopkeepers' },
    { id: 'hrm', label: 'HRM Staff', icon: Briefcase, description: 'Human Resource portal users' },
    { id: 'crm', label: 'CRM Agents', icon: BarChart, description: 'Sales & customer relationship agents' },
    { id: 'employee', label: 'Employees', icon: ShieldCheck, description: 'Internal staff & employees' },
    { id: 'user_id', label: 'Specific User', icon: User, description: 'Target a single user by ID' },
];

const types = [
    { id: 'info', label: 'Information', icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'success', label: 'Success', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'warning', label: 'Warning', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'error', label: 'Error', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
];

export default function AdminNotificationsPage() {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        target: 'all',
        userId: '',
        title: '',
        body: '',
        type: 'info',
        reference_type: '',
        reference_id: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.body) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (formData.target === 'user_id' && !formData.userId) {
            toast.error('Please provide a specific User ID');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/admin/notifications/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send notifications');

            toast.success(`Successfully sent notifications to ${data.count} users`);
            setFormData({
                ...formData,
                title: '',
                body: '',
                userId: '',
                reference_type: '',
                reference_id: ''
            });
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                        <Bell size={24} />
                    </div>
                    Broadcast Notifications
                </h1>
                <p className="text-slate-500 mt-2">
                    Send system-wide alerts or targeted messages to your users across all portals.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Target Audience */}
                <section>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <Users size={16} /> Target Audience
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {targets.map((t) => {
                            const Icon = t.icon;
                            const isSelected = formData.target === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, target: t.id })}
                                    className={`text-left p-4 rounded-2xl border transition-all ${
                                        isSelected 
                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' 
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <Icon size={20} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                                    <div className={`font-bold mt-2 ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                                        {t.label}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">{t.description}</div>
                                </button>
                            );
                        })}
                    </div>

                    {formData.target === 'user_id' && (
                        <div className="mt-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Specific User ID</label>
                            <input 
                                type="text"
                                value={formData.userId}
                                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                placeholder="Enter Supabase Auth User ID"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                    )}
                </section>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Message Details */}
                    <div className="md:col-span-2 space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <Send size={16} /> Message Content
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Notification Title</label>
                                <input 
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. New Feature Released!"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Message Body</label>
                                <textarea 
                                    rows={4}
                                    value={formData.body}
                                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                    placeholder="Tell your users something important..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Meta & Style */}
                    <div className="space-y-6">
                        <section>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Alert Style</h2>
                            <div className="grid grid-cols-2 gap-2">
                                {types.map((t) => {
                                    const Icon = t.icon;
                                    const isSelected = formData.type === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: t.id })}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                                isSelected 
                                                ? `border-slate-900 ${t.bg} ring-2 ring-slate-900/10` 
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <Icon size={18} className={t.color} />
                                            <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                                                {t.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Advanced Routing</h2>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reference Type</label>
                                <input 
                                    type="text"
                                    value={formData.reference_type}
                                    onChange={(e) => setFormData({ ...formData, reference_type: e.target.value })}
                                    placeholder="e.g. order, wallet"
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 transition-all font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reference ID</label>
                                <input 
                                    type="text"
                                    value={formData.reference_id}
                                    onChange={(e) => setFormData({ ...formData, reference_id: e.target.value })}
                                    placeholder="UUID or Slug"
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 transition-all font-mono"
                                />
                            </div>
                        </section>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-900/10"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        {loading ? 'Sending...' : 'Broadcast Now'}
                    </button>
                </div>
            </form>
        </div>
    );
}
