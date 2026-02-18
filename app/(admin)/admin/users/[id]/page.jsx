import { createAdminClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import {
    User,
    Mail,
    Phone,
    Calendar,
    Shield,
    CheckCircle,
    XCircle,
    AlertCircle,
    Clock,
    CreditCard,
    ShoppingBag
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({ params }) {
    const supabase = createAdminClient();
    const { id } = await params;

    // Fetch User Profile with KYC
    const { data: user, error } = await supabase
        .from('user_profiles')
        .select('*, kyc_records!user_id(*)')
        .eq('id', id)
        .single();

    if (error || !user) {
        notFound();
    }

    // Attempt to fetch orders (if table exists and has RLS allowing admin)
    // Using try-catch or just ignoring error if table doesn't exist to prevent crash
    let orders = [];
    try {
        const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', id)
            .order('created_at', { ascending: false })
            .limit(5);
        orders = data || [];
    } catch (e) {
        // Table might not exist or other error
        console.log('Could not fetch orders', e);
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase"><CheckCircle size={14} /> Approved</span>;
            case 'pending':
                return <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold uppercase"><Clock size={14} /> Pending</span>;
            case 'rejected':
                return <span className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase"><XCircle size={14} /> Rejected</span>;
            default:
                return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Unknown</span>;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-3xl p-8 mb-8 border border-gray-200 shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${user.role === 'merchant' ? 'from-purple-500 to-indigo-500' : 'from-blue-500 to-cyan-500'
                    }`} />

                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                        ) : (
                            <User size={64} className="text-gray-300" />
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.full_name || 'Unknown User'}</h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-600 mb-4">
                            <div className="flex items-center gap-2">
                                <Mail size={18} className="text-gray-400" />
                                <span>{user.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone size={18} className="text-gray-400" />
                                <span>{user.phone || 'No phone'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={18} className="text-gray-400" />
                                <span>Joined {formatDate(user.created_at)}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                            <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide border ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                    user.role === 'merchant' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                        'bg-gray-100 text-gray-600 border-gray-200'
                                }`}>
                                {user.role || 'customer'}
                            </span>
                            {user.kyc_status && getStatusBadge(user.kyc_status)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: KYC & Personal Info */}
                <div className="space-y-8 lg:col-span-2">

                    {/* KYC Section */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Shield className="text-indigo-600" />
                                KYC Verification
                            </h2>
                            {user.kyc_status === 'pending' && (
                                <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                                    Review Application
                                </button>
                            )}
                        </div>

                        {user.kyc_records && user.kyc_records.length > 0 ? (
                            <div className="space-y-4">
                                {user.kyc_records.map((record) => (
                                    <div key={record.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-semibold text-gray-900 capitalize">
                                                {record.document_type.replace('_', ' ')}
                                            </span>
                                            {getStatusBadge(record.status)}
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">
                                            Document Number: <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">{record.document_number}</span>
                                        </p>
                                        {record.front_image_url && (
                                            <div className="mt-3">
                                                <p className="text-xs font-semibold text-gray-500 mb-1">Document Image</p>
                                                <a href={record.front_image_url} target="_blank" rel="noopener noreferrer" className="block w-full h-32 bg-gray-200 rounded-lg overflow-hidden relative group">
                                                    <img src={record.front_image_url} alt="Document" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium text-sm">
                                                        View Full Size
                                                    </div>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">No KYC records found for this user.</p>
                            </div>
                        )}
                    </div>

                    {/* Order History (if user has orders) */}
                    {orders.length > 0 && (
                        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
                                <ShoppingBag className="text-indigo-600" />
                                Recent Orders
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-left">
                                            <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Order ID</th>
                                            <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Date</th>
                                            <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Amount</th>
                                            <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {orders.map(order => (
                                            <tr key={order.id}>
                                                <td className="py-3 font-mono text-sm text-gray-600">
                                                    {order.id.slice(0, 8)}...
                                                </td>
                                                <td className="py-3 text-sm text-gray-900">
                                                    {formatDate(order.created_at)}
                                                </td>
                                                <td className="py-3 font-medium text-gray-900">
                                                    ₹{(order.amount_paise / 100).toLocaleString()}
                                                </td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                                                            order.payment_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {order.payment_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Quick Info & Activity */}
                <div className="space-y-8">
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Account Overview</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">Wallet Balance</span>
                                <span className="font-bold text-gray-900">₹0.00</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">Total Spent</span>
                                <span className="font-bold text-gray-900">
                                    ₹{orders.reduce((sum, o) => sum + (o.payment_status === 'paid' ? o.amount_paise / 100 : 0), 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                <span className="text-gray-500">Total Orders</span>
                                <span className="font-bold text-gray-900">{orders.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
                        <div className="relative pl-4 border-l-2 border-gray-100 space-y-6">
                            {/* Mock Activity Data - In real app, fetch from activity_logs table */}
                            <div className="relative">
                                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                                <p className="text-sm font-medium text-gray-900">User Verified</p>
                                <p className="text-xs text-gray-500 mt-0.5">Automated System</p>
                                <p className="text-xs text-gray-400 mt-1">{formatDate(user.created_at)}</p>
                            </div>
                            <div className="relative">
                                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                                <p className="text-sm font-medium text-gray-900">Account Created</p>
                                <p className="text-xs text-gray-500 mt-0.5">Sign up via Email</p>
                                <p className="text-xs text-gray-400 mt-1">{formatDate(user.created_at)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
