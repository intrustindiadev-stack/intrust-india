/**
 * lib/chat/buildContext.js
 *
 * Builds a rich account snapshot for the currently logged-in user,
 * to be injected into Gemini's system instruction.
 *
 * All DB reads use the admin (service-role) Supabase client — bypasses RLS.
 * NEVER include raw Aadhaar/PAN/account numbers in the returned context.
 */

/**
 * @typedef {Object} UserContext
 * @property {string} firstName
 * @property {string} fullName
 * @property {string} email
 * @property {string} phone
 * @property {string} role
 * @property {string} kycStatus
 * @property {number} walletBalanceRs
 * @property {string[]} recentTransactions  - formatted strings
 * @property {number|null} rewardPoints
 * @property {number} activeGiftCardCount
 * @property {number} activeGiftCardTotalRs
 * @property {string[]} recentOrders        - formatted strings
 * @property {string|null} referralCode
 * @property {number|null} storeCreditsRs
 */

/**
 * @typedef {string} FormattedUserContext
 */

/**
 * Fetches a complete account snapshot for userId.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} adminClient
 * @param {string} userId
 * @returns {Promise<UserContext>}
 */
export async function buildUserContext(adminClient, userId) {
  // Run all queries in parallel — independent fetches
  const [profileRes, walletRes, txRes, rewardsRes, giftCardsRes, ordersRes, referralRes, storeCreditsRes] =
    await Promise.all([
      // Profile
      adminClient
        .from('user_profiles')
        .select('full_name, email, phone, role, kyc_status')
        .eq('id', userId)
        .single(),

      // Wallet balance
      adminClient
        .from('customer_wallets')
        .select('balance_paise')
        .eq('user_id', userId)
        .maybeSingle(),

      // Recent transactions (last 5)
      adminClient
        .from('customer_wallet_transactions')
        .select('type, amount_paise, description, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),

      // Reward points balance
      adminClient
        .from('reward_points')
        .select('points_balance')
        .eq('user_id', userId)
        .maybeSingle(),

      // Active gift cards — count and total value
      adminClient
        .from('customer_gift_cards')
        .select('value_paise, status')
        .eq('user_id', userId)
        .eq('status', 'active'),

      // Recent orders (last 3)
      adminClient
        .from('customer_orders')
        .select('id, status, total_amount, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3),

      // Referral code
      adminClient
        .from('user_profiles')
        .select('referral_code')
        .eq('id', userId)
        .maybeSingle(),

      // Store credits
      adminClient
        .from('customer_store_credits')
        .select('balance_paise')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

  // --- Profile ---
  const profile = profileRes.data || {};
  const fullName = profile.full_name || 'Customer';
  const firstName = fullName.split(' ')[0] || 'Customer';

  // --- Wallet ---
  const walletBalanceRs = walletRes.data?.balance_paise
    ? walletRes.data.balance_paise / 100
    : 0;

  // --- Transactions ---
  const recentTransactions = (txRes.data || []).map((t) => {
    const amountRs = (t.amount_paise / 100).toFixed(2);
    const date = new Date(t.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
    return `${t.type} ₹${amountRs} on ${date} — ${t.description || 'N/A'}`;
  });

  // --- Reward Points ---
  const rewardPoints = rewardsRes.data?.points_balance ?? null;

  // --- Gift Cards ---
  const giftCards = giftCardsRes.data || [];
  const activeGiftCardCount = giftCards.length;
  const activeGiftCardTotalRs = giftCards.reduce(
    (sum, gc) => sum + (gc.value_paise || 0) / 100,
    0
  );

  // --- Orders ---
  const recentOrders = (ordersRes.data || []).map((o) => {
    const shortId = (o.id || '').slice(-6).toUpperCase();
    const total = o.total_amount ? `₹${Number(o.total_amount).toFixed(2)}` : 'N/A';
    return `Order #${shortId} — ${o.status || 'Unknown'} — ${total}`;
  });

  // --- Referral ---
  const referralCode = referralRes.data?.referral_code || null;

  // --- Store Credits ---
  const storeCreditsRs = storeCreditsRes.data?.balance_paise != null
    ? storeCreditsRes.data.balance_paise / 100
    : null;

  return {
    firstName,
    fullName,
    email: profile.email || '',
    phone: profile.phone || '',
    role: profile.role || 'customer',
    kycStatus: profile.kyc_status || 'Pending',
    walletBalanceRs,
    recentTransactions,
    rewardPoints,
    activeGiftCardCount,
    activeGiftCardTotalRs,
    recentOrders,
    referralCode,
    storeCreditsRs,
  };
}

/**
 * Serializes a UserContext object into a compact bulleted string
 * suitable for inclusion in a system instruction.
 *
 * @param {UserContext} ctx
 * @returns {FormattedUserContext}
 */
export function formatContextForPrompt(ctx) {
  const lines = [
    `- Name: ${ctx.fullName}`,
    `- KYC Status: ${ctx.kycStatus}`,
    `- Wallet Balance: ₹${ctx.walletBalanceRs.toFixed(2)}`,
  ];

  if (ctx.rewardPoints !== null) {
    lines.push(`- Reward Points: ${ctx.rewardPoints}`);
  }

  if (ctx.activeGiftCardCount > 0) {
    lines.push(
      `- Active Gift Cards: ${ctx.activeGiftCardCount} card(s), total value ₹${ctx.activeGiftCardTotalRs.toFixed(2)}`
    );
  } else {
    lines.push('- Active Gift Cards: None');
  }

  if (ctx.storeCreditsRs !== null) {
    lines.push(`- Store Credits: ₹${ctx.storeCreditsRs.toFixed(2)}`);
  }

  if (ctx.referralCode) {
    lines.push(`- Referral Code: ${ctx.referralCode}`);
  }

  if (ctx.recentTransactions.length > 0) {
    lines.push('- Recent Transactions:');
    ctx.recentTransactions.forEach((t) => lines.push(`  • ${t}`));
  } else {
    lines.push('- Recent Transactions: None');
  }

  if (ctx.recentOrders.length > 0) {
    lines.push('- Recent Orders:');
    ctx.recentOrders.forEach((o) => lines.push(`  • ${o}`));
  } else {
    lines.push('- Recent Orders: None');
  }

  return lines.join('\n');
}
