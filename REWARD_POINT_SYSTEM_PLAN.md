# 🌳 Tree-Type Reward Point System — Implementation Plan

> **Project:** Intrust India Platform  
> **Stack:** Next.js 15 (App Router) + Supabase (PostgreSQL + Auth + Realtime)  
> **Scope:** Dynamic, admin-configurable, multi-level (tree) reward/loyalty system  
> **Status:** Planning Phase — No Code Changes Yet

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current System Analysis](#2-current-system-analysis)
3. [Proposed Architecture](#3-proposed-architecture)
4. [Database Schema Design](#4-database-schema-design)
5. [Tree Structure & Hierarchy Logic](#5-tree-structure--hierarchy-logic)
6. [Dynamic Admin Configuration System](#6-dynamic-admin-configuration-system)
7. [Reward Calculation Engine](#7-reward-calculation-engine)
8. [Frontend Implementation Plan](#8-frontend-implementation-plan)
9. [Backend & API Plan](#9-backend--api-plan)
10. [Security, RLS & Audit](#10-security-rls--audit)
11. [Additional Ideas & Enhancements](#11-additional-ideas--enhancements)
12. [Implementation Phases & Roadmap](#12-implementation-phases--roadmap)

---

## 1. Executive Summary

### What We're Building
A **dynamic, multi-level tree-type reward point system** (similar to MLM/network marketing structures) where:

- Every user has a **referral tree/Downline**
- Rewards flow **up the tree** when downstream users perform actions (signup, purchase, KYC, etc.)
- **Admin can dynamically configure:** point values, levels, percentages, eligibility rules, cap limits, and reward types — all from the admin dashboard without code changes.

### Key Differentiators
| Feature | Description |
|---------|-------------|
| **Tree Visualization** | Interactive tree view showing full downline hierarchy |
| **Dynamic Config** | Admin changes reward rules in real-time via UI |
| **Multiple Reward Triggers** | Signup, Purchase, KYC, Merchant Onboarding, Subscription |
| **Point + Wallet Hybrid** | Points can be converted to wallet cash or redeemed for products |
| **Level-Based Tiers** | Bronze → Silver → Gold → Platinum based on tree size/activity |
| **Real-time Analytics** | Live dashboard for users and admins |

### Reward Triggers (Events That Generate Points)
1. **Direct Referral Signup** — New user joins using referral code
2. **Downline Purchase** — Any user in the tree makes a purchase
3. **KYC Completion** — User completes KYC verification
4. **Merchant Onboarding** — Referred user becomes a merchant
5. **Subscription Renewal** — Merchant renews subscription
6. **Daily Login Streak** — Gamified engagement reward

---

## 2. Current System Analysis

### Existing Infrastructure (Leveraged)

| Component | Current State | How We'll Extend |
|-----------|--------------|------------------|
| `user_profiles` | Has `referral_code`, `referred_by` | Add tree hierarchy fields |
| `customer_wallets` | Balance in paise | Add `reward_points` column or separate table |
| `customer_wallet_transactions` | CREDIT/DEBIT/CASHBACK/TOPUP | Add `REWARD` type |
| `platform_settings` | Key-value config store | Add reward configuration keys |
| `merchant_transactions` | Merchant ledger | Add reward-related transaction types |
| Admin Dashboard | Analytics, wallet adjustments, settings | Add Reward Management section |
| Referral Page | Simple 1-level ₹100 cashback | Extend to multi-level tree view |
| RLS Policies | Row-level security everywhere | Extend for new tables |
| RPC Functions | Secure database procedures | Add reward calculation RPCs |

### Existing Referral Flow (To Be Extended)
```
Current:  User A refers User B → Both get ₹100 (flat, 1-level)

Planned:  User A refers User B → B refers C → C refers D
          ├── A gets points from B (Level 1)
          ├── A gets points from C (Level 2)  
          ├── A gets points from D (Level 3)
          └── B gets points from C (Level 1)
              └── B gets points from D (Level 2)
```

---

## 3. Proposed Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ADMIN DASHBOARD                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Reward Rules │  │ Point Values │  │ Tree Analytics & Reports │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    reward_configuration (DB Table)                   │
│  ┌────────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Level Settings │  │ Event Rules │  │ Global Caps & Limits    │  │
│  │ (L1=10%,L2=5%) │  │ (purchase=  │  │ (max_points_per_day,    │  │
│  │                │  │  5pts/₹100) │  │  min_withdrawal)        │  │
│  └────────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EVENT TRIGGERS (Supabase)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Signup  │  │ Purchase │  │ KYC Done │  │ Subscription etc │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              REWARD CALCULATION ENGINE (RPC/Edge Function)           │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ Traverse Tree  │  │ Calculate Points │  │ Apply Caps/Rules   │  │
│  │ (find ancestors│  │ per level & event │  │ (daily limit,      │  │
│  │  up to N lvls) │  │                  │  │  eligibility)      │  │
│  └────────────────┘  └──────────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         USER REWARD LEDGER                           │
│  ┌─────────────────────┐  ┌───────────────────────────────────────┐ │
│  │ reward_points_balance│  │ reward_transactions (audit trail)     │ │
│  │ (current_points)     │  │ (type, amount, source_user, level)    │ │
│  └─────────────────────┘  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER FRONTEND                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Tree View    │  │ Points Dash  │  │ Redemption / Convert to  │  │
│  │ (interactive)│  │ (stats)      │  │ Wallet                   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema Design

### 4.1 New Tables

#### `reward_configuration` — Dynamic Admin Settings
```sql
CREATE TABLE public.reward_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,        -- e.g., 'level_1_percentage'
    config_value JSONB NOT NULL,            -- flexible JSON value
    config_type TEXT NOT NULL DEFAULT 'global', -- 'global', 'event', 'level', 'tier'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    effective_from TIMESTAMPTZ DEFAULT now(),
    effective_until TIMESTAMPTZ,            -- NULL = indefinite
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Example rows:
-- ('level_settings', '{"L1": 10, "L2": 5, "L3": 3, "L4": 2, "L5": 1}', 'level', 'Percentage per tree level', true, ...)
-- ('signup_reward', '{"direct": 100, "L1": 50, "L2": 25}', 'event', 'Points on new signup', true, ...)
-- ('purchase_reward', '{"rate_per_100rs": 5, "L1": 50, "L2": 25, "L3": 10}', 'event', 'Points on purchase', true, ...)
-- ('daily_cap', '{"max_points": 1000, "max_transactions": 50}', 'global', 'Daily earning limits', true, ...)
-- ('tier_bronze', '{"min_tree_size": 5, "min_active_referrals": 2, "bonus_multiplier": 1.0}', 'tier', ...)
-- ('tier_silver', '{"min_tree_size": 25, "min_active_referrals": 10, "bonus_multiplier": 1.2}', 'tier', ...)
-- ('tier_gold', '{"min_tree_size": 100, "min_active_referrals": 40, "bonus_multiplier": 1.5}', 'tier', ...)
-- ('tier_platinum', '{"min_tree_size": 500, "min_active_referrals": 200, "bonus_multiplier": 2.0}', 'tier', ...)
-- ('point_value', '{"points_per_rupee": 1, "min_withdrawal_points": 100}', 'global', 'Point to rupee conversion', true, ...)
-- ('eligibility', '{"min_kyc_status": "verified", "account_age_days": 7}', 'global', 'Minimum requirements', true, ...)
```

#### `reward_points_balance` — Per-User Point Balance
```sql
CREATE TABLE public.reward_points_balance (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_earned BIGINT NOT NULL DEFAULT 0,      -- Lifetime points earned
    total_redeemed BIGINT NOT NULL DEFAULT 0,    -- Points converted to wallet/spent
    current_balance BIGINT NOT NULL DEFAULT 0,    -- Available points
    tier TEXT NOT NULL DEFAULT 'bronze',          -- bronze, silver, gold, platinum
    tree_size INTEGER NOT NULL DEFAULT 0,         -- Total downline count
    direct_referrals INTEGER NOT NULL DEFAULT 0,  -- Level 1 count
    active_downline INTEGER NOT NULL DEFAULT 0,   -- Downline with KYC + activity
    last_calculated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT non_negative_balance CHECK (current_balance >= 0),
    CONSTRAINT non_negative_earned CHECK (total_earned >= 0)
);

CREATE INDEX idx_reward_points_tier ON public.reward_points_balance(tier);
CREATE INDEX idx_reward_points_tree_size ON public.reward_points_balance(tree_size);
```

#### `reward_transactions` — Immutable Audit Trail
```sql
CREATE TYPE reward_event_type AS ENUM (
    'signup', 'purchase', 'kyc_complete', 'merchant_onboard',
    'subscription_renewal', 'daily_login', 'tier_upgrade',
    'manual_credit', 'manual_debit', 'wallet_conversion', 'expiry'
);

CREATE TABLE public.reward_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),        -- Who receives points
    source_user_id UUID REFERENCES auth.users(id),          -- Who triggered the event
    event_type reward_event_type NOT NULL,
    points BIGINT NOT NULL,                                 -- Positive = credit, Negative = debit
    points_before BIGINT NOT NULL,
    points_after BIGINT NOT NULL,
    level INTEGER,                                          -- Tree level (1=direct, 2=indirect, etc.)
    reference_id UUID,                                      -- Related order ID, signup ID, etc.
    reference_type TEXT,                                    -- 'shopping_order', 'user_profile', etc.
    metadata JSONB,                                         -- Event details
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT valid_points CHECK (points != 0)
);

CREATE INDEX idx_reward_txn_user_created ON public.reward_transactions(user_id, created_at DESC);
CREATE INDEX idx_reward_txn_source ON public.reward_transactions(source_user_id);
CREATE INDEX idx_reward_txn_event ON public.reward_transactions(event_type);
CREATE INDEX idx_reward_txn_reference ON public.reward_transactions(reference_id);
```

#### `reward_tree_paths` — Materialized Path for Fast Tree Queries
```sql
CREATE TABLE public.reward_tree_paths (
    ancestor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    descendant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level > 0),  -- 1 = direct child, 2 = grandchild, etc.
    created_at TIMESTAMPTZ DEFAULT now(),

    PRIMARY KEY (ancestor_id, descendant_id),
    CONSTRAINT no_self_reference CHECK (ancestor_id != descendant_id)
);

CREATE INDEX idx_tree_paths_ancestor ON public.reward_tree_paths(ancestor_id, level);
CREATE INDEX idx_tree_paths_descendant ON public.reward_tree_paths(descendant_id);
```

> **Why materialized paths?** PostgreSQL recursive CTEs work but are slow at scale. Materialized paths enable O(1) tree lookups — critical for real-time reward calculations.

#### `reward_daily_caps` — Daily Limit Tracking
```sql
CREATE TABLE public.reward_daily_caps (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cap_date DATE NOT NULL DEFAULT CURRENT_DATE,
    points_earned_today BIGINT NOT NULL DEFAULT 0,
    transactions_today INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT now(),

    PRIMARY KEY (user_id, cap_date)
);
```

#### `reward_redemption_requests` — Point to Wallet Conversion
```sql
CREATE TYPE redemption_status AS ENUM ('pending', 'approved', 'rejected', 'completed');

CREATE TABLE public.reward_redemption_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    points_requested BIGINT NOT NULL CHECK (points_requested > 0),
    rupee_value_paise BIGINT NOT NULL,          -- Calculated at request time
    status redemption_status DEFAULT 'pending',
    processed_by UUID REFERENCES auth.users(id), -- Admin who approved
    processed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 Modified Tables

#### `user_profiles` — Add Tree & Reward Fields
```sql
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS reward_parent_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS tree_depth INTEGER DEFAULT 0,  -- Depth in the global tree
ADD COLUMN IF NOT EXISTS reward_tier TEXT DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS total_reward_points_earned BIGINT DEFAULT 0;

CREATE INDEX idx_user_profiles_reward_parent ON public.user_profiles(reward_parent_id);
```

> Note: `referred_by` already exists for simple referral tracking. `reward_parent_id` can initially mirror `referred_by` but provides separation if you later support "placement" (where a user can choose where in their tree a new signup goes — common in MLM).

#### `customer_wallet_transactions` — Add REWARD Type
```sql
-- The existing ENUM for type may need extension or use TEXT with CHECK
-- Current types: CREDIT, DEBIT, CASHBACK, TOPUP
-- Add: REWARD (when points convert to wallet)
```

---

## 5. Tree Structure & Hierarchy Logic

### 5.1 Tree Building Strategy

**Approach: Materialized Path Pattern (Closure Table)**

When a new user signs up with a referral code:

```sql
-- 1. Find the referrer (parent)
SELECT id INTO v_parent_id FROM user_profiles WHERE referral_code = p_referral_code;

-- 2. Insert the user (existing trigger)
-- 3. Build tree paths
INSERT INTO reward_tree_paths (ancestor_id, descendant_id, level)
SELECT ancestor_id, p_new_user_id, level + 1
FROM reward_tree_paths
WHERE descendant_id = v_parent_id
UNION ALL
SELECT v_parent_id, p_new_user_id, 1;
```

**Example:**
```
Users: A → B → C → D

reward_tree_paths table:
┌─────────────┬────────────────┬───────┐
│ ancestor_id │ descendant_id  │ level │
├─────────────┼────────────────┼───────┤
│ A           │ B              │ 1     │
│ A           │ C              │ 2     │
│ A           │ D              │ 3     │
│ B           │ C              │ 1     │
│ B           │ D              │ 2     │
│ C           │ D              │ 1     │
└─────────────┴────────────────┴───────┘
```

**Query user's entire downline:**
```sql
SELECT descendant_id, level 
FROM reward_tree_paths 
WHERE ancestor_id = :user_id 
ORDER BY level, created_at;
```

**Query user's upline (for reward distribution):**
```sql
SELECT ancestor_id, level 
FROM reward_tree_paths 
WHERE descendant_id = :user_id 
ORDER BY level;
```

### 5.2 Tree Visualization Data Structure

For the frontend tree component, query returns:
```json
{
  "user_id": "uuid",
  "full_name": "John Doe",
  "avatar_url": "...",
  "tier": "silver",
  "tree_size": 42,
  "children": [
    {
      "user_id": "uuid",
      "full_name": "Jane Smith",
      "tier": "bronze",
      "tree_size": 15,
      "children": [...]
    }
  ]
}
```

> For large trees, use **lazy loading** — fetch 2 levels at a time, expand on click.

### 5.3 Alternative: Binary/Forced Matrix (Optional Future)

If you want a forced matrix (e.g., 2x2, 3x7), add a `position` column:
```sql
ALTER TABLE reward_tree_paths ADD COLUMN position INTEGER; -- 1, 2, 3... for matrix slots
```

---

## 6. Dynamic Admin Configuration System

### 6.1 Admin Dashboard — Reward Settings Page

**Route:** `/admin/rewards/settings`

**Sections:**

#### Level Commission Matrix
```
┌─────────┬─────────────┬─────────────────┬──────────────┐
│ Level   │ Percentage  │ Fixed Points    │ Active       │
├─────────┼─────────────┼─────────────────┼──────────────┤
│ Level 1 │     10%     │     100 pts     │    [✓]       │
│ Level 2 │      5%     │      50 pts     │    [✓]       │
│ Level 3 │      3%     │      25 pts     │    [✓]       │
│ Level 4 │      2%     │      10 pts     │    [✓]       │
│ Level 5 │      1%     │       5 pts     │    [✓]       │
│ Level 6 │      0%     │       0 pts     │    [ ]       │
│ Level 7+│      0%     │       0 pts     │    [ ]       │
└─────────┴─────────────┴─────────────────┴──────────────┘
```

#### Event-Based Rewards
```
┌──────────────────────┬───────────────┬─────────────┬─────────────┐
│ Event                │ Direct (L0)   │ L1          │ L2          │
├──────────────────────┼───────────────┼─────────────┼─────────────┤
│ New Signup           │ 100 pts       │ 50 pts      │ 25 pts      │
│ Purchase (per ₹100)  │ 5 pts         │ 2 pts       │ 1 pt        │
│ KYC Complete         │ 200 pts       │ 100 pts     │ 50 pts      │
│ Merchant Onboard     │ 500 pts       │ 250 pts     │ 100 pts     │
│ Subscription Renewal │ 300 pts       │ 150 pts     │ 75 pts      │
│ Daily Login          │ 5 pts         │ 0 pts       │ 0 pts       │
└──────────────────────┴───────────────┴─────────────┴─────────────┘
```

#### Tier Configuration
```
┌───────────┬─────────────┬────────────────────┬──────────────────┐
│ Tier      │ Min Tree    │ Min Active Refs    │ Bonus Multiplier │
├───────────┼─────────────┼────────────────────┼──────────────────┤
│ Bronze    │ 0           │ 0                  │ 1.0x             │
│ Silver    │ 25          │ 10                 │ 1.2x             │
│ Gold      │ 100         │ 40                 │ 1.5x             │
│ Platinum  │ 500         │ 200                │ 2.0x             │
└───────────┴─────────────┴────────────────────┴──────────────────┘
```

#### Global Caps & Limits
- **Daily Point Cap:** Max points a user can earn per day
- **Transaction Cap:** Max reward transactions per day
- **Minimum Withdrawal:** Min points to convert to wallet
- **Point Value:** How many points = ₹1
- **Expiry Days:** Points expire after N days (0 = never)
- **Eligibility:** Require KYC? Min account age?

### 6.2 Configuration Change History

Add `reward_configuration_history` table to track admin changes:
```sql
CREATE TABLE public.reward_configuration_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT now()
);
```

### 6.3 A/B Testing Support (Future)
```sql
-- Add to reward_configuration:
-- experiment_id TEXT (for running multiple reward schemes simultaneously)
-- user_segment TEXT (e.g., 'control', 'variant_a')
```

---

## 7. Reward Calculation Engine

### 7.1 Trigger-Based Flow

```
Event Occurs (Signup / Purchase / KYC)
    │
    ▼
┌─────────────────────┐
│  Supabase Trigger   │  → ON INSERT to relevant table
│  OR Webhook/RPC     │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Fetch Config       │  → Get active reward_configuration
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Get Upline         │  → SELECT ancestors from reward_tree_paths
│  (up to max level)  │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Check Eligibility  │  → KYC status? Account age? Active status?
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Calculate Points   │  → Apply percentages, fixed points, tier multipliers
│  per ancestor       │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Check Daily Caps   │  → Skip if user hit daily limit
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Distribute Points  │  → INSERT into reward_transactions
│  (Atomic)           │  → UPDATE reward_points_balance
└─────────────────────┘
```

### 7.2 RPC Function: `calculate_and_distribute_rewards`

```sql
CREATE OR REPLACE FUNCTION public.calculate_and_distribute_rewards(
    p_event_type TEXT,        -- 'signup', 'purchase', 'kyc_complete', etc.
    p_source_user_id UUID,    -- Who triggered the event
    p_reference_id UUID,      -- Order ID, user ID, etc.
    p_reference_type TEXT,    -- 'shopping_order', 'user_profile', etc.
    p_amount_paise BIGINT DEFAULT 0  -- For purchase-based calculations
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config JSONB;
    v_ancestor RECORD;
    v_points BIGINT;
    v_tier_multiplier NUMERIC;
    v_daily_cap BIGINT;
    v_earned_today BIGINT;
    v_balance_record RECORD;
BEGIN
    -- 1. Fetch active configuration
    SELECT config_value INTO v_config
    FROM reward_configuration
    WHERE config_key = p_event_type || '_reward' AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active config for this event');
    END IF;

    -- 2. Get all ancestors (upline)
    FOR v_ancestor IN
        SELECT ancestor_id, level 
        FROM reward_tree_paths
        WHERE descendant_id = p_source_user_id
        ORDER BY level
    LOOP
        -- 3. Check if this level is configured
        IF v_config->>('L' || v_ancestor.level) IS NULL THEN
            CONTINUE;
        END IF;

        -- 4. Calculate base points
        v_points := (v_config->>('L' || v_ancestor.level))::BIGINT;
        
        -- For purchase events, calculate percentage
        IF p_event_type = 'purchase' AND p_amount_paise > 0 THEN
            v_points := (p_amount_paise * (v_points::NUMERIC) / 100);
        END IF;

        -- 5. Apply tier multiplier
        SELECT tier INTO v_balance_record FROM reward_points_balance WHERE user_id = v_ancestor.ancestor_id;
        SELECT (config_value->>'bonus_multiplier')::NUMERIC INTO v_tier_multiplier
        FROM reward_configuration WHERE config_key = 'tier_' || COALESCE(v_balance_record.tier, 'bronze');
        
        v_points := ROUND(v_points * COALESCE(v_tier_multiplier, 1));

        -- 6. Check daily cap
        SELECT points_earned_today INTO v_earned_today
        FROM reward_daily_caps
        WHERE user_id = v_ancestor.ancestor_id AND cap_date = CURRENT_DATE;
        
        SELECT (config_value->>'max_points')::BIGINT INTO v_daily_cap
        FROM reward_configuration WHERE config_key = 'daily_cap';

        IF COALESCE(v_earned_today, 0) + v_points > COALESCE(v_daily_cap, 999999999) THEN
            v_points := COALESCE(v_daily_cap, 999999999) - COALESCE(v_earned_today, 0);
        END IF;

        IF v_points <= 0 THEN CONTINUE; END IF;

        -- 7. Insert transaction and update balance
        INSERT INTO reward_transactions (
            user_id, source_user_id, event_type, points, points_before, points_after,
            level, reference_id, reference_type
        )
        SELECT 
            v_ancestor.ancestor_id, p_source_user_id, p_event_type::reward_event_type,
            v_points, current_balance, current_balance + v_points,
            v_ancestor.level, p_reference_id, p_reference_type
        FROM reward_points_balance WHERE user_id = v_ancestor.ancestor_id;

        UPDATE reward_points_balance
        SET current_balance = current_balance + v_points,
            total_earned = total_earned + v_points,
            updated_at = now()
        WHERE user_id = v_ancestor.ancestor_id;

        -- 8. Update daily cap tracking
        INSERT INTO reward_daily_caps (user_id, cap_date, points_earned_today, transactions_today)
        VALUES (v_ancestor.ancestor_id, CURRENT_DATE, v_points, 1)
        ON CONFLICT (user_id, cap_date)
        DO UPDATE SET 
            points_earned_today = reward_daily_caps.points_earned_today + v_points,
            transactions_today = reward_daily_caps.transactions_today + 1,
            last_updated = now();
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Rewards distributed');
END;
$$;
```

### 7.3 RPC Function: `convert_points_to_wallet`

```sql
CREATE OR REPLACE FUNCTION public.convert_points_to_wallet(
    p_user_id UUID,
    p_points BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_point_value NUMERIC;
    v_rupee_paise BIGINT;
    v_current_points BIGINT;
    v_min_withdrawal BIGINT;
BEGIN
    -- Check min withdrawal
    SELECT (config_value->>'min_withdrawal_points')::BIGINT INTO v_min_withdrawal
    FROM reward_configuration WHERE config_key = 'point_value';
    
    IF p_points < COALESCE(v_min_withdrawal, 100) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Below minimum withdrawal');
    END IF;

    -- Get current balance
    SELECT current_balance INTO v_current_points FROM reward_points_balance WHERE user_id = p_user_id;
    IF v_current_points < p_points THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient points');
    END IF;

    -- Calculate rupee value
    SELECT (config_value->>'points_per_rupee')::NUMERIC INTO v_point_value
    FROM reward_configuration WHERE config_key = 'point_value';
    
    v_rupee_paise := ROUND((p_points::NUMERIC / COALESCE(v_point_value, 1)) * 100);

    -- Deduct points
    UPDATE reward_points_balance
    SET current_balance = current_balance - p_points,
        total_redeemed = total_redeemed + p_points,
        updated_at = now()
    WHERE user_id = p_user_id;

    -- Log reward transaction (debit)
    INSERT INTO reward_transactions (
        user_id, event_type, points, points_before, points_after,
        description, metadata
    )
    VALUES (
        p_user_id, 'wallet_conversion', -p_points,
        v_current_points, v_current_points - p_points,
        'Converted ' || p_points || ' points to wallet',
        jsonb_build_object('rupee_paise', v_rupee_paise)
    );

    -- Credit wallet (reuse existing wallet adjustment logic or insert directly)
    UPDATE customer_wallets SET balance_paise = balance_paise + v_rupee_paise WHERE user_id = p_user_id;
    
    INSERT INTO customer_wallet_transactions (
        user_id, type, amount_paise, description
    )
    VALUES (
        p_user_id, 'CREDIT', v_rupee_paise,
        'Reward points conversion: ' || p_points || ' points'
    );

    RETURN jsonb_build_object('success', true, 'rupee_paise', v_rupee_paise);
END;
$$;
```

---

## 8. Frontend Implementation Plan

### 8.1 Customer Pages

#### `/rewards` — Main Rewards Dashboard
**Components:**
- **Stats Cards:** Current Points, Total Earned, Total Redeemed, Tree Size, Tier Badge
- **Tier Progress:** Visual progress bar toward next tier (Silver → Gold → Platinum)
- **Recent Activity:** List of recent reward transactions
- **Quick Actions:** Convert to Wallet, View Tree, Invite Friend

#### `/rewards/tree` — Interactive Downline Tree
**Components:**
- **Tree Visualization:** Collapsible tree using D3.js or react-d3-tree
- **Node Cards:** Avatar, name, tier badge, tree size, status indicator
- **Zoom/Pan:** For large trees
- **Search:** Find users in the tree
- **Lazy Loading:** Load children on expand
- **Level Coloring:** Different colors per tree level

#### `/rewards/transactions` — Transaction History
**Components:**
- **Filterable Table:** By event type, date range, level
- **Export:** CSV/PDF download
- **Pagination:** Server-side pagination

#### `/rewards/redeem` — Point Redemption
**Components:**
- **Point Balance Display**
- **Conversion Calculator:** Points → ₹ (live calculation)
- **Minimum Withdrawal Warning**
- **Redemption Request Form**
- **Redemption History**

#### `/refer` — Enhanced Referral Page (Existing)
**Extensions:**
- Add tree preview (my direct children count)
- Show estimated earnings potential
- Enhanced share messages with tier info

### 8.2 Admin Pages

#### `/admin/rewards` — Rewards Admin Hub
**Sub-pages:**

**`/admin/rewards/settings`**
- Level commission matrix editor
- Event reward configuration
- Tier configuration
- Global caps & limits
- Point value settings
- Configuration history log

**`/admin/rewards/analytics`**
- Platform-wide points issued/redeemed
- Top earners leaderboard
- Tree growth statistics
- Tier distribution pie chart
- Revenue impact analysis
- Conversion rates

**`/admin/rewards/audit`**
- All reward transactions (filterable)
- Suspicious activity detection
- Bulk transaction export
- Manual credit/debit tools

**`/admin/rewards/users`**
- User search with tree size, tier
- Manual tier adjustment
- Manual point adjustment (with reason)
- View individual user's tree

**`/admin/rewards/redemptions`**
- Pending redemption requests queue
- Approve/Reject with one click
- Bulk approval
- Redemption statistics

### 8.3 Shared Components

```
components/
├── rewards/
│   ├── RewardStatsCard.jsx
│   ├── TierBadge.jsx
│   ├── TierProgressBar.jsx
│   ├── TreeNode.jsx
│   ├── TreeVisualization.jsx
│   ├── TransactionRow.jsx
│   ├── TransactionFilter.jsx
│   ├── PointConverter.jsx
│   ├── RedemptionForm.jsx
│   ├── RewardConfigEditor.jsx
│   ├── LevelMatrixEditor.jsx
│   ├── EventRewardEditor.jsx
│   └── AnalyticsChart.jsx
```

---

## 9. Backend & API Plan

### 9.1 API Routes

```
app/api/
├── rewards/
│   ├── config/
│   │   ├── route.js           # GET/POST reward configuration (admin only)
│   │   └── [key]/route.js     # PATCH/DELETE specific config
│   ├── tree/
│   │   └── route.js           # GET user's tree data
│   ├── transactions/
│   │   └── route.js           # GET user's transactions (paginated)
│   ├── redeem/
│   │   └── route.js           # POST redemption request
│   ├── convert/
│   │   └── route.js           # POST convert points to wallet
│   └── admin/
│       ├── audit/
│       │   └── route.js       # GET all transactions (admin)
│       ├── users/
│       │   └── route.js       # GET user list with reward data
│       ├── adjust/
│       │   └── route.js       # POST manual point adjustment
│       ├── redemptions/
│       │   └── route.js       # GET/POST redemption management
│       └── analytics/
│           └── route.js       # GET platform analytics
```

### 9.2 Server Actions (App Router Pattern)

```javascript
// app/actions/rewards.js
'use server';

export async function getUserRewardData(userId) { ... }
export async function getUserTree(userId, depth = 2) { ... }
export async function requestRedemption(userId, points) { ... }
export async function getRewardConfiguration() { ... }
export async function updateRewardConfiguration(adminId, updates) { ... }
```

### 9.3 Realtime Subscriptions

```javascript
// Subscribe to user's reward balance changes
supabase
  .channel('reward_balance')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'reward_points_balance', filter: `user_id=eq.${userId}` },
    (payload) => { /* Update UI */ }
  )
  .subscribe();

// Subscribe to new transactions
supabase
  .channel('reward_transactions')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'reward_transactions', filter: `user_id=eq.${userId}` },
    (payload) => { /* Add to list */ }
  )
  .subscribe();
```

---

## 10. Security, RLS & Audit

### 10.1 Row Level Security Policies

```sql
-- reward_configuration
CREATE POLICY "Admins can manage reward config"
    ON reward_configuration FOR ALL
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Anyone can view active reward config"
    ON reward_configuration FOR SELECT
    USING (is_active = true);

-- reward_points_balance
CREATE POLICY "Users can view own balance"
    ON reward_points_balance FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all balances"
    ON reward_points_balance FOR SELECT
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- reward_transactions
CREATE POLICY "Users can view own transactions"
    ON reward_transactions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions"
    ON reward_transactions FOR SELECT
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Service role can insert transactions"
    ON reward_transactions FOR INSERT WITH CHECK (true);

-- reward_tree_paths
CREATE POLICY "Users can view own tree paths"
    ON reward_tree_paths FOR SELECT
    USING (ancestor_id = auth.uid() OR descendant_id = auth.uid());

CREATE POLICY "Admins can view all tree paths"
    ON reward_tree_paths FOR SELECT
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- reward_redemption_requests
CREATE POLICY "Users can manage own requests"
    ON reward_redemption_requests FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all requests"
    ON reward_redemption_requests FOR ALL
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
```

### 10.2 Rate Limiting

- **Redemption Requests:** Max 3 per day per user
- **Tree API:** Max 60 requests/minute per user
- **Config Changes:** Admin-only, logged with IP

### 10.3 Fraud Detection

```sql
-- Flag suspicious patterns:
-- 1. Circular referrals (A refers B, B refers A)
-- 2. Self-referral via multiple accounts
-- 3. Unusual point accumulation velocity
-- 4. Multiple accounts from same IP/device

CREATE TABLE public.reward_fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    details JSONB,
    status TEXT DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'false_positive'
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 10.4 Admin Permissions

Add to `admin_permissions` table:
- `manage_reward_config`
- `view_reward_analytics`
- `adjust_user_points`
- `approve_redemptions`
- `view_fraud_alerts`

---

## 11. Additional Ideas & Enhancements

### 11.1 Gamification Features

| Feature | Description |
|---------|-------------|
| **Daily Streaks** | Login daily for increasing point bonuses (Day 1: 5pts, Day 7: 50pts) |
| **Missions/Quests** | "Complete KYC + Make 1st Purchase = 500 bonus points" |
| **Leaderboards** | Weekly/Monthly top earners with badges |
| **Achievement Badges** | "First Referral", "100 Tree Members", "Super Networker" |
| **Spin Wheel** | Daily free spin for random points (engagement hook) |
| **Lucky Draw** | Pool points for weekly raffle prizes |

### 11.2 Merchant Reward Program

Extend the same tree system to **merchants:**
- Merchants earn points when their referred merchants make sales
- Merchant points convert to reduced platform commission
- Merchant tier system: "Preferred Partner", "Platinum Partner"

### 11.3 Product-Specific Rewards

```sql
-- shopping_products ADD COLUMN:
-- reward_multiplier NUMERIC DEFAULT 1.0
-- reward_points_override BIGINT (NULL = use default calculation)
```

Some products can give 2x or 3x reward points as promotional campaigns.

### 11.4 Time-Limited Promotions

```sql
-- reward_promotions table:
CREATE TABLE public.reward_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL,
    multiplier NUMERIC NOT NULL DEFAULT 1,
    fixed_bonus BIGINT DEFAULT 0,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

Examples:
- "Diwali Special: 2x points on all purchases, Nov 1-15"
- "New Year Blast: Flat 500 bonus on every referral, Dec 25-31"

### 11.5 Rank/Pool System (Advanced MLM)

Beyond simple levels, implement **rank-based bonuses:**

| Rank | Requirement | Pool Bonus |
|------|-------------|------------|
| Star | 5 Direct + 25 Total | 1% of company weekly revenue |
| Diamond | 20 Direct + 200 Total | 3% of company weekly revenue |
| Crown | 50 Direct + 1000 Total | 5% of company weekly revenue |

Create a **reward_pool_distribution** table that tracks weekly pool allocation.

### 11.6 Multi-Currency / International

If expanding beyond India:
- `reward_configuration` per `country_code`
- Currency conversion in `point_value` config

### 11.7 NFT/Blockchain Badge (Future)

- Tier achievements as on-chain NFTs
- Verifiable credentials for top performers

### 11.8 Social Sharing Incentives

- Share on WhatsApp/Twitter = bonus points
- Referral link click tracking (even if no signup)

### 11.9 Auto-Investment Option

- Convert points to wallet automatically when threshold reached
- Or auto-invest points into platform products/store credit

### 11.10 Team/Group Challenges

- "Your team vs other teams" — collective point targets
- Winners get exclusive bonuses

---

## 12. Implementation Phases & Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Create database migration script (all new tables)
- [ ] Set up RLS policies
- [ ] Build `reward_configuration` admin CRUD
- [ ] Create basic `reward_points_balance` table
- [ ] Seed default configurations

### Phase 2: Core Engine (Week 3-4)
- [ ] Implement `reward_tree_paths` materialized path logic
- [ ] Build reward calculation RPC function
- [ ] Integrate with existing signup trigger
- [ ] Integrate with purchase/checkout flow
- [ ] Add `convert_points_to_wallet` RPC
- [ ] Test with sample data

### Phase 3: Customer UI (Week 5-6)
- [ ] Build `/rewards` dashboard page
- [ ] Build `/rewards/tree` visualization
- [ ] Build `/rewards/transactions` history
- [ ] Build `/rewards/redeem` page
- [ ] Enhance existing `/refer` page
- [ ] Real-time subscription integration

### Phase 4: Admin Panel (Week 7)
- [ ] Build `/admin/rewards/settings`
- [ ] Build `/admin/rewards/analytics`
- [ ] Build `/admin/rewards/audit`
- [ ] Build `/admin/rewards/redemptions`
- [ ] Admin permission integration

### Phase 5: Polish & Launch (Week 8)
- [ ] Fraud detection alerts
- [ ] Performance optimization (indexes, query tuning)
- [ ] Comprehensive testing (unit, integration, load)
- [ ] Documentation for support team
- [ ] Soft launch with beta users
- [ ] Monitor and iterate

### Phase 6: Advanced Features (Post-Launch)
- [ ] Gamification (streaks, missions, leaderboards)
- [ ] Time-limited promotions
- [ ] Rank/Pool system
- [ ] Merchant reward extension
- [ ] A/B testing framework
- [ ] Mobile app integration

---

## Appendix A: Sample Migration Script Outline

```sql
-- ============================================
-- REWARD POINT SYSTEM MIGRATION
-- ============================================

-- 1. Create ENUMs
-- 2. Create reward_configuration table
-- 3. Create reward_points_balance table
-- 4. Create reward_transactions table
-- 5. Create reward_tree_paths table
-- 6. Create reward_daily_caps table
-- 7. Create reward_redemption_requests table
-- 8. Create reward_configuration_history table
-- 9. Create reward_fraud_alerts table
-- 10. Modify user_profiles table
-- 11. Seed default configurations
-- 12. Build tree paths for existing users
-- 13. Enable RLS
-- 14. Create policies
-- 15. Create indexes
-- 16. Create RPC functions
-- 17. Create triggers
-- 18. Grant permissions
```

## Appendix B: Configuration JSON Examples

```json
{
  "level_settings": {
    "max_levels": 7,
    "levels": {
      "L1": { "percentage": 10, "fixed": 100 },
      "L2": { "percentage": 5, "fixed": 50 },
      "L3": { "percentage": 3, "fixed": 25 },
      "L4": { "percentage": 2, "fixed": 15 },
      "L5": { "percentage": 1, "fixed": 10 },
      "L6": { "percentage": 0, "fixed": 5 },
      "L7": { "percentage": 0, "fixed": 2 }
    }
  },
  "event_rewards": {
    "signup": { "direct": 100, "L1": 50, "L2": 25, "L3": 10 },
    "purchase": { "rate_per_100rs": 5, "L1": 50, "L2": 25, "L3": 10 },
    "kyc_complete": { "direct": 200, "L1": 100, "L2": 50, "L3": 20 },
    "merchant_onboard": { "direct": 500, "L1": 250, "L2": 100, "L3": 50 }
  },
  "tiers": {
    "bronze": { "min_tree": 0, "min_active": 0, "multiplier": 1.0 },
    "silver": { "min_tree": 25, "min_active": 10, "multiplier": 1.2 },
    "gold": { "min_tree": 100, "min_active": 40, "multiplier": 1.5 },
    "platinum": { "min_tree": 500, "min_active": 200, "multiplier": 2.0 }
  },
  "global_limits": {
    "daily_max_points": 10000,
    "daily_max_transactions": 100,
    "min_withdrawal_points": 100,
    "points_per_rupee": 1,
    "point_expiry_days": 365
  },
  "eligibility": {
    "require_kyc": true,
    "min_account_age_days": 7,
    "min_direct_referrals_for_earnings": 0
  }
}
```

## Appendix C: Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tree storage | Materialized Path (Closure Table) | O(1) lookups, scales to 100k+ users |
| Config storage | JSONB key-value | Flexible, admin-editable, no migrations needed for rule changes |
| Point type | BIGINT (integer points) | No floating-point precision issues |
| Balance storage | Separate table | Easier RLS, better performance than column on user_profiles |
| Transaction log | Immutable insert-only | Audit compliance, dispute resolution |
| Conversion | Manual request (not auto) | Gives users control, reduces support tickets |
| Tier calculation | Batch job (not real-time) | Tree size queries are expensive; nightly recalculation is fine |

---

> **Next Step:** Review this plan, provide feedback, and switch to ACT MODE for implementation when ready.
