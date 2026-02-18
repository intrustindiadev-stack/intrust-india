'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, ShieldAlert, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import KYCModal from '@/components/admin/KYCModal';
import { createClient } from '@/lib/supabaseClient';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function UsersTable({ initialUsers, initialTotal, currentPage, totalPages }) {
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [users, setUsers] = useState(initialUsers);
    const [toastMsg, setToastMsg] = useState({ message: '', type: '' });
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [isSearching, setIsSearching] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    // KYC Modal state
    const [selectedKYC, setSelectedKYC] = useState(null);
    const [showKYCModal, setShowKYCModal] = useState(false);

    // Debug: Log when users data changes
    useEffect(() => {
        console.log('[Admin Users] Users updated:', {
            count: initialUsers?.length || 0,
            total: initialTotal,
            page: currentPage,
            users: initialUsers
        });
        setUsers(initialUsers);
        setIsSearching(false);
    }, [initialUsers, initialTotal, currentPage]);

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

        console.log('[Admin Users] Search triggered:', { term, newUrl: `${pathname}?${params.toString()}` });
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handlePageChange = (page) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', page.toString());

        console.log('[Admin Users] Page change:', { page, newUrl: `${pathname}?${params.toString()}` });
        router.push(`${pathname}?${params.toString()}`);
    };

    const getKYCRecord = (user) => {
        if (!user.kyc_records) return null;
        // Handle both array (legacy/1:N) and object (1:1 join) formats
        return Array.isArray(user.kyc_records) ? user.kyc_records[0] : user.kyc_records;
    };

    const openKYCModal = (user) => {
        // Get the KYC record safely
        const kycRecord = getKYCRecord(user);

        if (!kycRecord) {
            showToast('No KYC record found for this user', 'error');
            return;
        }

        // Add user email to KYC data for display
        setSelectedKYC({
            ...kycRecord,
            user_email: user.email
        });
        setShowKYCModal(true);
    };

    const closeKYCModal = () => {
        setShowKYCModal(false);
        setSelectedKYC(null);
        // Refresh the page to get updated data
        router.refresh();
    };

    const getKYCStatus = (user) => {
        const kycRecord = getKYCRecord(user);

        // If KYC record exists, use its status (new schema)
        if (kycRecord) {
            return kycRecord.verification_status || kycRecord.status || 'not_started';
        }

        // Fall back to user_profiles.kyc_status for users without KYC records
        return user.kyc_status || 'not_started';
    };

    const hasKYCRecord = (user) => {
        const record = getKYCRecord(user);
        return !!record;
    };

    const updateKYCStatus = async (userId, newStatus) => {
        setUpdatingId(userId);
        try {
            const updates = [];
            const user = users.find(u => u.id === userId);
            const kycRecord = getKYCRecord(user);

            // 1. Update kyc_records if it exists (Source of Truth)
            if (kycRecord) {
                const kycUpdate = {
                    verification_status: newStatus,
                    verified_at: newStatus === 'verified' || newStatus === 'rejected' ? new Date().toISOString() : null,
                    // We can't easily get current admin ID here without auth context, 
                    // but RLS/Triggers might handle it, or we leave it for now.
                    // Ideal: verified_by: supabase.auth.user().id
                };

                updates.push(
                    supabase
                        .from('kyc_records')
                        .update(kycUpdate)
                        .eq('id', kycRecord.id)
                );
            }

            // 2. Always update user_profiles (Legacy/Fallback)
            updates.push(
                supabase
                    .from('user_profiles')
                    .update({ kyc_status: newStatus })
                    .eq('id', userId)
            );

            // Execute all updates
            const results = await Promise.all(updates);

            // Check for errors
            const errors = results.filter(r => r.error).map(r => r.error);
            if (errors.length > 0) throw errors[0];

            // Update local state
            setUsers(users.map(u => {
                if (u.id !== userId) return u;

                // Update both profile and nested record for UI reflection
                const updatedUser = { ...u, kyc_status: newStatus };

                if (u.kyc_records) {
                    if (Array.isArray(u.kyc_records)) {
                        updatedUser.kyc_records = u.kyc_records.map(r => ({ ...r, verification_status: newStatus }));
                    } else {
                        updatedUser.kyc_records = { ...u.kyc_records, verification_status: newStatus };
                    }
                }

                return updatedUser;
            }));

            showToast(`Status updated to ${newStatus?.toUpperCase()}`, 'success');
            router.refresh();
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
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        Verified
                        <CheckCircle size={14} />
                    </span>
                );
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

            {/* KYC Modal */}
            {showKYCModal && selectedKYC && (
                <KYCModal
                    kyc={selectedKYC}
                    onClose={closeKYCModal}
                />
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
                                            <StatusBadge status={getKYCStatus(user)} />
                                        </td>
                                        <td className="px-6 py-4">
                                            {hasKYCRecord(user) ? (
                                                <button
                                                    onClick={() => openKYCModal(user)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                                >
                                                    <Eye size={16} />
                                                    View KYC
                                                </button>
                                            ) : (
                                                <>
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
                                                </>
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
