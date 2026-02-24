'use client';

import { Mail, Phone, Calendar, MoreVertical, Shield, User } from 'lucide-react';
import Link from 'next/link';

export default function UserCard({ user }) {

    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusColor = (kycStatus) => {
        switch (kycStatus) {
            case 'approved': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            case 'pending': return 'bg-amber-50 text-amber-600 border-amber-200';
            case 'rejected': return 'bg-red-50 text-red-600 border-red-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    return (
        <Link
            href={`/admin/users/${user.id}`}
            className="group bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all hover:-translate-y-1 block relative overflow-hidden"
        >
            {/* Top Indicator Line */}
            <div className={`absolute top-0 left-0 w-full h-1.5 ${user.role === 'admin' ? 'bg-slate-800' : user.role === 'merchant' ? 'bg-sky-500' : 'bg-blue-600'
                }`} />

            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm
                        ${user.role === 'admin' ? 'bg-slate-800 text-white' : user.role === 'merchant' ? 'bg-sky-50 text-sky-600' : 'bg-blue-50 text-blue-600'}`}>
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                            getInitials(user.full_name)
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[150px] sm:max-w-[180px]">
                            {user.full_name || 'Unknown User'}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${user.role === 'admin' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                user.role === 'merchant' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                                    'bg-blue-50 text-blue-600 border-blue-100'
                                }`}>
                                {user.role || 'customer'}
                            </span>
                            {user.kyc_status && (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(user.kyc_status)}`}>
                                    KYC: {user.kyc_status}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Status Dot */}
                <div className={`w-2 h-2 rounded-full shadow-sm mt-2 ${user.kyc_status === 'approved' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-slate-300'}`} />
            </div>

            <div className="space-y-2 mt-6">
                <div className="flex items-center gap-3 text-sm text-slate-500 group-hover:text-slate-700 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                        <Mail size={16} strokeWidth={2.5} />
                    </div>
                    <span className="truncate font-medium">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 group-hover:text-slate-700 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 transition-colors">
                        <Phone size={16} strokeWidth={2.5} />
                    </div>
                    <span className="font-medium">{user.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 group-hover:text-slate-700 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-amber-500 group-hover:bg-amber-50 transition-colors">
                        <Calendar size={16} strokeWidth={2.5} />
                    </div>
                    <span className="font-medium">Joined {formatDate(user.created_at)}</span>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                <span className="bg-slate-50 px-2 py-1 rounded-md">ID: {user.id.slice(0, 8)}</span>
                <span className="text-blue-600 group-hover:underline flex items-center gap-1">
                    View Docs
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </span>
            </div>
        </Link>
    );
}
