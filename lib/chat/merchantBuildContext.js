/**
 * lib/chat/merchantBuildContext.js
 *
 * Builds a rich account snapshot for the currently logged-in merchant,
 * to be injected into Gemini's system instruction.
 *
 * All DB reads use the admin (service-role) Supabase client — bypasses RLS.
 * NEVER include raw Aadhaar/PAN/account numbers/IFSC in the returned context.
 */

/**
 * @typedef {Object} MerchantContext
 * @property {boolean} isMerchant
 * @property {string} firstName
 * @property {string} fullName
 * @property {string} kycStatus
 * @property {string} businessName
 * @property {string} status
 * @property {boolean} isOpen
 * @property {string} subscriptionStatus
 * @property {boolean} bankVerified
 * @property {number} walletBalanceRs
 * @property {number} totalCommissionPaidRs
 * @property {number} pendingFulfillmentsCount
 * @property {number} pendingUdhariCount
 * @property {number} pendingUdhariTotalRs
 * @property {number} liveInventoryCount
 * @property {number} lowStockCount
 * @property {number} pendingPayoutsCount
 * @property {number} pendingPayoutsTotalRs
 * @property {string|null} lastPayoutStatus
 * @property {number} lockinPrincipalRs
 * @property {number} lockinInterestRs
 * @property {number|null} investmentsTotalRs
 * @property {number} directReferralsCount
 * @property {number} totalReferralPrizeRs
 * @property {string[]} recentOrders
 */

/**
 * @typedef {string} FormattedMerchantContext
 */

/**
 * Fetches a complete account snapshot for userId.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} adminClient
 * @param {string} userId
 * @returns {Promise<MerchantContext>}
 */
