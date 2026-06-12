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
  let timeoutId;

  // 1. Establish default/fallback context
  const context = {
    firstName: 'Customer',
    fullName: 'Customer',
    email: '',
    phone: '',
    role: 'customer',
    kycStatus: 'Pending',
    walletBalanceRs: 0,
    recentTransactions: [],
    rewardPoints: null,
    activeGiftCardCount: 0,
    activeGiftCardTotalRs: 0,
    recentOrders: [],
    referralCode: null,
  };

  // 2. Safe query wrapper to prevent one failure from breaking the whole context
  const safeQuery = (query) => {
    if (query && typeof query.then === 'function') {
      return query.then(res => res).catch(err => {
        console.warn('[buildContext] Query failed:', err.message || err);
        return { data: null, error: err };
      });
    }
    return Promise.resolve(query);
  };

  try {
    const contextPromise = (async () => {
      // Create individual promises that update context in-place when they resolve
      const profilePromise = safeQuery(
        adminClient
          .from('user_profiles')
          .select('full_name, email, phone, role, kyc_status')
          .eq('id', userId)
          .single()
      ).then((res) => {
        if (res?.data) {
          context.fullName = res.data.full_name || 'Customer';
          context.firstName = context.fullName.split(' ')[0] || 'Customer';
          context.email = res.data.email || '';
          context.phone = res.data.phone || '';
          context.role = res.data.role || 'customer';
          context.kycStatus = res.data.kyc_status || 'Pending';
        }
      });

      const walletPromise = safeQuery(
        adminClient
          .from('customer_wallets')
          .select('balance_paise')
          .eq('user_id', userId)
          .maybeSingle()
      ).then((res) => {
        if (res?.data) {
          context.walletBalanceRs = res.data.balance_paise
            ? res.data.balance_paise / 100
            : 0;
        }
      });

      const txPromise = safeQuery(
        adminClient
          .from('customer_wallet_transactions')
          .select('type, amount_paise, description, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)
      ).then((res) => {
        if (res?.data) {
          context.recentTransactions = res.data.map((t) => {
            const amountRs = (t.amount_paise / 100).toFixed(2);
            const date = new Date(t.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
            });
            return `${t.type} ₹${amountRs} on ${date} — ${t.description || 'N/A'}`;
          });
        }
      });

      const rewardsPromise = safeQuery(
        adminClient
          .from('reward_points_balance')
          .select('current_balance')
          .eq('user_id', userId)
          .maybeSingle()
      ).then((res) => {
        if (res?.data) {
          context.rewardPoints = res.data.current_balance ?? null;
        }
      });

      const giftCardsPromise = safeQuery(
        adminClient
          .from('orders')
          .select('amount')
          .eq('user_id', userId)
          .not('giftcard_id', 'is', null)
          .eq('payment_status', 'paid')
      ).then((res) => {
        if (res?.data) {
          const giftCards = res.data;
          context.activeGiftCardCount = giftCards.length;
          context.activeGiftCardTotalRs = giftCards.reduce(
            (sum, gc) => sum + Number(gc.amount || 0) / 100,
            0
          );
        }
      });

      const ordersPromise = safeQuery(
        adminClient
          .from('shopping_order_groups')
          .select('id, status, delivery_status, total_amount_paise, created_at')
          .eq('customer_id', userId)
          .order('created_at', { ascending: false })
          .limit(3)
      ).then((res) => {
        if (res?.data) {
          context.recentOrders = res.data.map((o) => {
            const shortId = (o.id || '').slice(-6).toUpperCase();
            const total = o.total_amount_paise != null ? `₹${(Number(o.total_amount_paise) / 100).toFixed(2)}` : 'N/A';
            const statusString = o.delivery_status || o.status || 'Unknown';
            return `Order #${shortId} — ${statusString} — ${total}`;
          });
        }
      });

      const referralPromise = safeQuery(
        adminClient
          .from('user_profiles')
          .select('referral_code')
          .eq('id', userId)
          .maybeSingle()
      ).then((res) => {
        if (res?.data) {
          context.referralCode = res.data.referral_code || null;
        }
      });

      await Promise.all([
        profilePromise,
        walletPromise,
        txPromise,
        rewardsPromise,
        giftCardsPromise,
        ordersPromise,
        referralPromise
      ]);

      return context;
    })();

    // 3. Set a timeout that resolves with whatever context we have built so far, rather than throwing
    const timeoutPromise = new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn('[buildContext] User context build timed out after 5 seconds, returning partial context.');
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
  } else {
    lines.push('- Reward Points: None');
  }

  if (ctx.activeGiftCardCount > 0) {
    lines.push(
      `- Active Gift Cards: ${ctx.activeGiftCardCount} card(s), total value ₹${ctx.activeGiftCardTotalRs.toFixed(2)}`
    );
  } else {
    lines.push('- Active Gift Cards: None');
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
