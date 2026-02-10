'use client';

import { useState } from 'react';
import { Search, Loader2, ShieldAlert, CheckCircle, Verified, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function UsersTable({ initialUsers, initialTotal, currentPage, totalPages }) {
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [users, setUsers] = useState(initialUsers);
    const [updatingId, setUpdatingId] = useState(null);
    const [toastMsg, setToastMsg] = useState({ message: '', type: '' });
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [isSearching, setIsSearching] = useState(false);

    const showToast = (message, type = 'success') => {
        setToastMsg({ message, type });
        setTimeout(() => setToastMsg({ message: '', type: '' }), 3000);
    };

    const handleSearch = (term) => {
        setSearchTerm(term);
        setIsSearching(true);

        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set('search', term);
        } else {
            params.delete('search');
        }
        params.set('page', '1'); // Reset to page 1 on search
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handlePageChange = (page) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', page.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const updateKYCStatus = async (userId, newStatus) => {
        setUpdatingId(userId);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ kyc_status: newStatus })
                .eq('id', userId);

            if (error) throw error;

            // Update local state without refresh for better specific UX
            setUsers(users.map(u =>
                u.id === userId ? { ...u, kyc_status: newStatus } : u
            ));

            showToast(`Status updated to ${newStatus?.toUpperCase()}`, 'success');
            router.refresh(); // Refresh server data in background
        } catch (error) {
            console.error('Error updating status:', error);
            showToast('Failed to update status: ' + error.message, 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const StatusBadge = ({ status }) => {
        switch (status) {
            case 'verified':
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Verified size={14} className="text-blue-600" /> Verified</span>;
            case 'pending':
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Loader2 size={14} className="animate-spin" /> Pending</span>;
            case 'rejected':
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><ShieldAlert size={14} /> Rejected</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><AlertCircle size={14} /> Not Started</span>;
        }
    };

    return (
        <div>
            {/* Toast Notification */}
            {toastMsg.message && (
                <div className={`fixed top-24 right-4 px-6 py-3 rounded-xl shadow-xl z-50 animate-fade-in flex items-center gap-2 ${toastMsg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                    }`}>
                    {toastMsg.type === 'error' ? <ShieldAlert size={20} /> : <CheckCircle size={20} />}
                    <span className="font-medium">{toastMsg.message}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full"
                        defaultValue={searchTerm}
                        onChange={(e) => {
                            // Debounce could be added here
                            handleSearch(e.target.value);
                        }}
                    />
                </div>
                <div className="text-sm text-gray-500">
                    Total Users: <span className="font-semibold text-gray-900">{initialTotal}</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User Details</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">KYC Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.length > 0 ? (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                                                    {user.full_name?.charAt(0) || user.email?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{user.full_name || 'N/A'}</div>
                                                    {user.role === 'admin' && (
                                                        <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">ADMIN</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{user.email}</div>
                                            <div className="text-sm text-gray-500">{user.phone || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={user.kyc_status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            {updatingId === user.id ? (
                                                <div className="flex items-center gap-2 text-blue-600">
                                                    <Loader2 size={16} className="animate-spin" />
                                                    <span className="text-xs font-medium">Updating...</span>
                                                </div>
                                            ) : (
                                                <select
                                                    className="block w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border bg-white disabled:opacity-50 disabled:bg-gray-100"
                                                    value={user.kyc_status || 'not_started'}
                                                    onChange={(e) => updateKYCStatus(user.id, e.target.value)}
                                                    disabled={user.role === 'admin'}
                                                >
                                                    <option value="not_started" disabled>Select Status</option>
                                                    <option value="pending">Pending</option>
                                                    <option value="verified">Verified</option>
                                                    <option value="rejected">Rejected</option>
                                                </select>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
