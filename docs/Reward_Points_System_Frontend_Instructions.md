# Intrust Rewards — Frontend Developer Handoff
## Reward Points System: UI Copy & Implementation Instructions

**Document Purpose:** This file tells the frontend developer exactly what to show customers about the Reward Points feature — including all copy, numbers, and UI structure — so customers can clearly understand how it works.

**Do not change business logic or numbers** without checking with the backend team first. All values here match the live defaults seeded in `reward_configuration`.

---

## PART A — Customer-Facing Summary (Plain English)

This is the single-sentence summary that should appear near the top of the Rewards page or in any intro tooltip:

> **"Earn points for every action on Intrust — shopping, signing up, completing KYC, logging in daily, and growing your network. Climb tiers for bigger bonuses, then convert points to wallet cash instantly at 1 point = ₹1."**

---

## PART B — The ⓘ Info Button & Modal

### Where to Place the Button

- **Location:** Top-right of the header on `/rewards` page (`app/(customer)/rewards/page.jsx`)
- Place it **next to the existing leaderboard trophy button**
- Use the `Info` or `HelpCircle` icon from `lucide-react` (matches existing icon style)
- Button must have: `aria-label="How rewards work"`

---

### Modal Structure

Render a **tabbed modal** (5 tabs). On mobile (screens < 640px), render as a **bottom-sheet** instead.

**Modal must have:**
- `role="dialog"` and `aria-modal="true"`
- Focus trap while open
- ESC key closes the modal
- Focus returns to the trigger button on close

**Tab list:**
1. Basics
2. Earn
3. Tiers
4. Redeem
5. FAQ

---

## PART C — Tab-by-Tab Copy

---

### TAB 1 — Basics

**Heading:** What are Intrust Reward Points?

**Body text:**
> Intrust Reward Points are loyalty points you collect for using the Intrust ecosystem. They live in your Rewards dashboard and can be converted to wallet cash anytime — **1 point = ₹1**.

**Three things to know (render as a numbered list):**
1. Every point you ever earn is added to your **Total Earned**. Your **Current Balance** is what you can spend right now.
2. Your **tier** (Bronze → Silver → Gold → Platinum) gives you a **bonus multiplier** on every future reward.
3. Points stay active as long as you stay active. After **365 days of no activity**, unused points expire.

**The 30-second version (render as a bullet list with coloured pills):**
- 🟣 **EARN** — Sign up, shop, complete KYC, refer friends, log in daily.
- 🟣 **SCRATCH** — Reveal new rewards on your dashboard for a fun surprise.
- 🟣 **CLIMB** — Build your network to unlock Silver, Gold, and Platinum tiers — each gives a bigger bonus on every reward.
- 🟣 **REDEEM** — Convert any 100+ points to wallet cash at **1 point = ₹1**.

---

### TAB 2 — Earn

**Heading:** How to Earn Points

**Intro text:**
> You earn points automatically — no claiming needed. The ✨ scratch cards on your dashboard reveal each new reward.

**Earning table (render as a styled table):**

| Action | Points You Earn |
|---|---|
| 🎁 Sign up | 100 points when you complete onboarding |
| 🛒 Shop on Intrust | 5 points per ₹100 spent (e.g. ₹1,000 = 50 points) |
| 🪪 Complete KYC | 200 bonus points |
| 📅 Log in daily | 5 points each calendar day, just for showing up |
| 🤝 Refer friends | Earn from your network — see "Network Rewards" below |
| 🏪 Become a merchant | 500 points when merchant onboarding is complete |
| 🔄 Renew subscription | 300 points on each renewal |

---

**Sub-section heading:** Network Rewards (Multi-Level Earning)

**Explanation text:**
> When someone you referred earns rewards, **you get a slice too** — and so does the person who referred you, up to 5 levels deep.

**Network rewards table:**

| Event | Direct (them) | L1 (you) | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|---|
| Sign up | 100 | 50 | 25 | 10 | 5 | 2 |
| KYC complete | 200 | 100 | 50 | 20 | 10 | 5 |
| Merchant onboard | 500 | 250 | 100 | 50 | 25 | 10 |
| Subscription renewal | 300 | 150 | 75 | 30 | 15 | 5 |