export async function buildMerchantContext(adminClient, userId) {
  // Stage 1: Parallel reads that don't need merchant.id
  const [merchantRes, profileRes] = await Promise.all([
    adminClient
      .from('merchants')
      .select('id, business_name, status, is_open, subscription_status, subscription_expires_at, bank_verified, business_phone, wallet_balance_paise, total_commission_paid_paise')
      .eq('user_id', userId)
      .maybeSingle(),
    adminClient
      .from('user_profiles')
      .select('full_name, kyc_status, phone, referral_code')
      .eq('id', userId)
      .single()
  ]);

  const profile = profileRes.data || {};
  const fullName = profile.full_name || 'Merchant';
  const firstName = fullName.split(' ')[0] || 'Merchant';
  
  const merchant = merchantRes.data;

  // If no merchant row, return an admin-bypass context
  if (!merchant) {
    return {
      isMerchant: false,
      firstName,
      fullName,
      kycStatus: profile.kyc_status || 'Pending',
      businessName: 'N/A',
      status: 'N/A',
      isOpen: false,
      subscriptionStatus: 'N/A',
      bankVerified: false,
      walletBalanceRs: 0,
      totalCommissionPaidRs: 0,
      pendingFulfillmentsCount: 0,
      pendingUdhariCount: 0,
      pendingUdhariTotalRs: 0,
      liveInventoryCount: 0,
      lowStockCount: 0,
      pendingPayoutsCount: 0,
      pendingPayoutsTotalRs: 0,
      lastPayoutStatus: null,
      lockinPrincipalRs: 0,
      lockinInterestRs: 0,
      investmentsTotalRs: null,
      directReferralsCount: 0,
      totalReferralPrizeRs: 0,
      recentOrders: []
    };
  }

  // Safe query wrapper to prevent one failure from breaking the whole context
  const safeQuery = (query) => query.then(res => res).catch(err => {
    console.warn('[merchantBuildContext] Stage 2 query failed:', err.message || err);
    return { data: null, error: err };
  });

  // Stage 2: Parallel reads keyed by merchant.id
  // 1. Last 5 orders
  const recentOrdersP = safeQuery(
    adminClient.from('shopping_order_groups')
      .select('id, delivery_status, settlement_status, total_amount_paise, created_at')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false })
      .limit(5)
  );

  // 2. Pending fulfillments count
  const pendingFulfillmentsP = safeQuery(
    adminClient.from('shopping_order_groups')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchant.id)
      .eq('delivery_status', 'pending')
  );

  // 3. Pending udhari
  const pendingUdhariP = safeQuery(
    adminClient.from('udhari_requests')
      .select('amount_paise')
      .eq('merchant_id', merchant.id)
      .eq('status', 'pending')
  );

  // 4. Inventory
  const inventoryP = safeQuery(
    adminClient.from('merchant_inventory')
      .select('stock_quantity, is_active')
      .eq('merchant_id', merchant.id)
  );

  // 5. Pending payouts
  const pendingPayoutsP = safeQuery(
    adminClient.from('payout_requests')
      .select('amount, status, requested_at')
      .eq('merchant_id', merchant.id)
      .eq('status', 'pending')
  );
  
  // 5.5 Last payout status
  const lastPayoutP = safeQuery(
    adminClient.from('payout_requests')
      .select('status')
      .eq('merchant_id', merchant.id)
      .order('requested_at', { ascending: false })
      .limit(1)
  );

  // 6. Active lockin
  const lockinP = safeQuery(
    adminClient.from('merchant_lockin_balances')
      .select('amount_paise, accumulated_interest_paise, status')
      .eq('merchant_id', merchant.id)
      .in('status', ['active', 'in_progress'])
  );

  // 7. Investments hub - best effort, document the missing table possibility
  const investmentsP = safeQuery(
    adminClient.from('merchant_investments')
      .select('amount_paise')
      .eq('merchant_id', merchant.id)
  );

  // 8. Referrals (duplicating underlying queries of getMerchantReferralData for isolation)
  const referralsNetworkP = safeQuery(
    adminClient.from('merchant_tree_paths')
      .select('descendant_id')
      .eq('ancestor_id', merchant.id)
      .eq('level', 1)
  );
  
  const referralsPrizeP = safeQuery(
    adminClient.from('merchant_transactions')
      .select('amount_paise')
      .eq('merchant_id', merchant.id)
      .eq('transaction_type', 'referral_reward')
  );

  const [
    recentOrdersRes,
    pendingFulfillmentsRes,
    pendingUdhariRes,
    inventoryRes,
    pendingPayoutsRes,
    lastPayoutRes,
    lockinRes,
    investmentsRes,
    referralsNetworkRes,
    referralsPrizeRes
  ] = await Promise.all([
    recentOrdersP, pendingFulfillmentsP, pendingUdhariP, inventoryP,
    pendingPayoutsP, lastPayoutP, lockinP, investmentsP,
    referralsNetworkP, referralsPrizeP
  ]);

  // --- Parse results ---

  // 1. Recent Orders
  const recentOrders = (recentOrdersRes.data || []).map(o => {
    const shortId = (o.id || '').slice(-6).toUpperCase();
    const amountRs = o.total_amount_paise ? o.total_amount_paise / 100 : 0;
    return `Order #${shortId} \u2014 ${o.delivery_status || 'Unknown'} \u2014 \u20B9${amountRs.toFixed(2)}`;
  });

  // 2. Pending Fulfillments
  const pendingFulfillmentsCount = pendingFulfillmentsRes.count || 0;

  // 3. Pending Udhari
  const udhariRows = pendingUdhariRes.data || [];
  const pendingUdhariCount = udhariRows.length;
  const pendingUdhariTotalRs = udhariRows.reduce((sum, r) => sum + (r.amount_paise || 0) / 100, 0);

  // 4. Inventory
  // Low-stock threshold is 5 (documented standard for merchant alerts)
  const LOW_STOCK_THRESHOLD = 5;
  const inventoryRows = inventoryRes.data || [];
  const liveInventoryCount = inventoryRows.filter(r => r.is_active).length;
  const lowStockCount = inventoryRows.filter(r => r.is_active && r.stock_quantity <= LOW_STOCK_THRESHOLD).length;

  // 5. Payouts
  const payoutRows = pendingPayoutsRes.data || [];
  const pendingPayoutsCount = payoutRows.length;
  const pendingPayoutsTotalRs = payoutRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const lastPayoutStatus = lastPayoutRes.data?.[0]?.status || null;

  // 6. Lockin
  const lockinRows = lockinRes.data || [];
  const lockinPrincipalRs = lockinRows.reduce((sum, r) => sum + (r.amount_paise || 0) / 100, 0);
  const lockinInterestRs = lockinRows.reduce((sum, r) => sum + (r.accumulated_interest_paise || 0) / 100, 0);

  // 7. Investments (best effort - table might not exist yet)
  let investmentsTotalRs = null;
  if (investmentsRes.data) {
    investmentsTotalRs = investmentsRes.data.reduce((sum, r) => sum + (r.amount_paise || 0) / 100, 0);
  }

  // 8. Referrals
  const directReferralsCount = referralsNetworkRes.data?.length || 0;
  const totalReferralPrizeRs = (referralsPrizeRes.data || []).reduce((sum, r) => sum + (r.amount_paise || 0) / 100, 0);

  return {
    isMerchant: true,
    firstName,
    fullName,
    kycStatus: profile.kyc_status || 'Pending',
    businessName: merchant.business_name || 'N/A',
    status: merchant.status || 'N/A',
    isOpen: !!merchant.is_open,
    subscriptionStatus: merchant.subscription_status || 'N/A',
    bankVerified: !!merchant.bank_verified,
    walletBalanceRs: (merchant.wallet_balance_paise || 0) / 100,
    totalCommissionPaidRs: (merchant.total_commission_paid_paise || 0) / 100,
    pendingFulfillmentsCount,
    pendingUdhariCount,
    pendingUdhariTotalRs,
    liveInventoryCount,
    lowStockCount,
    pendingPayoutsCount,
    pendingPayoutsTotalRs,
    lastPayoutStatus,
    lockinPrincipalRs,
    lockinInterestRs,
    investmentsTotalRs,
    directReferralsCount,
    totalReferralPrizeRs,
    recentOrders
  };
}

