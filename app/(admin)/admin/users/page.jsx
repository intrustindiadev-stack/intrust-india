'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { Search, Loader2, ShieldCheck, ShieldAlert, BadgeCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
    const supabase = createClient();
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingId, setUpdatingId] = useState(null);
    const [toastMsg, setToastMsg] = useState({ message: '', type: '' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const showToast = (message, type = 'success') => {
        setToastMsg({ message, type });
        setTimeout(() => setToastMsg({ message: '', type: '' }), 3000);
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Fetch all profiles
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching users:', error);
                showToast('Failed to fetch users: ' + error.message, 'error');
            } else {
                setUsers(data || []);
            }
        } catch (error) {
            console.error('Unexpected error:', error);
            showToast('Unexpected error occurred', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
    );

    const updateKYCStatus = async (userId, newStatus) => {
        setUpdatingId(userId);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ kyc_status: newStatus })
                .eq('id', userId);

            if (error) throw error;

            // Update local state
            setUsers(users.map(u =>
                u.id === userId ? { ...u, kyc_status: newStatus } : u
            ));

            showToast(`Status updated to ${newStatus?.toUpperCase()}`, 'success');
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
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><BadgeCheck size={14} /> Verified</span>;
            case 'pending':
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Loader2 size={14} className="animate-spin" /> Pending</span>;
            case 'rejected':
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><ShieldAlert size={14} /> Rejected</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><AlertCircle size={14} /> Not Started</span>;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Toast Notification */}
            {toastMsg.message && (
                <div className={`fixed top-24 right-4 px-6 py-3 rounded-xl shadow-xl z-50 animate-fade-in flex items-center gap-2 ${toastMsg.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                    }`}>
                    {toastMsg.type === 'error' ? <ShieldAlert size={20} /> : <CheckCircle size={20} />}
                    <span className="font-medium">{toastMsg.message}</span>
                </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500 mt-1">Manage user profiles and KYC verification</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full sm:w-64"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                </div>
            ) : (
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
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
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
                                                        className="block w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border bg-white"
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
                                            No users found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
