'use client';

import { Mail, Phone, Calendar, MoreVertical, Shield, User, Star } from 'lucide-react';
import Link from 'next/link';
import { displayEmail } from '@/lib/auth';
import ContactActions from '@/components/shared/ContactActions';

export default function UserCard({ user }) {

    const isGoldActive = () => {
        if (!user.is_gold_verified) return false;
        if (!user.subscription_expiry) return false;
        return new Date(user.subscription_expiry) > new Date();
    };


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
            case 'verified': return 'bg-emerald-50 text-emerald-600 border-emerald-200/50 shadow-emerald-500/10';
            case 'pending': return 'bg-amber-50 text-amber-600 border-amber-200/50 shadow-amber-500/10';
            case 'rejected': return 'bg-red-50 text-red-600 border-red-200/50 shadow-red-500/10';
            default: return 'bg-slate-50 text-slate-600 border-slate-200/50 shadow-slate-500/10';
        }
    };

    return (
        <Link
            href={`/admin/users/${user.id}`}
            className="group bg-white/80 backdrop-blur-xl rounded-[2rem] p-5 border border-[#EAEFF4] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 block relative overflow-hidden"
        >
            {/* Top Indicator Line */}
            <div className={`absolute top-0 left-0 w-full h-1.5 transition-colors duration-300 ${user.role === 'admin' ? 'bg-slate-800' : user.role === 'merchant' ? 'bg-sky-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                }`} />

            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Gold Subscription Badge */}
            {isGoldActive() && (
                <div
                    title={`Gold active until ${new Date(user.subscription_expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 shadow-lg shadow-amber-500/20 z-10 transform group-hover:scale-105 transition-transform"
                >
                    <Star size={10} className="fill-black text-black" />
                    <span className="text-[10px] font-black text-black tracking-widest uppercase">Gold</span>
                </div>
            )}

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center font-black text-xl shadow-inner border border-white/50
                        ${user.role === 'admin' ? 'bg-gradient-to-br from-slate-700 to-slate-900 text-white' : user.role === 'merchant' ? 'bg-gradient-to-br from-sky-50 to-sky-100 text-sky-700' : 'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700'}`}>
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full rounded-[1.25rem] object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            getInitials(user.full_name)
                        )}
                    </div>
                    <div>
                        <h3 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[140px] sm:max-w-[160px] tracking-tight text-lg">
                            {user.full_name || 'Unknown User'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${user.role === 'admin' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                user.role === 'merchant' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                                    'bg-blue-50 text-blue-700 border-blue-100'
                                }`}>
                                {user.role || 'customer'}
                            </span>
                            {user.kyc_status && (
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${getStatusColor(user.kyc_status)}`}>
                                    KYC: {user.kyc_status}
                                </span>
                            )}
                        </div>
                        {user.kyc_status === 'pending' && user.kyc_records?.[0]?.rejection_reason && (
                            <div className="mt-2 text-[10px] text-amber-700 bg-amber-50/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-amber-200 truncate max-w-[140px] sm:max-w-[160px]" title={user.kyc_records[0].rejection_reason}>
                                <span className="font-bold">Reason:</span> {user.kyc_records[0].rejection_reason.replace('PAN verification failed:', '').trim()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Dot */}
                <div className={`w-2.5 h-2.5 rounded-full shadow-md mt-2 ${user.kyc_status === 'verified' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-slate-300'}`} />
            </div>

            <div className="space-y-3 mt-6 relative z-10 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                <div className="flex items-center gap-3 text-sm text-slate-500 group-hover:text-slate-700 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-blue-500 shadow-sm transition-colors border border-slate-100">
                        <Mail size={14} strokeWidth={2.5} />
                    </div>
                    <span className="truncate font-bold">
                        {displayEmail(user.email) ?? (
                            <span style={{ color: '#9ca3af', fontStyle: 'italic', fontWeight: 'normal' }}>No email linked</span>
                        )}
                    </span>
                </div>
                <div className="flex items-center justify-between group-hover:text-slate-700 transition-colors">
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-emerald-500 shadow-sm transition-colors border border-slate-100">
                            <Phone size={14} strokeWidth={2.5} />
                        </div>
                        <span className="font-bold">{user.phone || 'N/A'}</span>
                    </div>
                    <ContactActions phone={user.phone} email={user.email} name={user.full_name} compact />
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 group-hover:text-slate-700 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-amber-500 shadow-sm transition-colors border border-slate-100">
                        <Calendar size={14} strokeWidth={2.5} />
                    </div>
                    <span className="font-bold">Joined {formatDate(user.created_at)}</span>
                </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 relative z-10">
                <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">ID: {user.id.slice(0, 8)}</span>
                <span className="text-blue-600 group-hover:underline flex items-center gap-1 group-hover:text-blue-700">
                    View Details
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                </span>
            </div>
        </Link>
    );
}
