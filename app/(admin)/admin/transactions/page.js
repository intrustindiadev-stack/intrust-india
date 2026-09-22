import { Activity, IndianRupee, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { createAdminClient } from '@/lib/supabaseServer';
import TransactionsLedger from "@/components/admin/transactions/TransactionsLedger";

export const dynamic = 'force-dynamic';

function formatCategory(udf1) {
    if (!udf1) return 'Platform Payment';
    const map = {
        'CART_CHECKOUT': 'Cart Checkout',
        'MERCHANT_SUBSCRIPTION': 'Merchant Subscription',
        'MERCHANT_TOPUP': 'Merchant Top-up',
        'WALLET_TOPUP': 'Wallet Top-up',
        'AI_ORDER': 'AI Order',
        'MERCHANT_AIGROW': 'AI Grow Top-up',
        'GIFT_CARD': 'Gift Card Order',
        'NFC_ORDER': 'NFC Order',
        'WHOLESALE_PURCHASE': 'Wholesale Purchase',
        'INVOICE_PAY': 'Invoice Payment',
        'GOLD_SUBSCRIPTION': 'Gold Subscription',
        'UDHARI_PAYMENT': 'Udhari Settlement',
        'MERCHANT_LOCKIN': 'Merchant Lock-in'
    };
    return map[udf1] || udf1.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default async function TransactionsPage({ searchParams }) {
    const supabase = createAdminClient();
    const params = await searchParams;

    // Pagination & Filter Parameters
    const page = Math.max(1, Number(params?.page) || 1);
    const limit = 25;
    const offset = (page - 1) * limit;
    const search = (params?.search || '').trim();
    const statusFilter = (params?.status || '').trim();

    // ──────────────── BUILD PRIMARY TRANSACTIONS QUERY ────────────────
    let txnQuery = supabase
        .from('transactions')
        .select(`
            id,
            client_txn_id,
            sabpaisa_txn_id,
            amount,
            paid_amount,
            paid_amount_paise,
            total_paid_paise,
            currency,
            status,
            payment_mode,
            bank_name,
            bank_txn_id,
            rrn,
            payer_name,
            payer_email,
            payer_mobile,
            udf1,
            udf2,
            created_at,
            completed_at,
            refund_status,
            user:user_profiles(id, full_name, email, phone, role, avatar_url)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

    // Status Filter (matching PostgreSQL enum transaction_status)
    if (statusFilter === 'Success') {
        txnQuery = txnQuery.in('status', ['gateway_success', 'completed']);
    } else if (statusFilter === 'Failed') {
        txnQuery = txnQuery.in('status', ['failed', 'aborted']);
    } else if (statusFilter === 'Pending') {
        txnQuery = txnQuery.in('status', ['initiated', 'pending']);
    } else if (statusFilter === 'Refunded') {
        txnQuery = txnQuery.eq('status', 'refunded');
    } else if (statusFilter) {
        txnQuery = txnQuery.eq('status', statusFilter.toLowerCase());
    }

    // Search Filter
    if (search) {
        // Query user_profiles to match by user name, email, or phone
        const { data: matchedUsers } = await supabase
            .from('user_profiles')
            .select('id')
            .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
            .limit(50);

        const matchedIds = (matchedUsers || []).map(u => u.id).filter(Boolean);

        const orClauses = [
            `client_txn_id.ilike.%${search}%`,
            `sabpaisa_txn_id.ilike.%${search}%`,
            `payer_name.ilike.%${search}%`,
            `payer_email.ilike.%${search}%`,
            `payer_mobile.ilike.%${search}%`,
            `udf1.ilike.%${search}%`
        ];

        if (matchedIds.length > 0) {
            orClauses.push(`user_id.in.(${matchedIds.join(',')})`);
        }

        txnQuery = txnQuery.or(orClauses.join(','));
    }

    // Apply database pagination
    txnQuery = txnQuery.range(offset, offset + limit - 1);

    // ──────────────── FETCH TRANSACTIONS & SUMMARY STATS ────────────────
    const [txnResult, statsResult] = await Promise.all([
        txnQuery,
        supabase
            .from('transactions')
            .select('amount, paid_amount, paid_amount_paise, total_paid_paise, status, created_at')
    ]);

    const rawTxns = txnResult.data || [];
    const totalCount = txnResult.count || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    // Calculate Summary KPIs
    const allRows = statsResult.data || [];
    const todayStr = new Date().toISOString().split('T')[0];
    let totalSuccessfulVolume = 0;
    let successfulCount = 0;
    let pendingCount = 0;
    let todaysRevenue = 0;

    allRows.forEach(r => {
        const s = r.status;
        const isSuccess = s === 'gateway_success' || s === 'completed';
        const isPending = s === 'initiated' || s === 'pending';
        const amt = Number(r.amount) || (r.paid_amount_paise ? Number(r.paid_amount_paise) / 100 : (r.total_paid_paise ? Number(r.total_paid_paise) / 100 : Number(r.paid_amount) || 0));

        if (isSuccess) {
            totalSuccessfulVolume += amt;
            successfulCount++;
            if ((r.created_at || '').startsWith(todayStr)) {
                todaysRevenue += amt;
            }
        } else if (isPending) {
            pendingCount++;
        }
    });

    // ──────────────── NORMALIZE TRANSACTIONS FOR LEDGER ────────────────
    const transactions = rawTxns.map(t => {
        const rawAmount = Number(t.amount) || (t.paid_amount_paise ? Number(t.paid_amount_paise) / 100 : (t.total_paid_paise ? Number(t.total_paid_paise) / 100 : Number(t.paid_amount) || 0));

        const isSuccess = t.status === 'gateway_success' || t.status === 'completed';
        const isFailed = t.status === 'failed' || t.status === 'aborted';
        const isRefunded = t.status === 'refunded';

        const statusNorm = isSuccess ? 'Success' : isFailed ? 'Failed' : isRefunded ? 'Refunded' : 'Pending';

        const userName = t.user?.full_name?.trim() 
            || t.payer_name?.trim() 
            || (t.user?.email ? t.user.email.split('@')[0] : null) 
            || (t.payer_email ? t.payer_email.split('@')[0] : null) 
            || 'Unknown User';

        const createdDate = new Date(t.created_at);
        const dateFormatted = !isNaN(createdDate.getTime())
            ? createdDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';
        const timeFormatted = !isNaN(createdDate.getTime())
            ? createdDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
            : '';

        return {
            rawId: t.id,
            clientTxnId: t.client_txn_id,
            sabpaisaTxnId: t.sabpaisa_txn_id,
            bankTxnId: t.bank_txn_id,
            amount: rawAmount,
            amountFormatted: `₹${rawAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            currency: t.currency || 'INR',
            status: statusNorm,
            rawStatus: t.status,
            type: isRefunded ? 'Debit' : 'Credit',
            paymentMode: t.payment_mode || '',
            bankName: t.bank_name || '',
            description: formatCategory(t.udf1),
            dateRaw: t.created_at,
            dateFormatted,
            timeFormatted,
            userName,
            userEmail: t.user?.email || t.payer_email || '',
            userPhone: t.user?.phone || t.payer_mobile || '',
            userRole: t.user?.role || null,
            userAvatar: t.user?.avatar_url || null,
            payerName: t.payer_name || '',
            payerEmail: t.payer_email || '',
            payerMobile: t.payer_mobile || ''
        };
    });

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-[family-name:var(--font-outfit)] space-y-6 sm:space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <Activity className="text-blue-600 w-9 h-9" />
                        Transactions Ledger
                    </h1>
                    <p className="text-slate-500 font-medium text-sm sm:text-base">
                        Real-time audit log of payments, checkouts, and platform gateway volume.
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {/* Total Transactions */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-blue-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Records</p>
                        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{allRows.length.toLocaleString('en-IN')}</p>
                        <p className="text-xs font-semibold text-slate-400 mt-1">Platform-wide</p>
                    </div>
                </div>

                {/* Total Revenue */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Settled</p>
                        <p className="text-xl sm:text-2xl font-extrabold text-emerald-600">
                            ₹{totalSuccessfulVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
                            <CheckCircle2 size={12} /> {successfulCount} successful
                        </p>
                    </div>
                </div>

                {/* Today's Inflow */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-teal-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Today's Inflow</p>
                        <p className="text-xl sm:text-2xl font-extrabold text-teal-600">
                            ₹{todaysRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs font-semibold text-slate-400 mt-1">Today ({todayStr})</p>
                    </div>
                </div>

                {/* Pending */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">In-Flight / Pending</p>
                        <p className="text-xl sm:text-2xl font-extrabold text-amber-600">{pendingCount.toLocaleString('en-IN')}</p>
                        <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                            <Clock size={12} /> Awaiting gateway
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Ledger Component (Desktop Data Table + Mobile High-Density List) */}
            <TransactionsLedger
                transactions={transactions}
                totalCount={totalCount}
                page={page}
                totalPages={totalPages}
                search={search}
                statusFilter={statusFilter}
            />
        </div>
    );
}
