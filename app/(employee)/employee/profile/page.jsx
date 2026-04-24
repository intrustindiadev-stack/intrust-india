'use client';

import { User, Mail, Phone, MapPin, Building2, Shield } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

const ROLE_LABELS = {
    employee: 'Employee', sales_exec: 'Sales Executive', sales_manager: 'Sales Manager',
    hr_admin: 'HR Admin', admin: 'Admin', super_admin: 'Super Admin',
};

export default function EmployeeProfilePage() {
    const { user, profile } = useAuth();

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">My Profile</h1>
                <p className="text-sm text-gray-500 mt-0.5">Your account information and access details.</p>
            </div>

            {/* Avatar card */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white flex items-center gap-5 shadow-xl shadow-amber-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-4xl font-black backdrop-blur-sm flex-shrink-0">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold">{profile?.full_name || 'Your Name'}</h2>
                    <p className="text-white/70 text-sm mt-0.5">{ROLE_LABELS[profile?.role] || profile?.role || 'Employee'}</p>
                </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 text-base">Account Details</h3>
                </div>
                <div className="divide-y divide-gray-50">
                    {[
                        { icon: Mail, label: 'Email', value: profile?.email || user?.email },
                        { icon: Phone, label: 'Phone', value: profile?.phone || '—' },
                        { icon: MapPin, label: 'City', value: profile?.city || '—' },
                        { icon: Building2, label: 'Department', value: profile?.department || 'General' },
                        { icon: Shield, label: 'Access Role', value: ROLE_LABELS[profile?.role] || profile?.role },
                    ].map(row => (
                        <div key={row.label} className="flex items-center gap-4 px-5 py-4">
                            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                                <row.icon size={16} className="text-gray-400" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{row.label}</p>
                                <p className="text-sm font-semibold text-gray-800 mt-0.5">{row.value || '—'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