**Info callout (render as a highlighted note box):**
> 💡 To earn network rewards, your KYC must be approved. The person earning directly (signup and daily login) does not need KYC themselves.

---

**Sub-section heading:** Daily Earning Limit

**Text:**
> To keep things fair, you can earn **up to 10,000 points per day** across all events combined. Keep doing actions on subsequent days to continue earning.

---

### TAB 3 — Tiers

**Heading:** Tiers & Bonus Multipliers

**Explanation text:**
> Your tier is based on the size of your **referral network**, not your point balance. The bigger your network — and the more of those people complete KYC — the higher your tier.

**Tier table:**

| Tier | Network Size Needed | Active (KYC-done) Referrals | Bonus Multiplier |
|---|---|---|---|
| 🥉 Bronze | 0+ | 0+ | **1.0×** (default) |
| 🥈 Silver | 25+ | 10+ | **1.2×** |
| 🥇 Gold | 100+ | 40+ | **1.5×** |
| 👑 Platinum | 500+ | 200+ | **2.0×** |

---

**Sub-section heading:** What "Bonus Multiplier" Means

**Explanation text:**
> Every time you'd normally earn X points, you actually earn X × your tier multiplier. For example, a 200-point KYC bonus earns:

**Example list:**
- A Bronze user: **200 points**
- A Silver user: 200 × 1.2 = **240 points**
- A Gold user: 200 × 1.5 = **300 points**
- A Platinum user: 200 × 2.0 = **400 points**

---

**Sub-section heading:** Good to Know

**Bullet points:**
- ✅ **You will never be downgraded.** Once you reach Gold, you stay at Gold even if some referrals leave.
- 📊 The progress bar on your dashboard shows your progress toward the next tier — split evenly between **network size** (50%) and **active referrals** (50%).
- 🎉 When you level up, you'll see a **confetti celebration** the next time you open the Rewards page.

---

### TAB 4 — Redeem

**Heading:** Redeeming Your Points

**Intro text:**
> Convert your points to **wallet cash** anytime, then use that cash anywhere on Intrust.

**Rules list:**
- **1 point = ₹1**
- **Minimum 100 points** per conversion
- Conversion is **instant** — your wallet updates immediately

**Step-by-step instructions (numbered):**
1. On the Rewards page, find the **Convert to Wallet** card.
2. Type the number of points you want to convert.
3. Tap **Convert**.
4. Your points decrease, your wallet balance increases by the same rupee amount, and both transactions appear in their respective histories.

**Warning callout (render as a yellow/amber info box):**
> ⚠️ In some cases, your conversion may go into a pending state requiring admin approval. You'll receive a notification when it's processed. This is indicated by a different toast message after you tap Convert.

---

### TAB 5 — FAQ

**Heading:** Frequently Asked Questions

---

**Q. Why don't I see points right after I do something?**
Most rewards land on your dashboard within seconds and appear as a **scratch card**. Tap to scratch and reveal.

---

**Q. My scratch card vanished — did I lose the points?**
No. Scratching is just a fun reveal animation — the points are **already in your Current Balance** the moment they're awarded. Scratched cards simply move into **Recent Activity** below.

---

**Q. I got a reward but my balance didn't change by the full amount. Why?**
Two possible reasons:
1. You hit the **10,000 points/day cap** for that day.
2. The reward was a network-level payout (e.g. Level 4), which has a smaller multiplier than a direct reward.

---

**Q. How do I know my current tier?**
Look at the **tier pill** on the right side of the big balance card on the Rewards page — it shows your tier with an icon (e.g. "★ Gold").

---

**Q. How do I get to the next tier?**
The **"Next Tier" card** on the Rewards page shows exactly how many more network members and active (KYC-done) referrals you need, with a progress bar.

---

**Q. Do my points expire?**
Yes — but only after **365 days of zero activity** on your reward account. Earning *or* redeeming any points resets the clock. We'll send you a **warning notification 30 days before** expiry so you have time to act.

---

**Q. Where can I see my full history?**
Tap **View All** on the Recent Activity card, or go to `/rewards/transactions`. You can filter by event type (signup, purchase, KYC, conversion).

---

