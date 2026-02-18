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
            case 'approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <Link
            href={`/admin/users/${user.id}`}
            className="group bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 block relative overflow-hidden"
        >
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${user.role === 'merchant' ? 'from-purple-500 to-indigo-500' : 'from-blue-500 to-cyan-500'
                }`} />

            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm
                        ${user.role === 'merchant' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full rounded-xl object-cover" />
                        ) : (
                            getInitials(user.full_name)
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate max-w-[150px]">
                            {user.full_name || 'Unknown User'}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                    user.role === 'merchant' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                        'bg-gray-100 text-gray-600 border-gray-200'
                                }`}>
                                {user.role || 'customer'}
                            </span>
                            {user.kyc_status && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(user.kyc_status)}`}>
                                    KYC: {user.kyc_status}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className={`w-2 h-2 rounded-full ${user.kyc_status === 'approved' ? 'bg-green-500' : 'bg-gray-300'}`} />
            </div>

            <div className="space-y-2 mt-4">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Mail size={16} className="text-gray-400" />
                    <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Phone size={16} className="text-gray-400" />
                    <span>{user.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Calendar size={16} className="text-gray-400" />
                    <span>Joined {formatDate(user.created_at)}</span>
                </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
                <span>ID: {user.id.slice(0, 8)}...</span>
                <span className="text-indigo-600 group-hover:underline">View Details -&gt;</span>
            </div>
        </Link>
    );
}