/**
 * Serializes a MerchantContext object into a compact bulleted string
 * suitable for inclusion in a system instruction.
 *
 * @param {MerchantContext} ctx
 * @returns {FormattedMerchantContext}
 */
export function formatMerchantContextForPrompt(ctx) {
  if (!ctx.isMerchant) {
    return `- Name: ${ctx.fullName}
- Note: This user does not have an active merchant profile.`;
  }

  const lines = [
    `- Business: ${ctx.businessName} (Status: ${ctx.status}, ${ctx.isOpen ? 'Open' : 'Closed'})`,
    `- Subscription: ${ctx.subscriptionStatus}`,
    `- KYC & Bank: ${ctx.kycStatus} / ${ctx.bankVerified ? 'Bank Verified' : 'Bank Not Verified'}`,
    `- Wallet Balance: ₹${ctx.walletBalanceRs.toFixed(2)}`,
  ];

  if (ctx.totalCommissionPaidRs > 0) {
    lines.push(`- Total Commission Earned: ₹${ctx.totalCommissionPaidRs.toFixed(2)}`);
  }

  if (ctx.pendingFulfillmentsCount > 0) {
    lines.push(`- Pending Fulfillments: ${ctx.pendingFulfillmentsCount} order(s) waiting to be shipped`);
  }

  if (ctx.pendingUdhariCount > 0) {
    lines.push(`- Pending Udhari: ${ctx.pendingUdhariCount} request(s) totaling ₹${ctx.pendingUdhariTotalRs.toFixed(2)}`);
  }

  lines.push(`- Inventory: ${ctx.liveInventoryCount} live item(s) (${ctx.lowStockCount} low on stock)`);

  if (ctx.pendingPayoutsCount > 0) {
    lines.push(`- Pending Payouts: ${ctx.pendingPayoutsCount} request(s) totaling ₹${ctx.pendingPayoutsTotalRs.toFixed(2)}`);
  }
  if (ctx.lastPayoutStatus) {
    lines.push(`- Last Payout Status: ${ctx.lastPayoutStatus}`);
  }

  if (ctx.lockinPrincipalRs > 0) {
    lines.push(`- Lockin Portfolio: Principal ₹${ctx.lockinPrincipalRs.toFixed(2)} | Interest ₹${ctx.lockinInterestRs.toFixed(2)}`);
  }

  if (ctx.investmentsTotalRs !== null && ctx.investmentsTotalRs > 0) {
    lines.push(`- Investments: ₹${ctx.investmentsTotalRs.toFixed(2)}`);
  }

  if (ctx.directReferralsCount > 0 || ctx.totalReferralPrizeRs > 0) {
    lines.push(`- Referrals: ${ctx.directReferralsCount} direct, earned ₹${ctx.totalReferralPrizeRs.toFixed(2)}`);
  }

  if (ctx.recentOrders.length > 0) {
    lines.push('- Recent Orders:');
    ctx.recentOrders.forEach((o) => lines.push(`  • ${o}`));
  } else {
    lines.push('- Recent Orders: None');
  }

  return lines.join('\n');
}
