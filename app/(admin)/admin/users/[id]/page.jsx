import { createAdminClient } from '@/lib/supabaseServer';
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
    ShoppingBag,
    Star,
    Gift,
    Copy,
    Sparkles,
    Briefcase,
    Trophy,
} from 'lucide-react';
import KYCReviewSection from './KYCReviewSection';
import WalletAdjustSection from './WalletAdjustSection';
import RewardAdjustSection from './RewardAdjustSection';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({ params }) {
    const supabase = createAdminClient();
    const { id } = await params;

    // Fetch current admin's permissions and role
    let adminPermissions = [];
    let isSuperAdmin = false;
    try {
        const { createServerSupabaseClient } = await import('@/lib/supabaseServer');
        const serverClient = await createServerSupabaseClient();
        const { data: { user: currentAdmin } } = await serverClient.auth.getUser();
        if (currentAdmin) {
            const { data: permData } = await supabase
                .from('admin_permissions')
                .select('permission')
                .eq('admin_user_id', currentAdmin.id);
            adminPermissions = (permData || []).map(p => p.permission);

            const { data: adminProfile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', currentAdmin.id)
                .single();
            isSuperAdmin = adminProfile?.role === 'super_admin';
        }
    } catch (e) {
        // Table may not exist yet — graceful fallback
        console.log('admin_permissions not available yet:', e);
    }

    // Fetch User Profile
    const { data: user, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error || !user) {
        notFound();
    }

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

    // Fetch Referrer Details if applicable
    let referrer = null;
    if (user.referred_by) {
        const { data: refUser } = await supabase
            .from('user_profiles')
            .select('id, full_name, email')
            .eq('id', user.referred_by)
            .maybeSingle();
        referrer = refUser;
    }

    // Fetch KYC separately
    let kyc_records = [];
    const { data: kyc } = await supabase
        .from('kyc_records')
        .select('*')
        .eq('user_id', id);
    if (kyc) kyc_records = kyc;

    // Fetch Unified Order History (Shopping, Gift Cards, NFC)
    let unifiedOrders = [];
    let spendingStats = { totalSpent: 0, shopping: 0, giftCards: 0, nfc: 0, count: 0 };

    try {
        const [shoppingOrders, giftCardOrders, nfcOrders] = await Promise.all([
            supabase.from('shopping_order_groups').select('*').eq('customer_id', id).eq('status', 'completed'),
            supabase.from('transactions').select('*').eq('user_id', id).in('status', ['PAID', 'COMPLETED', 'completed', 'success']),
            supabase.from('nfc_orders').select('*').eq('user_id', id).eq('payment_status', 'paid')
        ]);

        const shops = (shoppingOrders.data || []).map(o => ({ ...o, type: 'SHOPPING', amount: Number(o.total_amount_paise) || 0 }));
        const gifts = (giftCardOrders.data || []).map(o => ({ ...o, type: 'GIFT_CARD', amount: Number(o.total_paid_paise || o.amount || 0) }));
        const nfcs = (nfcOrders.data || []).map(o => ({ ...o, type: 'NFC_CARD', amount: Number(o.sale_price_paise) || 0 }));

        unifiedOrders = [...shops, ...gifts, ...nfcs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        spendingStats = unifiedOrders.reduce((acc, order) => {
            acc.totalSpent += order.amount;
            acc.count += 1;
            if (order.type === 'SHOPPING') acc.shopping += order.amount;
            if (order.type === 'GIFT_CARD') acc.giftCards += order.amount;
            if (order.type === 'NFC_CARD') acc.nfc += order.amount;
            return acc;
        }, { totalSpent: 0, shopping: 0, giftCards: 0, nfc: 0, count: 0 });

    } catch (e) {
        console.log('Error fetching unified orders', e);
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

    // Reward Points Balance
    let rewardPoints = {
        current_balance: 0,
        total_earned: 0,
        total_redeemed: 0,
        tier: 'bronze',
        tree_size: 0,
        direct_referrals: 0,
    };
    try {
        const { data: rpRow } = await supabase
            .from('reward_points_balance')
            .select('current_balance, total_earned, total_redeemed, tier, tree_size, direct_referrals')
            .eq('user_id', id)
            .maybeSingle();

        if (rpRow) {
            rewardPoints = {
                current_balance: rpRow.current_balance ?? 0,
                total_earned: rpRow.total_earned ?? 0,
                total_redeemed: rpRow.total_redeemed ?? 0,
                tier: rpRow.tier ?? 'bronze',
                tree_size: rpRow.tree_size ?? 0,
                direct_referrals: rpRow.direct_referrals ?? 0,
            };
        }
    } catch (e) {
        console.log('Error fetching reward points balance:', e);
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
            case 'verified': return <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase"><CheckCircle size={14} /> Verified</span>;
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
            desc: `Document: ${(latestKyc.id_type || latestKyc.document_type || 'Unknown').replace('_', ' ')}`,
            date: latestKyc.updated_at || latestKyc.created_at,
            color: latestKyc.status === 'verified' ? "bg-green-500" : latestKyc.status === 'rejected' ? "bg-red-500" : "bg-yellow-500"
        });
    }

    unifiedOrders.slice(0, 5).forEach(o => {
        activities.push({
            title: o.type.replace('_', ' '),
            desc: `₹${(o.amount / 100).toLocaleString('en-IN')}`,
            date: o.created_at,
            color: "bg-emerald-500"
        });
    });

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="p-6 pb-32 max-w-7xl mx-auto font-[family-name:var(--font-outfit)]">
            {/* Header */}
            <div className="bg-white rounded-3xl p-8 mb-8 border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-cyan-500" />

                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                            <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide border ${['admin', 'super_admin'].includes(user.role) ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                {user.role || 'customer'}
                            </span>
                            {user.kyc_status && getStatusBadge(user.kyc_status)}
                            {user.is_gold_verified && user.subscription_expiry && new Date(user.subscription_expiry) > new Date() && (
                                <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wide bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md shadow-amber-200">
                                    <Star size={13} className="fill-black" />
                                    Gold Member
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: KYC & Personal Info */}
                <div className="space-y-8 lg:col-span-2">

                    {/* KYC Section */}
                    <KYCReviewSection kyc_records={kyc_records} userKycStatus={user.kyc_status} />

                    {/* Onboarding Interests */}
                    {(user.services?.length > 0 || user.occupation) && (
                        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2 mb-6 tracking-tight">
                                <Sparkles className="text-purple-500" />
                                Onboarding Interests
                            </h2>

                            <div className="space-y-5">
                                {user.occupation && (
                                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                            <Briefcase size={16} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Occupation</p>
                                            <p className="font-bold text-slate-900">{user.occupation}</p>
                                        </div>
                                    </div>
                                )}

                                {user.services?.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Selected Services</p>
                                        <div className="flex flex-wrap gap-2">
                                            {user.services.map((svc) => (
                                                <span
                                                    key={svc}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl text-xs font-bold uppercase tracking-wide"
                                                >
                                                    <Sparkles size={11} />
                                                    {svc.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {user.referral_source && (
                                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                            <Gift size={16} className="text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">How They Found Us</p>
                                            <p className="font-bold text-slate-900 capitalize">{user.referral_source.replace(/_/g, ' ')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Spending Analytics */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                    <ShoppingBag className="text-indigo-600" size={20} />
                                </div>
                                Spending Analytics
                            </h2>
                            <div className="flex flex-col items-end">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lifetime Value (LTV)</p>
                                <p className="text-2xl font-black text-slate-900">₹{(spendingStats.totalSpent / 100).toLocaleString('en-IN')}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">E-Commerce</p>
                                    <p className="text-lg font-black text-slate-900">₹{(spendingStats.shopping / 100).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">🛍️</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gift Cards</p>
                                    <p className="text-lg font-black text-slate-900">₹{(spendingStats.giftCards / 100).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">🎁</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">NFC One</p>
                                    <p className="text-lg font-black text-slate-900">₹{(spendingStats.nfc / 100).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">🪪</div>
                            </div>
                        </div>

                        {unifiedOrders.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-left">
                                            <th className="pb-3 font-bold text-gray-400 text-[10px] uppercase tracking-wider">Order Type</th>
                                            <th className="pb-3 font-bold text-gray-400 text-[10px] uppercase tracking-wider">Date</th>
                                            <th className="pb-3 font-bold text-gray-400 text-[10px] uppercase tracking-wider text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {unifiedOrders.slice(0, 10).map((order, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${order.type === 'SHOPPING' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                            order.type === 'GIFT_CARD' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                                'bg-amber-50 text-amber-700 border-amber-100'
                                                        }`}>
                                                        {order.type.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-xs font-bold text-slate-500">
                                                    {formatDate(order.created_at)}
                                                </td>
                                                <td className="py-4 text-right font-black text-slate-900">
                                                    ₹{(order.amount / 100).toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-4 opacity-50" />
                                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No transaction history</p>
                            </div>
                        )}
                    </div>

                    {/* Referral Info */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                        <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2 mb-6 tracking-tight">
                            <Gift className="text-emerald-500" />
                            Referral Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* User's Own Code */}
                            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/70 mb-2">User's Referral Code</p>
                                {user.referral_code ? (
                                    <div className="flex items-center gap-3">
                                        <code className="text-xl font-mono font-black text-emerald-700 tracking-widest">{user.referral_code}</code>
                                    </div>
                                ) : (
                                    <p className="text-sm font-medium text-gray-500 italic">No code generated yet</p>
                                )}
                            </div>

                            {/* Who Referred Them */}
                            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Referred By</p>
                                {referrer ? (
                                    <div>
                                        <p className="font-bold text-gray-900">{referrer.full_name}</p>
                                        <p className="text-sm text-gray-500">{referrer.email}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm font-medium text-gray-500 italic">Organic Sign up (No referrer)</p>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Column: Quick Info & Activity */}
                <div className="space-y-8">

                    {/* Gold Subscription Status Card */}
                    {user.is_gold_verified ? (
                        <div className={`rounded-3xl p-6 border shadow-xl ${user.subscription_expiry && new Date(user.subscription_expiry) > new Date()
                            ? 'bg-gradient-to-br from-[#1a1600] via-[#2a2200] to-[#000] border-amber-500/40 text-white'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                            }`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2 rounded-xl ${user.subscription_expiry && new Date(user.subscription_expiry) > new Date()
                                    ? 'bg-amber-400/20'
                                    : 'bg-gray-200'
                                    }`}>
                                    <Star size={18} className={user.subscription_expiry && new Date(user.subscription_expiry) > new Date() ? 'text-amber-400 fill-amber-400' : 'text-gray-400 fill-gray-400'} />
                                </div>
                                <h2 className="text-base font-extrabold tracking-tight">
                                    Gold Subscription
                                </h2>
                            </div>
                            {user.subscription_expiry && new Date(user.subscription_expiry) > new Date() ? (
                                <>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Active</p>
                                    <p className="text-xs font-semibold text-amber-200/70">
                                        Expires on {new Date(user.subscription_expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Expired</p>
                                    <p className="text-xs font-semibold text-gray-500">
                                        Expired on {user.subscription_expiry ? new Date(user.subscription_expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                                    </p>
                                </>
                            )}
                        </div>
                    ) : null}

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
                            {isSuperAdmin && (
                                <WalletAdjustSection userId={id} initialBalance={walletBalance} adminPermissions={adminPermissions} />
                            )}
                            <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                                <span className="text-slate-400 font-medium text-sm">Total Spent</span>
                                <span className="font-bold text-white text-lg">
                                    ₹{(spendingStats.totalSpent / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-slate-400 font-medium text-sm">Valid Orders</span>
                                <span className="font-bold text-white bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">{unifiedOrders.filter(o => o.status === 'completed' || o.payment_status === 'paid').length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Reward Points Card */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 border border-amber-500/20 shadow-xl text-white">
                        <h2 className="text-lg font-extrabold text-white mb-5 tracking-tight flex items-center gap-2">
                            <Trophy size={20} className="text-amber-400" />
                            Reward Points (IRP)
                        </h2>
                        <div className="space-y-3">
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Current Balance</span>
                                <span className="font-extrabold text-3xl text-amber-400">{rewardPoints.current_balance.toLocaleString('en-IN')} <span className="text-sm font-bold text-slate-400">pts</span></span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1">Total Earned</span>
                                    <span className="font-bold text-white">{rewardPoints.total_earned.toLocaleString('en-IN')} pts</span>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1">Total Redeemed</span>
                                    <span className="font-bold text-white">{rewardPoints.total_redeemed.toLocaleString('en-IN')} pts</span>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1">Network Size</span>
                                    <span className="font-bold text-white">{rewardPoints.tree_size} users</span>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1">Direct Referrals</span>
                                    <span className="font-bold text-white">{rewardPoints.direct_referrals} users</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between bg-slate-800/50 px-4 py-3 rounded-xl border border-slate-700">
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tier</span>
                                <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${rewardPoints.tier === 'platinum' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' :
                                        rewardPoints.tier === 'gold' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                            rewardPoints.tier === 'silver' ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' :
                                                'bg-amber-700/20 text-amber-700 border border-amber-700/30'
                                    }`}>
                                    {rewardPoints.tier === 'platinum' ? '💎' : rewardPoints.tier === 'gold' ? '🥇' : rewardPoints.tier === 'silver' ? '🥈' : '🥉'} {rewardPoints.tier.charAt(0).toUpperCase() + rewardPoints.tier.slice(1)}
                                </span>
                            </div>
                        </div>
                        {isSuperAdmin && (
                            <RewardAdjustSection userId={id} initialBalance={rewardPoints.current_balance} />
                        )}
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
