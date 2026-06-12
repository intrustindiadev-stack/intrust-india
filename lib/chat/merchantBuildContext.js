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
  let timeoutId;

  // 1. Establish default/fallback context
  const context = {
    isMerchant: false,
    firstName: 'Merchant',
    fullName: 'Merchant',
    kycStatus: 'Pending',
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

  // 2. Safe query wrapper to prevent individual query failures from breaking the whole context
  const safeQuery = (query) => {
    if (query && typeof query.then === 'function') {
      return query.then(res => res).catch(err => {
        console.warn('[merchantBuildContext] Query failed:', err.message || err);
        return { data: null, error: err };
      });
    }
    return Promise.resolve(query);
  };

  try {
    const contextPromise = (async () => {
      // Stage 1: Parallel reads that don't need merchant.id
      const profilePromise = safeQuery(
        adminClient
          .from('user_profiles')
          .select('full_name, kyc_status, phone, referral_code')
          .eq('id', userId)
          .single()
      ).then(res => {
        if (res?.data) {
          context.fullName = res.data.full_name || 'Merchant';
          context.firstName = context.fullName.split(' ')[0] || 'Merchant';
          context.kycStatus = res.data.kyc_status || 'Pending';
        }
      });

      const merchantPromise = safeQuery(
        adminClient
          .from('merchants')
          .select('id, business_name, status, is_open, subscription_status, subscription_expires_at, bank_verified, business_phone, wallet_balance_paise, total_commission_paid_paise')
          .eq('user_id', userId)
          .maybeSingle()
      ).then(async res => {
        const merchant = res?.data;
        if (merchant) {
          context.isMerchant = true;
          context.businessName = merchant.business_name || 'N/A';
          context.status = merchant.status || 'N/A';
          context.isOpen = !!merchant.is_open;
          context.subscriptionStatus = merchant.subscription_status || 'N/A';
          context.bankVerified = !!merchant.bank_verified;
          context.walletBalanceRs = (merchant.wallet_balance_paise || 0) / 100;
          context.totalCommissionPaidRs = (merchant.total_commission_paid_paise || 0) / 100;

          // Stage 2: Parallel reads keyed by merchant.id
          const recentOrdersP = safeQuery(
            adminClient.from('shopping_order_groups')
              .select('id, delivery_status, settlement_status, total_amount_paise, created_at')
              .eq('merchant_id', merchant.id)
              .order('created_at', { ascending: false })
              .limit(5)
          ).then(r => {
            if (r?.data) {
              context.recentOrders = r.data.map(o => {
                const shortId = (o.id || '').slice(-6).toUpperCase();
                const amountRs = o.total_amount_paise ? o.total_amount_paise / 100 : 0;
                return `Order #${shortId} — ${o.delivery_status || 'Unknown'} — ₹${amountRs.toFixed(2)}`;
              });
            }
          });

          const pendingFulfillmentsP = safeQuery(
            adminClient.from('shopping_order_groups')
              .select('id', { count: 'exact', head: true })
              .eq('merchant_id', merchant.id)
              .eq('delivery_status', 'pending')
          ).then(r => {
            context.pendingFulfillmentsCount = r?.count || 0;
          });

          const pendingUdhariP = safeQuery(
            adminClient.from('udhari_requests')
              .select('amount_paise')
              .eq('merchant_id', merchant.id)
              .eq('status', 'pending')
          ).then(r => {
            if (r?.data) {
              const udhariRows = r.data;
              context.pendingUdhariCount = udhariRows.length;
              context.pendingUdhariTotalRs = udhariRows.reduce((sum, row) => sum + (row.amount_paise || 0) / 100, 0);
            }
          });

          const inventoryP = safeQuery(
            adminClient.from('merchant_inventory')
              .select('stock_quantity, is_active')
              .eq('merchant_id', merchant.id)
          ).then(r => {
            if (r?.data) {
              const LOW_STOCK_THRESHOLD = 5;
              const inventoryRows = r.data;
              context.liveInventoryCount = inventoryRows.filter(row => row.is_active).length;
              context.lowStockCount = inventoryRows.filter(row => row.is_active && row.stock_quantity <= LOW_STOCK_THRESHOLD).length;
            }
          });

          const pendingPayoutsP = safeQuery(
            adminClient.from('payout_requests')
              .select('amount, status, requested_at')
              .eq('merchant_id', merchant.id)
              .eq('status', 'pending')
          ).then(r => {
            if (r?.data) {
              const payoutRows = r.data;
              context.pendingPayoutsCount = payoutRows.length;
              context.pendingPayoutsTotalRs = payoutRows.reduce((sum, row) => sum + (row.amount || 0), 0);
            }
          });

          const lastPayoutP = safeQuery(
            adminClient.from('payout_requests')
              .select('status')
              .eq('merchant_id', merchant.id)
              .order('requested_at', { ascending: false })
              .limit(1)
          ).then(r => {
            if (r?.data) {
              context.lastPayoutStatus = r.data[0]?.status || null;
            }
          });

          const lockinP = safeQuery(
            adminClient.from('merchant_lockin_balances')
              .select('amount_paise, accumulated_interest_paise, status')
              .eq('merchant_id', merchant.id)
              .in('status', ['active', 'in_progress'])
          ).then(r => {
            if (r?.data) {
              const lockinRows = r.data;
              context.lockinPrincipalRs = lockinRows.reduce((sum, row) => sum + (row.amount_paise || 0) / 100, 0);
              context.lockinInterestRs = lockinRows.reduce((sum, row) => sum + (row.accumulated_interest_paise || 0) / 100, 0);
            }
          });

          const investmentsP = safeQuery(
            adminClient.from('merchant_investments')
              .select('amount_paise')
              .eq('merchant_id', merchant.id)
              .eq('status', 'active')
          ).then(r => {
            if (r?.data) {
              context.investmentsTotalRs = r.data.reduce((sum, row) => sum + (row.amount_paise || 0) / 100, 0);
            }
          });

          const referralsNetworkP = safeQuery(
            adminClient.from('merchant_tree_paths')
              .select('descendant_id')
              .eq('ancestor_id', merchant.id)
              .eq('level', 1)
          ).then(r => {
            context.directReferralsCount = r?.data?.length || 0;
          });

          const referralsPrizeP = safeQuery(
            adminClient.from('merchant_transactions')
              .select('amount_paise')
              .eq('merchant_id', merchant.id)
              .eq('transaction_type', 'referral_reward')
          ).then(r => {
            if (r?.data) {
              context.totalReferralPrizeRs = r.data.reduce((sum, row) => sum + (row.amount_paise || 0) / 100, 0);
            }
          });

          await Promise.all([
            recentOrdersP, pendingFulfillmentsP, pendingUdhariP, inventoryP,
            pendingPayoutsP, lastPayoutP, lockinP, investmentsP,
            referralsNetworkP, referralsPrizeP
          ]);
        }
      });

      await Promise.all([profilePromise, merchantPromise]);
      return context;
    })();

    // 3. Set a timeout that resolves with whatever context we have built so far, rather than throwing
    const timeoutPromise = new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn('[merchantBuildContext] Merchant context build timed out after 5 seconds, returning partial context.');
        resolve(context);
      }, 5000); // Raised cap to 5 seconds
    });

    const result = await Promise.race([contextPromise, timeoutPromise]);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
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
    `- Name: ${ctx.fullName}`,
    `- First name: ${ctx.firstName}`,
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
    lines.push(`- AI Grow: ₹${ctx.investmentsTotalRs.toFixed(2)}`);
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