**Q. Where can I see my referral network?**
Tap **Refer Friends** at the bottom of the Rewards page, or go to `/refer`.

---

**Q. Can I see how I rank against other users?**
Yes — tap the **🏆 trophy icon** at the top right of the Rewards page to open the Leaderboard (top 50 users by current balance).

---

**Q. Something looks wrong with my balance. What do I do?**
Use the **Contact Support** link at the bottom of this help modal. Every credit and debit is logged with a full audit trail.

---

**Footer of modal:**
> Need more help? → [Contact Support]

---

## PART D — Developer Implementation Checklist

Use this as a task list when building the info modal.

### Component
- [ ] Create `<RewardsInfoModal />` component in `components/ui/` or inline in `app/(customer)/rewards/page.jsx`
- [ ] Use `framer-motion` `<AnimatePresence>` pattern — mirror the existing tier-promotion confetti modal already in the rewards page
- [ ] Open/close via local `useState` (no global state needed)
- [ ] Tabs implemented as plain buttons toggling an `activeTab` state variable

### Trigger Button
- [ ] Add button to the top-right header of `/rewards`, next to the leaderboard trophy button
- [ ] Use `Info` or `HelpCircle` icon from `lucide-react`
- [ ] Add `aria-label="How rewards work"` to the button

### Accessibility
- [ ] Modal has `role="dialog"` and `aria-modal="true"`
- [ ] Focus trap inside the modal while open
- [ ] ESC key closes the modal
- [ ] On close, focus returns to the trigger button

### Mobile
- [ ] On screens narrower than 640px, render the modal content as a **bottom-sheet** (drag-to-dismiss)
- [ ] Tabs become a horizontally scrollable strip on mobile

### Numbers (v1 — Hardcoded OK)

The following values match the live defaults in `reward_configuration`. Hardcode them for v1:

| Config key | Default value | Used in |
|---|---|---|
| `signup_reward` | 100 points | TAB 2 — Earn table |
| `purchase_reward.rate_per_100rs` | 5 points per ₹100 | TAB 2 — Earn table |
| `kyc_complete_reward` | 200 points | TAB 2 — Earn table |
| `daily_login_reward` | 5 points | TAB 2 — Earn table |
| `merchant_onboard_reward` | 500 points | TAB 2 — Earn table |
| `subscription_renewal_reward` | 300 points | TAB 2 — Earn table |
| `daily_cap` | 10,000 points/day | TAB 2 — Daily Limit |
| `tier_silver.min_tree_size` | 25 | TAB 3 — Tier table |
| `tier_silver.min_active_downline` | 10 | TAB 3 — Tier table |
| `tier_gold.min_tree_size` | 100 | TAB 3 — Tier table |
| `tier_gold.min_active_downline` | 40 | TAB 3 — Tier table |
| `tier_platinum.min_tree_size` | 500 | TAB 3 — Tier table |
| `tier_platinum.min_active_downline` | 200 | TAB 3 — Tier table |
| `point_value` (points_per_rupee) | 1 point = ₹1 | TAB 4 — Redeem |
| `min_withdrawal_points` | 100 | TAB 4 — Redeem |
| `point_expiry.expiry_days` | 365 | TAB 5 — FAQ |
| `point_expiry.warn_days_before` | 30 | TAB 5 — FAQ |

> **v2 enhancement:** Fetch these values from `GET /api/rewards/balance` (which already includes the next-tier config) at modal open time so the help text always reflects admin-edited values automatically.

### Reuse Opportunities
The same modal copy is also useful in:
- Empty-state of `/rewards/transactions`
- First-time tooltip shown to new users after signup
- The merchant panel's referral rewards page

---

## PART E — Pages Overview (for Reference)

| Page | What the Customer Sees |
|---|---|
| `/rewards` | Main dashboard: balance card, tier pill, scratch cards, tier progress bar, convert-to-wallet, recent activity |
| `/rewards/transactions` | Full paginated history, filterable by event type |
| `/rewards/leaderboard` | Top 50 users by current balance (podium UI) |
| `/refer` | Referral network / tree visualization |

---

*Document prepared by: Intrust Product Team*
*Last updated: May 2026*
*For questions: contact the backend team before changing any numbers.*
