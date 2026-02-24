import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { notFound, redirect } from 'next/navigation';
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
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    // Fetch User Profile
    const { data: user, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error || !user) {
        notFound();
    }

    // Role-Based Redirection: If merchant, go to merchant detail
    if (user.role === 'merchant') {
        const { data: merchant } = await supabase
            .from('merchants')
            .select('id')
            .eq('user_id', id)
            .maybeSingle();

        if (merchant) {
            redirect(`/admin/merchants/${merchant.id}`);
        }
    }

    // Fetch KYC separately
    let kyc_records = [];
    const { data: kyc } = await supabase
        .from('kyc_records')
        .select('*')
        .eq('user_id', id);
    if (kyc) kyc_records = kyc;

    // Fetch Recent Orders (Customer context)
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
        console.log('Could not fetch orders', e);
    }

    // Customer Wallet Balance
    let walletBalance = 0;
    try {
        const { data: customerWallet } = await supabase
            .from('customer_wallets')
            .select('balance_paise')
            .eq('user_id', id)
            .maybeSingle();

        if (customerWallet && customerWallet.balance_paise) {
            walletBalance = customerWallet.balance_paise / 100;
        }
    } catch (e) {
        console.log('Error fetching customer wallet balance:', e);
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

    // simplified Activity Feed
    const activities = [
        {
            title: "Account Created",
            desc: "Sign up successful",
            date: user.created_at,
            color: "bg-blue-500"
        }
    ];

    if (kyc_records && kyc_records.length > 0) {
        const latestKyc = kyc_records[0];
        activities.push({
            title: `KYC ${latestKyc.status}`,
            desc: `Document: ${(latestKyc.document_type || 'Unknown').replace('_', ' ')}`,
            date: latestKyc.updated_at || latestKyc.created_at,
            color: latestKyc.status === 'approved' ? "bg-green-500" : latestKyc.status === 'rejected' ? "bg-red-500" : "bg-yellow-500"
        });
    }

    orders.slice(0, 3).forEach(o => {
        activities.push({
            title: "Transaction",
            desc: `₹${((o.amount || 0) / 100).toLocaleString('en-IN')} — ${o.payment_status}`,
            date: o.created_at,
            color: o.payment_status === 'paid' ? "bg-emerald-500" : "bg-gray-400"
        });
    });

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="p-6 max-w-7xl mx-auto font-[family-name:var(--font-outfit)]">
            {/* Header */}
            <div className="bg-white rounded-3xl p-8 mb-8 border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-cyan-500" />

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
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-600 mb-4 font-medium">
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
                            <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide border ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
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
                    <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2 tracking-tight">
                                <Shield className="text-indigo-600" />
                                KYC Verification
                            </h2>
                            {user.kyc_status === 'pending' && (
                                <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                                    Review Application
                                </button>
                            )}
                        </div>

                        {kyc_records && kyc_records.length > 0 ? (
                            <div className="space-y-4">
                                {kyc_records.map((record) => (
                                    <div key={record.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 hover:border-indigo-100 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-gray-900 capitalize text-lg tracking-tight">
                                                {(record.document_type || 'Unknown').replace('_', ' ')}
                                            </span>
                                            {getStatusBadge(record.status)}
                                        </div>
                                        <p className="text-sm font-medium text-gray-600 mb-3">
                                            Document Number: <span className="font-mono bg-white px-2 py-1 rounded border border-gray-200 ml-2">{record.document_number}</span>
                                        </p>
                                        {record.front_image_url && (
                                            <div className="mt-4">
                                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Document Image</p>
                                                <a href={record.front_image_url} target="_blank" rel="noopener noreferrer" className="block w-full h-40 bg-gray-200 rounded-xl overflow-hidden relative group">
                                                    <img src={record.front_image_url} alt="Document" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-indigo-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-sm backdrop-blur-sm">
                                                        Open Full Size Details
                                                    </div>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">No KYC records found for this user.</p>
                            </div>
                        )}
                    </div>

                    {/* Order History (if user has orders) */}
                    {orders.length > 0 && (
                        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2 mb-6 tracking-tight">
                                <ShoppingBag className="text-indigo-600" />
                                Recent Orders
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-gray-100 text-left">
                                            <th className="pb-3 font-bold text-gray-400 text-[10px] uppercase tracking-wider">Order ID</th>
                                            <th className="pb-3 font-bold text-gray-400 text-[10px] uppercase tracking-wider">Date</th>
                                            <th className="pb-3 font-bold text-gray-400 text-[10px] uppercase tracking-wider">Amount</th>
                                            <th className="pb-3 font-bold text-gray-400 text-[10px] uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 font-medium">
                                        {orders.map(order => (
                                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-4 font-mono text-sm text-gray-500">
                                                    {order.id.slice(0, 8)}...
                                                </td>
                                                <td className="py-4 text-sm text-gray-900">
                                                    {formatDate(order.created_at)}
                                                </td>
                                                <td className="py-4 font-bold text-gray-900">
                                                    ₹{((order.amount || 0) / 100).toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-4">
                                                    <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider border ${order.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        order.payment_status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200'
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
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl text-white">
                        <h2 className="text-lg font-extrabold text-white mb-6 tracking-tight flex items-center gap-2">
                            <CreditCard size={20} className="text-blue-400" />
                            Account Financials
                        </h2>
                        <div className="space-y-5">
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Live Wallet Balance</span>
                                <span className="font-extrabold text-3xl text-white">₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                                <span className="text-slate-400 font-medium text-sm">Total Spent</span>
                                <span className="font-bold text-white text-lg">
                                    ₹{orders.reduce((sum, o) => sum + (o.payment_status === 'paid' ? (o.amount || 0) / 100 : 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-slate-400 font-medium text-sm">Valid Orders</span>
                                <span className="font-bold text-white bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">{orders.filter(o => o.payment_status === 'paid').length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-extrabold text-gray-900 mb-6 tracking-tight">Activity Timeline</h2>
                        <div className="relative pl-4 border-l-2 border-gray-100 space-y-6">
                            {activities.map((act, idx) => (
                                <div className="relative group" key={idx}>
                                    <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ${act.color} border-2 border-white group-hover:scale-125 transition-transform`} />
                                    <p className="text-sm font-extrabold text-gray-900">{act.title}</p>
                                    <p className="text-xs font-medium text-gray-500 mt-0.5">{act.desc}</p>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider bg-gray-50 w-fit px-2 py-0.5 rounded">{formatDate(act.date)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
